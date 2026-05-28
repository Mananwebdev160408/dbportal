import Docker from "dockerode";

export interface DockerContainerInfo {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  health: "healthy" | "unhealthy" | "starting" | "none";
  ports: string[];
}

export interface ContainerStats {
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
}

export class DockerService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch {
      return false;
    }
  }

  async listContainers(): Promise<DockerContainerInfo[]> {
    const containers = await this.docker.listContainers({ all: true });
    return containers.map((c) => {
      // Find name: names start with '/' in dockerode
      const rawName = c.Names[0] || "";
      const name = rawName.startsWith("/") ? rawName.slice(1) : rawName;

      // Extract ports
      const ports = c.Ports.map((p) => {
        if (p.PublicPort) {
          const ipStr = p.IP ? (p.IP === "::" ? "[::]" : p.IP) + ":" : "";
          return `${ipStr}${p.PublicPort}->${p.PrivatePort}/${p.Type}`;
        }
        return `${p.PrivatePort}/${p.Type}`;
      });

      // Infer health status
      let health: DockerContainerInfo["health"] = "none";
      const statusLower = (c.Status || "").toLowerCase();
      if (statusLower.includes("(healthy)")) {
        health = "healthy";
      } else if (statusLower.includes("(unhealthy)")) {
        health = "unhealthy";
      } else if (statusLower.includes("(starting)")) {
        health = "starting";
      }

      return {
        id: c.Id,
        name,
        image: c.Image,
        state: c.State,
        status: c.Status,
        health,
        ports,
      };
    });
  }

  async getContainerLogs(id: string): Promise<string> {
    const container = this.docker.getContainer(id);
    const result = await container.logs({
      stdout: true,
      stderr: true,
      tail: 200,
      timestamps: false,
      follow: false,
    });
    const buffer = Buffer.isBuffer(result)
      ? result
      : Buffer.from(result as any);
    return this.decodeDemuxLogs(buffer);
  }

  async getContainerStats(id: string): Promise<ContainerStats> {
    const container = this.docker.getContainer(id);
    // get stats from Docker API (non-streamed by passing stream: false)
    const rawStats = await container.stats({ stream: false });

    // CPU Calculations (Unix / standard formula)
    let cpuPercent = 0;
    const cpuDelta =
      rawStats.cpu_stats.cpu_usage.total_usage -
      (rawStats.precpu_stats.cpu_usage.total_usage || 0);
    const systemDelta =
      rawStats.cpu_stats.system_cpu_usage -
      (rawStats.precpu_stats.system_cpu_usage || 0);

    if (systemDelta > 0 && cpuDelta > 0) {
      const numCpus =
        rawStats.cpu_stats.online_cpus ||
        (rawStats.cpu_stats.cpu_usage.percpu_usage
          ? rawStats.cpu_stats.cpu_usage.percpu_usage.length
          : 1);
      cpuPercent = (cpuDelta / systemDelta) * numCpus * 100;
    }

    // Memory Calculations
    const memoryUsage = rawStats.memory_stats.usage || 0;
    const memoryLimit = rawStats.memory_stats.limit || 1;
    const memoryPercent = (memoryUsage / memoryLimit) * 100;

    return {
      cpuPercent: Number.parseFloat(cpuPercent.toFixed(2)),
      memoryUsage,
      memoryLimit,
      memoryPercent: Number.parseFloat(memoryPercent.toFixed(2)),
    };
  }

  async performAction(
    id: string,
    action: "start" | "stop" | "restart",
  ): Promise<void> {
    const container = this.docker.getContainer(id);
    if (action === "start") {
      await container.start();
    } else if (action === "stop") {
      await container.stop();
    } else if (action === "restart") {
      await container.restart();
    } else {
      throw new Error(`Unsupported container action: ${action}`);
    }
  }

  private decodeDemuxLogs(buffer: Buffer): string {
    let offset = 0;
    let text = "";
    while (offset < buffer.length) {
      if (offset + 8 > buffer.length) {
        break;
      }
      const size = buffer.readUInt32BE(offset + 4);

      if (offset + 8 + size > buffer.length) {
        break;
      }
      const chunk = buffer.subarray(offset + 8, offset + 8 + size);
      text += chunk.toString("utf8");
      offset += 8 + size;
    }
    // If not demuxed (e.g. if the buffer is just plain text), fallback to toString()
    if (text === "" && buffer.length > 0) {
      return buffer.toString("utf8");
    }
    return text;
  }
}

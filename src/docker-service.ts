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
      // Find name safely: Names can be null/undefined or empty
      const rawName = (c.Names && c.Names[0]) || "";
      const name = rawName.startsWith("/") ? rawName.slice(1) : rawName;

      // Extract ports safely: Ports can be null/undefined
      const ports = (c.Ports || []).map((p) => {
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
        name: name || "unnamed",
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
    action: "start" | "stop" | "restart" | "delete",
  ): Promise<void> {
    const container = this.docker.getContainer(id);
    if (action === "start") {
      await container.start();
    } else if (action === "stop") {
      await container.stop();
    } else if (action === "restart") {
      await container.restart();
    } else if (action === "delete") {
      await container.remove();
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

  async searchDockerHub(query: string): Promise<any[]> {
    const url = `https://hub.docker.com/v2/search/repositories/?query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Docker Hub search failed with status ${res.status}`);
    }
    const data = await res.json();
    return data.results || [];
  }

  async getDockerHubTags(repo: string): Promise<string[]> {
    const fullRepo = repo.includes("/") ? repo : `library/${repo}`;
    const url = `https://hub.docker.com/v2/repositories/${fullRepo}/tags?page_size=100`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(
        `Docker Hub tags lookup failed with status ${res.status}`,
      );
    }
    const data = await res.json();
    const results = data.results || [];
    return results.map((t: any) => t.name);
  }

  async imageExists(imageName: string): Promise<boolean> {
    try {
      await this.docker.getImage(imageName).inspect();
      return true;
    } catch {
      return false;
    }
  }

  pullImage(
    imageName: string,
    onProgress: (msg: string) => void,
  ): Promise<void> {
    // Docker images pulled without tags default to 'latest'
    const image = imageName.includes(":") ? imageName : `${imageName}:latest`;
    return new Promise((resolve, reject) => {
      this.docker.pull(image, (err: any, stream: any) => {
        if (err) return reject(err);
        this.docker.modem.followProgress(
          stream,
          (err2: any, output: any) => {
            if (err2) return reject(err2);
            resolve();
          },
          (event: any) => {
            const status = event.status || "";
            const progress = event.progress ? ` (${event.progress})` : "";
            onProgress(`${status}${progress}`);
          },
        );
      });
    });
  }

  async runContainer(
    config: ContainerLaunchConfig,
    onProgress?: (msg: string) => void,
  ): Promise<void> {
    const normalizedImage = config.image.includes(":")
      ? config.image
      : `${config.image}:latest`;

    // 1. Ensure image is pulled
    const hasImage = await this.imageExists(normalizedImage);
    if (!hasImage) {
      if (onProgress) onProgress(`Pulling image: ${normalizedImage}...`);
      await this.pullImage(normalizedImage, onProgress || (() => {}));
    }

    // 2. Prepare ExposedPorts and PortBindings
    const ExposedPorts: Record<string, {}> = {};
    const PortBindings: Record<string, { HostPort: string }[]> = {};

    if (config.ports) {
      for (const p of config.ports) {
        if (!p.container) continue;
        const proto = p.protocol || "tcp";
        const portKey = `${p.container}/${proto}`;
        ExposedPorts[portKey] = {};
        PortBindings[portKey] = [{ HostPort: String(p.host || p.container) }];
      }
    }

    // 3. Prepare Binds for Volumes
    const Binds = (config.volumes || [])
      .filter((v) => v.hostPath && v.containerPath)
      .map((v) => `${v.hostPath}:${v.containerPath}`);

    // 4. Prepare Env array
    const Env = (config.env || [])
      .filter((e) => e.key)
      .map((e) => `${e.key}=${e.value || ""}`);

    if (onProgress)
      onProgress(`Creating container: ${config.name || normalizedImage}...`);

    // 5. Create container
    const container = await this.docker.createContainer({
      Image: normalizedImage,
      name: config.name || undefined,
      ExposedPorts,
      HostConfig: {
        PortBindings,
        Binds,
      },
      Env,
      Cmd:
        config.command && config.command.trim()
          ? config.command.trim().split(/\s+/)
          : undefined,
      Tty: config.tty || false,
      OpenStdin: config.tty || false,
    });

    if (onProgress)
      onProgress(`Starting container: ${config.name || normalizedImage}...`);

    // 6. Start container
    await container.start();
  }

  async inspectContainer(id: string): Promise<any> {
    const container = this.docker.getContainer(id);
    return await container.inspect();
  }

  async listImages(): Promise<any[]> {
    const images = await this.docker.listImages();
    return images.map((img) => ({
      id: img.Id,
      tags: img.RepoTags || ["<none>"],
      size: img.Size,
      created: img.Created,
    }));
  }

  async listVolumes(): Promise<any[]> {
    const res = await this.docker.listVolumes();
    return res.Volumes || [];
  }

  async removeImage(id: string): Promise<void> {
    const image = this.docker.getImage(id);
    await image.remove();
  }

  async removeVolume(name: string): Promise<void> {
    const volume = this.docker.getVolume(name);
    await volume.remove();
  }

  async performBulkAction(
    ids: string[],
    action: "stop" | "delete",
  ): Promise<{ id: string; success: boolean; error?: string }[]> {
    return await Promise.all(
      ids.map(async (id) => {
        try {
          await this.performAction(id, action);
          return { id, success: true };
        } catch (err) {
          return {
            id,
            success: false,
            error: (err as Error).message || "Unknown error",
          };
        }
      }),
    );
  }

  async removeImages(
    ids: string[],
  ): Promise<{ id: string; success: boolean; error?: string }[]> {
    return await Promise.all(
      ids.map(async (id) => {
        try {
          await this.removeImage(id);
          return { id, success: true };
        } catch (err) {
          return {
            id,
            success: false,
            error: (err as Error).message || "Unknown error",
          };
        }
      }),
    );
  }

  async removeVolumes(
    names: string[],
  ): Promise<{ name: string; success: boolean; error?: string }[]> {
    return await Promise.all(
      names.map(async (name) => {
        try {
          await this.removeVolume(name);
          return { name, success: true };
        } catch (err) {
          return {
            name,
            success: false,
            error: (err as Error).message || "Unknown error",
          };
        }
      }),
    );
  }
}

export interface ContainerLaunchConfig {
  image: string;
  name?: string;
  ports?: { host: number; container: number; protocol?: string }[];
  volumes?: { hostPath: string; containerPath: string }[];
  env?: { key: string; value: string }[];
  command?: string;
  tty?: boolean;
}

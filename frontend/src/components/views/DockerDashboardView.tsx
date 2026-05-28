import { useEffect, useState, useRef } from "react";
import type { DockerContainerInfo } from "../DockerSidebar";

interface DockerDashboardViewProps {
  containerId: string;
  containers: DockerContainerInfo[];
  onStatusChange: (msg: string, isError?: boolean) => void;
  onRefresh: () => void;
}

interface StatsData {
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
}

export default function DockerDashboardView({
  containerId,
  containers,
  onStatusChange,
  onRefresh,
}: DockerDashboardViewProps) {
  const container = containers.find((c) => c.id === containerId);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [logs, setLogs] = useState<string>("");
  const [actionRunning, setActionRunning] = useState(false);
  const [logsCopied, setLogsCopied] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/docker/containers/${containerId}/logs`);
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || "No logs available.");
      }
    } catch {
      // ignore
    }
  };

  const fetchStats = async () => {
    if (!container || container.state !== "running") {
      setStats(null);
      return;
    }
    try {
      const res = await fetch(`/api/docker/containers/${containerId}/stats`);
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setStats(null);
    setLogs("Loading logs...");
    fetchLogs();
    fetchStats();

    // Set intervals for updates
    const statsInterval = setInterval(fetchStats, 3000);
    const logsInterval = setInterval(fetchLogs, 5000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(logsInterval);
    };
  }, [containerId]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  if (!container) {
    return (
      <div style={{ padding: "32px", color: "var(--text-dim)" }}>
        <h3>Select a container to inspect details.</h3>
      </div>
    );
  }

  const handleAction = async (action: "start" | "stop" | "restart") => {
    setActionRunning(true);
    onStatusChange(`Sending ${action} command to ${container.name}...`, false);
    try {
      const res = await fetch(`/api/docker/containers/${containerId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        onStatusChange(
          `Container ${container.name} ${action}ed successfully!`,
          false,
        );
        onRefresh();
        fetchLogs();
        fetchStats();
      } else {
        onStatusChange(data.error || "Action execution failed.", true);
      }
    } catch (err: any) {
      onStatusChange(err.message || "Action execution failed.", true);
    } finally {
      setActionRunning(false);
    }
  };

  const copyLogs = async () => {
    try {
      await navigator.clipboard.writeText(logs);
      setLogsCopied(true);
      setTimeout(() => setLogsCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="docker-dashboard-wrap">
      {/* Header section */}
      <div className="docker-details-header">
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2>{container.name}</h2>
            <span
              className={`status-pill ${container.state === "running" ? "success" : "danger"}`}
            >
              {container.state.toUpperCase()}
            </span>
          </div>
          <span style={{ fontSize: "0.83rem", color: "var(--text-muted)" }}>
            Image: <code>{container.image}</code> &nbsp;·&nbsp; ID:{" "}
            <code>{container.id.slice(0, 12)}</code>
          </span>
        </div>

        {/* Action Controls */}
        <div className="control-row">
          {container.state === "running" ? (
            <button
              type="button"
              className="control-btn stop-btn"
              onClick={() => handleAction("stop")}
              disabled={actionRunning}
            >
              🛑 Stop
            </button>
          ) : (
            <button
              type="button"
              className="control-btn start-btn"
              onClick={() => handleAction("start")}
              disabled={actionRunning}
            >
              ▶️ Start
            </button>
          )}
          <button
            type="button"
            className="control-btn restart-btn"
            onClick={() => handleAction("restart")}
            disabled={actionRunning || container.state !== "running"}
          >
            🔄 Restart
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        {/* CPU */}
        <div className="metric-card">
          <span className="metric-label">CPU Usage</span>
          <div className="circular-metric-wrap">
            <span className="metric-value">
              {stats ? `${stats.cpuPercent}%` : "0%"}
            </span>
            {container.state !== "running" && (
              <span style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
                OFFLINE
              </span>
            )}
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: stats ? `${Math.min(100, stats.cpuPercent)}%` : "0%",
                background:
                  stats && stats.cpuPercent > 80
                    ? "var(--danger)"
                    : "var(--accent)",
              }}
            />
          </div>
        </div>

        {/* RAM */}
        <div className="metric-card">
          <span className="metric-label">Memory Usage</span>
          <span
            className="metric-value"
            style={{
              fontSize: "1.2rem",
              margin: "10px 0",
              fontFamily: "var(--font-mono)",
            }}
          >
            {stats
              ? `${formatBytes(stats.memoryUsage)} / ${formatBytes(stats.memoryLimit)}`
              : "0 MB / 0 MB"}
          </span>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.78rem",
              color: "var(--text-dim)",
            }}
          >
            <span>
              Limit utilization: {stats ? `${stats.memoryPercent}%` : "0%"}
            </span>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: stats ? `${Math.min(100, stats.memoryPercent)}%` : "0%",
                background:
                  stats && stats.memoryPercent > 85
                    ? "var(--danger)"
                    : "var(--accent)",
              }}
            />
          </div>
        </div>

        {/* Mapped Ports */}
        <div className="metric-card">
          <span className="metric-label">Port Bindings</span>
          <div
            className="bindings-list"
            style={{ overflowY: "auto", maxHeight: "100px", marginTop: "8px" }}
          >
            {container.ports.length === 0 ? (
              <span style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>
                No ports mapped
              </span>
            ) : (
              container.ports.map((port, idx) => (
                <div
                  key={idx}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.82rem",
                    padding: "2px 0",
                    color: "var(--accent)",
                  }}
                >
                  {port}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Logs View Section */}
      <div className="logs-section">
        <div className="logs-header">
          <h3>Stdout & Stderr Logs</h3>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="logs-action-btn"
              onClick={fetchLogs}
            >
              🔄 Refresh Logs
            </button>
            <button
              type="button"
              className="logs-action-btn"
              onClick={copyLogs}
            >
              {logsCopied ? "✅ Copied" : "📋 Copy Logs"}
            </button>
          </div>
        </div>
        <div className="logs-terminal">
          <pre className="logs-content">{logs}</pre>
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}

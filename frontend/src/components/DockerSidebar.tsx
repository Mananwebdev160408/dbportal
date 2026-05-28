import { useState } from "react";

export interface DockerContainerInfo {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  health: "healthy" | "unhealthy" | "starting" | "none";
  ports: string[];
}

interface DockerSidebarProps {
  containers: DockerContainerInfo[];
  selectedContainerId: string;
  onSelectContainer: (id: string) => void;
}

const DockerIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: 18, height: 18, color: "var(--bg)" }}
  >
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const ContainerIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: 14, height: 14 }}
  >
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
    <line x1="6" y1="17" x2="6" y2="21" />
    <line x1="18" y1="17" x2="18" y2="21" />
  </svg>
);

export default function DockerSidebar({
  containers,
  selectedContainerId,
  onSelectContainer,
}: DockerSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredContainers = containers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const runningContainers = filteredContainers.filter(
    (c) => c.state === "running",
  );
  const stoppedContainers = filteredContainers.filter(
    (c) => c.state !== "running",
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-glow" aria-hidden="true" />
      <div className="sidebar-header">
        <div className="brand-row">
          <div className="logo-icon" style={{ background: "var(--accent)" }}>
            <DockerIcon />
          </div>
          <div className="brand-block">
            <h1 className="brand">dbportal</h1>
          </div>
        </div>

        <div className="sidebar-meta-strip">
          <span className="meta-pill">{containers.length} Containers</span>
          <span className="meta-pill accent">
            {containers.filter((c) => c.state === "running").length} Active
          </span>
        </div>
      </div>

      <div className="sidebar-scroll">
        <div className="sidebar-search">
          <input
            type="text"
            placeholder="Search containers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sidebar-search-input"
            aria-label="Filter containers"
          />
        </div>

        <div className="db-selector-wrapper">
          <div className="section-label">Active Engine</div>
          <div className="db-connection-list">
            <button className="db-connection-item active" type="button">
              <div
                className="indicator"
                style={{ background: "var(--success)" }}
              />
              <div className="conn-info">
                <span className="name">Local Engine</span>
                <span className="kind">DOCKER DAEMON</span>
              </div>
              <span className="conn-tag">LIVE</span>
            </button>
          </div>
        </div>

        <div className="section-divider" />

        {/* Running Containers */}
        <div className="table-nav-group">
          <div className="section-label-row">
            <span className="section-label">Running</span>
            <span
              className="count-badge"
              style={{ background: "var(--success)", opacity: 0.85 }}
            >
              {runningContainers.length}
            </span>
          </div>

          <div className="table-list">
            {runningContainers.length === 0 && (
              <div className="list-empty-state">No running containers</div>
            )}
            {runningContainers.map((container) => {
              const isSelected = selectedContainerId === container.id;
              let indicatorColor = "var(--success)";
              if (container.health === "unhealthy")
                indicatorColor = "var(--danger)";
              else if (container.health === "starting")
                indicatorColor = "var(--warning)";

              return (
                <button
                  key={container.id}
                  className={`table-item${isSelected ? " active" : ""}`}
                  onClick={() => onSelectContainer(container.id)}
                  type="button"
                  title={container.name}
                >
                  <ContainerIcon />
                  <span
                    style={{
                      flex: 1,
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {container.name}
                  </span>
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: indicatorColor,
                      marginLeft: "6px",
                      boxShadow: `0 0 8px ${indicatorColor}`,
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Stopped Containers */}
        <div className="table-nav-group" style={{ marginTop: "24px" }}>
          <div className="section-label-row">
            <span className="section-label">Stopped</span>
            <span
              className="count-badge"
              style={{ background: "var(--text-dim)" }}
            >
              {stoppedContainers.length}
            </span>
          </div>

          <div className="table-list">
            {stoppedContainers.length === 0 && (
              <div className="list-empty-state">No stopped containers</div>
            )}
            {stoppedContainers.map((container) => {
              const isSelected = selectedContainerId === container.id;
              return (
                <button
                  key={container.id}
                  className={`table-item${isSelected ? " active" : ""}`}
                  onClick={() => onSelectContainer(container.id)}
                  type="button"
                  title={container.name}
                  style={{ opacity: 0.6 }}
                >
                  <ContainerIcon />
                  <span
                    style={{
                      flex: 1,
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {container.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}

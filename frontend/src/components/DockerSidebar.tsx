import { useState } from "react";
import { SelectBoxIcon, CloseIcon, StopIcon, TrashIcon } from "./Icons";

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
  onStatusChange: (msg: string, isError?: boolean) => void;
  onRefreshContainers: () => void;
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

const PlusIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: 14, height: 14 }}
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ImagesIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: 14, height: 14 }}
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.15" x2="12" y2="12" />
  </svg>
);

const VolumesIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: 14, height: 14 }}
  >
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
  </svg>
);

export default function DockerSidebar({
  containers,
  selectedContainerId,
  onSelectContainer,
  onStatusChange,
  onRefreshContainers,
}: DockerSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);

  const filteredContainers = containers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const runningContainers = filteredContainers.filter(
    (c) => c.state === "running",
  );
  const stoppedContainers = filteredContainers.filter(
    (c) => c.state !== "running",
  );

  const toggleSelectMode = () => {
    setIsSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroupSelect = (group: DockerContainerInfo[]) => {
    const ids = group.map((c) => c.id);
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const selectedRunning = [...selectedIds].filter((id) =>
    runningContainers.some((c) => c.id === id),
  );
  const selectedStopped = [...selectedIds].filter((id) =>
    stoppedContainers.some((c) => c.id === id),
  );

  const handleBulkStop = async () => {
    if (selectedRunning.length === 0) return;
    if (!window.confirm(`Stop ${selectedRunning.length} running container(s)?`))
      return;
    setBulkRunning(true);
    onStatusChange(`Stopping ${selectedRunning.length} container(s)...`);
    try {
      const res = await fetch("/api/docker/containers/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedRunning, action: "stop" }),
      });
      const data = await res.json();
      const failed =
        (data.results as { success: boolean }[])?.filter((r) => !r.success)
          .length ?? 0;
      if (failed > 0) {
        onStatusChange(`Stopped with ${failed} error(s). Check logs.`, true);
      } else {
        onStatusChange(
          `${selectedRunning.length} container(s) stopped successfully!`,
        );
      }
      setSelectedIds(new Set());
      onRefreshContainers();
    } catch (err: unknown) {
      onStatusChange((err as Error).message || "Bulk stop failed", true);
    } finally {
      setBulkRunning(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStopped.length === 0) return;
    if (
      !window.confirm(
        `Permanently delete ${selectedStopped.length} stopped container(s)? This cannot be undone.`,
      )
    )
      return;
    setBulkRunning(true);
    onStatusChange(`Deleting ${selectedStopped.length} container(s)...`);
    try {
      const res = await fetch("/api/docker/containers/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedStopped, action: "delete" }),
      });
      const data = await res.json();
      const failed =
        (data.results as { success: boolean }[])?.filter((r) => !r.success)
          .length ?? 0;
      if (failed > 0) {
        onStatusChange(`Deleted with ${failed} error(s). Check logs.`, true);
      } else {
        onStatusChange(
          `${selectedStopped.length} container(s) deleted successfully!`,
        );
      }
      setSelectedIds(new Set());
      onRefreshContainers();
    } catch (err: unknown) {
      onStatusChange((err as Error).message || "Bulk delete failed", true);
    } finally {
      setBulkRunning(false);
    }
  };

  const allRunningSelected =
    runningContainers.length > 0 &&
    runningContainers.every((c) => selectedIds.has(c.id));
  const allStoppedSelected =
    stoppedContainers.length > 0 &&
    stoppedContainers.every((c) => selectedIds.has(c.id));

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
        <button
          className={`overview-btn common-dashboard-btn${selectedContainerId === "__runner__" ? " active" : ""}`}
          onClick={() => onSelectContainer("__runner__")}
          type="button"
          style={{ marginBottom: "16px" }}
        >
          <PlusIcon />
          <span>Launch Containers</span>
        </button>

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

        <div className="section-label">Workspace</div>

        <button
          className={`overview-btn${selectedContainerId === "__images__" ? " active" : ""}`}
          onClick={() => onSelectContainer("__images__")}
          type="button"
          style={{ marginBottom: "8px" }}
        >
          <ImagesIcon />
          <span>Images</span>
        </button>

        <button
          className={`overview-btn${selectedContainerId === "__volumes__" ? " active" : ""}`}
          onClick={() => onSelectContainer("__volumes__")}
          type="button"
          style={{ marginBottom: "16px" }}
        >
          <VolumesIcon />
          <span>Volumes</span>
        </button>

        <div className="section-divider" />

        {/* Containers header + select toggle */}
        <div className="section-label-row" style={{ marginBottom: "8px" }}>
          <span className="section-label">Containers</span>
          <button
            type="button"
            onClick={toggleSelectMode}
            style={{
              background: isSelectMode ? "var(--accent-soft)" : "transparent",
              border: `1px solid ${isSelectMode ? "var(--accent)" : "var(--line-strong)"}`,
              color: isSelectMode ? "var(--accent)" : "var(--text-dim)",
              borderRadius: "4px",
              padding: "2px 7px",
              fontSize: "10px",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              transition: "all 0.2s",
              letterSpacing: "0.5px",
            }}
          >
            {isSelectMode ? (
              <>
                <CloseIcon
                  size={10}
                  style={{ marginRight: 3, verticalAlign: "middle" }}
                />
                CANCEL
              </>
            ) : (
              <>
                <SelectBoxIcon
                  size={11}
                  style={{ marginRight: 3, verticalAlign: "middle" }}
                />
                SELECT
              </>
            )}
          </button>
        </div>

        {/* Running Containers */}
        <div className="table-nav-group">
          <div className="section-label-row">
            {isSelectMode && runningContainers.length > 0 && (
              <input
                type="checkbox"
                checked={allRunningSelected}
                onChange={() => toggleGroupSelect(runningContainers)}
                style={{
                  marginRight: "6px",
                  cursor: "pointer",
                  accentColor: "var(--accent)",
                }}
                title="Select all running"
              />
            )}
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
              const isChecked = selectedIds.has(container.id);
              let indicatorColor = "var(--success)";
              if (container.health === "unhealthy")
                indicatorColor = "var(--danger)";
              else if (container.health === "starting")
                indicatorColor = "var(--warning)";

              return (
                <button
                  key={container.id}
                  className={`table-item${isSelected && !isSelectMode ? " active" : ""}${isChecked && isSelectMode ? " active" : ""}`}
                  onClick={() => {
                    if (isSelectMode) toggleSelect(container.id);
                    else onSelectContainer(container.id);
                  }}
                  type="button"
                  title={container.name}
                  style={{ gap: "6px" }}
                >
                  {isSelectMode && (
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(container.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        cursor: "pointer",
                        accentColor: "var(--accent)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {!isSelectMode && <ContainerIcon />}
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
                      flexShrink: 0,
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
            {isSelectMode && stoppedContainers.length > 0 && (
              <input
                type="checkbox"
                checked={allStoppedSelected}
                onChange={() => toggleGroupSelect(stoppedContainers)}
                style={{
                  marginRight: "6px",
                  cursor: "pointer",
                  accentColor: "var(--accent)",
                }}
                title="Select all stopped"
              />
            )}
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
              const isChecked = selectedIds.has(container.id);
              return (
                <button
                  key={container.id}
                  className={`table-item${isSelected && !isSelectMode ? " active" : ""}${isChecked && isSelectMode ? " active" : ""}`}
                  onClick={() => {
                    if (isSelectMode) toggleSelect(container.id);
                    else onSelectContainer(container.id);
                  }}
                  type="button"
                  title={container.name}
                  style={{ opacity: isSelectMode ? 1 : 0.6, gap: "6px" }}
                >
                  {isSelectMode && (
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(container.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        cursor: "pointer",
                        accentColor: "var(--accent)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {!isSelectMode && <ContainerIcon />}
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

        {/* Bulk Action Bar */}
        {isSelectMode && (
          <div className="sidebar-bulk-bar">
            <div className="sidebar-bulk-info">
              <span style={{ fontWeight: 700, color: "var(--accent)" }}>
                {selectedIds.size} selected
              </span>
              <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>
                {selectedRunning.length} running · {selectedStopped.length}{" "}
                stopped
              </span>
            </div>
            <div className="sidebar-bulk-actions-row">
              <button
                type="button"
                className="sidebar-bulk-btn stop"
                disabled={selectedRunning.length === 0 || bulkRunning}
                onClick={handleBulkStop}
                title={`Stop ${selectedRunning.length} running container(s)`}
              >
                <StopIcon size={11} style={{ marginRight: 5 }} /> Stop (
                {selectedRunning.length})
              </button>
              <button
                type="button"
                className="sidebar-bulk-btn danger"
                disabled={selectedStopped.length === 0 || bulkRunning}
                onClick={handleBulkDelete}
                title={`Delete ${selectedStopped.length} stopped container(s)`}
              >
                <TrashIcon size={11} style={{ marginRight: 5 }} /> Delete (
                {selectedStopped.length})
              </button>
            </div>
            {bulkRunning && (
              <div
                style={{
                  textAlign: "center",
                  fontSize: "10px",
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Working...
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

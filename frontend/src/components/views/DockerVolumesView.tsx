import { useEffect, useState } from "react";
import EmptyState from "../EmptyState";
import { RefreshIcon, TrashIcon, CloseIcon } from "../Icons";

interface DockerVolumeInfo {
  Name: string;
  Driver: string;
  Mountpoint: string;
  Scope: string;
}

interface DockerVolumesViewProps {
  onStatusChange: (msg: string, isError?: boolean) => void;
}

export default function DockerVolumesView({
  onStatusChange,
}: DockerVolumesViewProps) {
  const [volumes, setVolumes] = useState<DockerVolumeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchVolumes = async () => {
    setLoading(true);
    setSelectedNames(new Set());
    try {
      const res = await fetch("/api/docker/volumes");
      const data = await res.json();
      if (res.ok) {
        setVolumes(data.volumes || []);
        onStatusChange("Local Docker volumes updated", false);
      } else {
        onStatusChange(data.error || "Failed to load volumes.", true);
      }
    } catch (err: any) {
      onStatusChange(err.message || "Failed to load volumes.", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVolumes();
  }, []);

  const handleDelete = async (name: string) => {
    const displayName = name.length > 20 ? name.slice(0, 20) + "..." : name;
    if (
      !window.confirm(
        `Are you sure you want to permanently remove volume "${displayName}"?`,
      )
    ) {
      return;
    }

    setDeletingName(name);
    onStatusChange(`Removing volume ${displayName}...`, false);
    try {
      const res = await fetch(
        `/api/docker/volumes/${encodeURIComponent(name)}`,
        {
          method: "DELETE",
        },
      );
      const data = await res.json();
      if (res.ok) {
        onStatusChange(`Volume ${displayName} removed successfully!`, false);
        fetchVolumes();
      } else {
        onStatusChange(
          data.error ||
            "Failed to remove volume. Make sure no containers are using it.",
          true,
        );
      }
    } catch (err: any) {
      onStatusChange(err.message || "Failed to remove volume.", true);
    } finally {
      setDeletingName(null);
    }
  };

  const handleBulkDelete = async () => {
    const names = [...selectedNames];
    if (names.length === 0) return;
    if (
      !window.confirm(
        `Permanently delete ${names.length} volume(s)? This cannot be undone.`,
      )
    )
      return;

    setBulkDeleting(true);
    onStatusChange(`Deleting ${names.length} volume(s)...`);
    try {
      const res = await fetch("/api/docker/volumes/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names }),
      });
      const data = await res.json();
      const failed =
        (data.results as { success: boolean }[])?.filter((r) => !r.success)
          .length ?? 0;
      if (failed > 0) {
        onStatusChange(
          `Deleted with ${failed} error(s). Some volumes may still be in use.`,
          true,
        );
      } else {
        onStatusChange(`${names.length} volume(s) deleted successfully!`);
      }
      fetchVolumes();
    } catch (err: any) {
      onStatusChange(err.message || "Bulk delete failed.", true);
    } finally {
      setBulkDeleting(false);
    }
  };

  const filteredVolumes = volumes.filter((vol) => {
    const term = searchQuery.toLowerCase();
    const hasNameMatch = vol.Name.toLowerCase().includes(term);
    const hasDriverMatch = vol.Driver.toLowerCase().includes(term);
    return hasNameMatch || hasDriverMatch;
  });

  const allSelected =
    filteredVolumes.length > 0 &&
    filteredVolumes.every((vol) => selectedNames.has(vol.Name));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedNames(new Set());
    } else {
      setSelectedNames(new Set(filteredVolumes.map((vol) => vol.Name)));
    }
  };

  const toggleSelectVolume = (name: string) => {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="overview-wrap" style={{ padding: "20px" }}>
      {/* Header and Toolbar controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
            Local Volumes
          </h2>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: "0.85rem",
              color: "var(--text-muted)",
            }}
          >
            List of local storage volumes created on this host
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            placeholder="Search volumes or driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="query-input"
            style={{ width: "240px", padding: "8px 12px", fontSize: "0.85rem" }}
          />
          <button
            type="button"
            className="logs-action-btn"
            onClick={fetchVolumes}
            disabled={loading}
          >
            {loading ? (
              "Refreshing..."
            ) : (
              <>
                <RefreshIcon size={13} style={{ marginRight: 5 }} />
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedNames.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 16px",
            background: "var(--accent-soft)",
            border: "1px solid var(--accent)",
            borderRadius: "8px",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: "var(--accent)",
              fontSize: "0.85rem",
            }}
          >
            {selectedNames.size} volume{selectedNames.size !== 1 ? "s" : ""}{" "}
            selected
          </span>
          <button
            type="button"
            className="logs-action-btn"
            style={{
              borderColor: "rgba(220, 38, 38, 0.5)",
              color: "rgba(239, 68, 68, 0.9)",
              padding: "5px 14px",
              fontSize: "0.8rem",
            }}
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
          >
            {bulkDeleting ? (
              "Deleting..."
            ) : (
              <>
                <TrashIcon size={12} style={{ marginRight: 5 }} />
                Delete Selected ({selectedNames.size})
              </>
            )}
          </button>
          <button
            type="button"
            className="logs-action-btn"
            style={{ padding: "5px 12px", fontSize: "0.8rem" }}
            onClick={() => setSelectedNames(new Set())}
          >
            <>
              <CloseIcon size={12} style={{ marginRight: 5 }} />
              Clear
            </>
          </button>
        </div>
      )}

      {loading && volumes.length === 0 ? (
        <EmptyState>
          <div className="loading-pulse" />
          <p>Loading local volumes...</p>
        </EmptyState>
      ) : filteredVolumes.length === 0 ? (
        <EmptyState>
          <p>No volumes found matching filter.</p>
        </EmptyState>
      ) : (
        <div className="overview-card" style={{ marginTop: 0 }}>
          <table className="overview-table">
            <thead>
              <tr>
                <th style={{ width: "36px" }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    style={{ cursor: "pointer", accentColor: "var(--accent)" }}
                    title="Select all"
                  />
                </th>
                <th>Volume Name</th>
                <th style={{ width: "120px" }}>Driver</th>
                <th style={{ width: "100px" }}>Scope</th>
                <th>Mountpoint</th>
                <th style={{ width: "120px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVolumes.map((vol) => {
                const isChecked = selectedNames.has(vol.Name);
                return (
                  <tr
                    key={vol.Name}
                    style={{
                      height: "48px",
                      background: isChecked ? "var(--accent-soft)" : undefined,
                    }}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectVolume(vol.Name)}
                        style={{
                          cursor: "pointer",
                          accentColor: "var(--accent)",
                        }}
                      />
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.85rem",
                        color: "var(--accent)",
                        maxWidth: "240px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={vol.Name}
                    >
                      {vol.Name}
                    </td>
                    <td>
                      <span
                        className="status-pill"
                        style={{
                          background: "var(--line)",
                          borderColor: "var(--line-strong)",
                          color: "var(--text-muted)",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                        }}
                      >
                        {vol.Driver}
                      </span>
                    </td>
                    <td
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {vol.Scope || "local"}
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.78rem",
                        color: "var(--text-dim)",
                        maxWidth: "300px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={vol.Mountpoint}
                    >
                      {vol.Mountpoint}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="logs-action-btn"
                        style={{
                          borderColor: "rgba(220, 38, 38, 0.4)",
                          color: "rgba(239, 68, 68, 0.85)",
                          padding: "4px 10px",
                          fontSize: "10px",
                        }}
                        onClick={() => handleDelete(vol.Name)}
                        disabled={deletingName === vol.Name}
                      >
                        <TrashIcon size={12} style={{ marginRight: 4 }} />{" "}
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import EmptyState from "../EmptyState";
import { RefreshIcon, TrashIcon, CloseIcon, CheckIcon } from "../Icons";

interface DockerImageInfo {
  id: string;
  tags: string[];
  size: number;
  created: number;
}

interface DockerImagesViewProps {
  onStatusChange: (msg: string, isError?: boolean) => void;
}

export default function DockerImagesView({
  onStatusChange,
}: DockerImagesViewProps) {
  const [images, setImages] = useState<DockerImageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchImages = async () => {
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const res = await fetch("/api/docker/images");
      const data = await res.json();
      if (res.ok) {
        setImages(data.images || []);
        onStatusChange("Local Docker images updated", false);
      } else {
        onStatusChange(data.error || "Failed to load images.", true);
      }
    } catch (err: any) {
      onStatusChange(err.message || "Failed to load images.", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleDelete = async (id: string, tag: string) => {
    const cleanId = id.split(":")[1]?.slice(0, 12) || id.slice(0, 12);
    const displayName = tag && tag !== "<none>" ? tag : cleanId;
    if (
      !window.confirm(
        `Are you sure you want to remove the image "${displayName}"?`,
      )
    ) {
      return;
    }

    setDeletingId(id);
    onStatusChange(`Removing image ${displayName}...`, false);
    try {
      const res = await fetch(`/api/docker/images/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        onStatusChange(`Image ${displayName} removed successfully!`, false);
        fetchImages();
      } else {
        onStatusChange(
          data.error ||
            "Failed to remove image. Make sure no containers are using it.",
          true,
        );
      }
    } catch (err: any) {
      onStatusChange(err.message || "Failed to remove image.", true);
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `Permanently delete ${ids.length} image(s)? Make sure no containers are using them.`,
      )
    )
      return;

    setBulkDeleting(true);
    onStatusChange(`Deleting ${ids.length} image(s)...`);
    try {
      const res = await fetch("/api/docker/images/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      const failed =
        (data.results as { success: boolean }[])?.filter((r) => !r.success)
          .length ?? 0;
      if (failed > 0) {
        onStatusChange(
          `Deleted with ${failed} error(s). Some images may still be in use.`,
          true,
        );
      } else {
        onStatusChange(`${ids.length} image(s) deleted successfully!`);
      }
      fetchImages();
    } catch (err: any) {
      onStatusChange(err.message || "Bulk delete failed.", true);
    } finally {
      setBulkDeleting(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const filteredImages = images.filter((img) => {
    const term = searchQuery.toLowerCase();
    const hasTagMatch = img.tags.some((t) => t.toLowerCase().includes(term));
    const hasIdMatch = img.id.toLowerCase().includes(term);
    return hasTagMatch || hasIdMatch;
  });

  const allSelected =
    filteredImages.length > 0 &&
    filteredImages.every((img) => selectedIds.has(img.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredImages.map((img) => img.id)));
    }
  };

  const toggleSelectImage = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
            Local Images
          </h2>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: "0.85rem",
              color: "var(--text-muted)",
            }}
          >
            List of downloaded Docker images available on this host
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            placeholder="Search tags or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="query-input"
            style={{ width: "240px", padding: "8px 12px", fontSize: "0.85rem" }}
          />
          <button
            type="button"
            className="logs-action-btn"
            onClick={fetchImages}
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
      {selectedIds.size > 0 && (
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
            {selectedIds.size} image{selectedIds.size !== 1 ? "s" : ""} selected
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
                Delete Selected ({selectedIds.size})
              </>
            )}
          </button>
          <button
            type="button"
            className="logs-action-btn"
            style={{ padding: "5px 12px", fontSize: "0.8rem" }}
            onClick={() => setSelectedIds(new Set())}
          >
            <>
              <CloseIcon size={12} style={{ marginRight: 5 }} />
              Clear
            </>
          </button>
        </div>
      )}

      {loading && images.length === 0 ? (
        <EmptyState>
          <div className="loading-pulse" />
          <p>Loading local images...</p>
        </EmptyState>
      ) : filteredImages.length === 0 ? (
        <EmptyState>
          <p>No images found matching filter.</p>
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
                <th style={{ width: "80px" }}>Short ID</th>
                <th>Repository Tags</th>
                <th>Size</th>
                <th>Created At</th>
                <th style={{ width: "120px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredImages.map((img) => {
                const shortId =
                  img.id.split(":")[1]?.slice(0, 12) || img.id.slice(0, 12);
                const isChecked = selectedIds.has(img.id);
                return (
                  <tr
                    key={img.id}
                    style={{
                      height: "48px",
                      background: isChecked ? "var(--accent-soft)" : undefined,
                    }}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectImage(img.id)}
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
                      }}
                    >
                      {shortId}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                        }}
                      >
                        {img.tags.map((tag) => (
                          <span
                            key={tag}
                            className="status-pill"
                            style={{
                              background:
                                tag === "<none>"
                                  ? "var(--line)"
                                  : "var(--accent-soft)",
                              borderColor:
                                tag === "<none>"
                                  ? "var(--line-strong)"
                                  : "var(--accent)",
                              color:
                                tag === "<none>"
                                  ? "var(--text-dim)"
                                  : "var(--accent)",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.85rem",
                      }}
                    >
                      {formatBytes(img.size)}
                    </td>
                    <td
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {formatDate(img.created)}
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
                        onClick={() => handleDelete(img.id, img.tags[0])}
                        disabled={deletingId === img.id}
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

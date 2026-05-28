import { useState, useEffect, useRef } from "react";
import {
  TrashIcon,
  CloseIcon,
  RocketIcon,
  FileCodeIcon,
  CopyIcon,
  SaveIcon,
  RefreshIcon,
} from "../Icons";

interface PortMapping {
  host: string;
  container: string;
  protocol: "tcp" | "udp";
}

interface VolumeMount {
  hostPath: string;
  containerPath: string;
}

interface EnvVar {
  key: string;
  value: string;
}

interface ContainerConfig {
  key: string;
  imageSearch: string;
  searchResults: any[];
  isSearching: boolean;
  showSearchDropdown: boolean;
  tags: string[];
  isLoadingTags: boolean;

  // Conf values
  imageName: string;
  selectedTag: string;
  containerName: string;
  ports: PortMapping[];
  volumes: VolumeMount[];
  env: EnvVar[];
  command: string;
  tty: boolean;
}

interface DockerRunnerViewProps {
  onRefreshSidebar: () => void;
  onStatusChange: (msg: string, isError?: boolean) => void;
}

// Common image defaults for smart auto-population
function getCommonConfigForImage(imageName: string) {
  const name = imageName.toLowerCase().split("/").pop() || "";
  const registry: Record<
    string,
    { ports: { container: string; host: string }[]; env: EnvVar[] }
  > = {
    redis: {
      ports: [{ container: "6379", host: "6379" }],
      env: [{ key: "REDIS_PASSWORD", value: "" }],
    },
    nginx: {
      ports: [{ container: "80", host: "8080" }],
      env: [],
    },
    postgres: {
      ports: [{ container: "5432", host: "5432" }],
      env: [
        { key: "POSTGRES_PASSWORD", value: "postgres" },
        { key: "POSTGRES_USER", value: "postgres" },
        { key: "POSTGRES_DB", value: "postgres" },
      ],
    },
    mysql: {
      ports: [{ container: "3306", host: "3306" }],
      env: [
        { key: "MYSQL_ROOT_PASSWORD", value: "secret" },
        { key: "MYSQL_DATABASE", value: "app_db" },
      ],
    },
    mongo: {
      ports: [{ container: "27017", host: "27017" }],
      env: [
        { key: "MONGO_INITDB_ROOT_USERNAME", value: "admin" },
        { key: "MONGO_INITDB_ROOT_PASSWORD", value: "secret" },
      ],
    },
    mongodb: {
      ports: [{ container: "27017", host: "27017" }],
      env: [
        { key: "MONGO_INITDB_ROOT_USERNAME", value: "admin" },
        { key: "MONGO_INITDB_ROOT_PASSWORD", value: "secret" },
      ],
    },
    mariadb: {
      ports: [{ container: "3306", host: "3306" }],
      env: [
        { key: "MARIADB_ROOT_PASSWORD", value: "secret" },
        { key: "MARIADB_DATABASE", value: "app_db" },
      ],
    },
    rabbitmq: {
      ports: [
        { container: "5672", host: "5672" },
        { container: "15672", host: "15672" },
      ],
      env: [
        { key: "RABBITMQ_DEFAULT_USER", value: "guest" },
        { key: "RABBITMQ_DEFAULT_PASS", value: "guest" },
      ],
    },
    memcached: {
      ports: [{ container: "11211", host: "11211" }],
      env: [],
    },
    elasticsearch: {
      ports: [{ container: "9200", host: "9200" }],
      env: [{ key: "discovery.type", value: "single-node" }],
    },
  };

  // Find substring match (e.g. bitnami/redis matches redis)
  for (const key of Object.keys(registry)) {
    if (name.includes(key)) {
      return registry[key];
    }
  }
  return null;
}

export default function DockerRunnerView({
  onRefreshSidebar,
  onStatusChange,
}: DockerRunnerViewProps) {
  const [configs, setConfigs] = useState<ContainerConfig[]>([
    createEmptyConfig(),
  ]);
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [composeYaml, setComposeYaml] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [saveError, setSaveError] = useState(false);

  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runLogs, setRunLogs] = useState<string[]>([]);
  const [runInProgress, setRunInProgress] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [runLogs]);

  // Click away dropdown behavior
  useEffect(() => {
    const handleGlobalClick = () => {
      setConfigs((prev) =>
        prev.map((c) => ({ ...c, showSearchDropdown: false })),
      );
    };
    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

  function createEmptyConfig(): ContainerConfig {
    return {
      key: Math.random().toString(36).substring(7),
      imageSearch: "",
      searchResults: [],
      isSearching: false,
      showSearchDropdown: false,
      tags: [],
      isLoadingTags: false,
      imageName: "",
      selectedTag: "",
      containerName: "",
      ports: [],
      volumes: [],
      env: [],
      command: "",
      tty: false,
    };
  }

  const addConfig = () => {
    setConfigs((prev) => [...prev, createEmptyConfig()]);
  };

  const removeConfig = (idx: number) => {
    setConfigs((prev) => {
      if (prev.length <= 1) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
  };

  const updateConfig = (idx: number, fields: Partial<ContainerConfig>) => {
    setConfigs((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...fields };
      return next;
    });
  };

  const handleSearchImages = async (idx: number, query: string) => {
    if (!query.trim()) {
      updateConfig(idx, { searchResults: [], showSearchDropdown: false });
      return;
    }
    updateConfig(idx, { isSearching: true, showSearchDropdown: true });
    try {
      const res = await fetch(
        `/api/docker/hub/search?query=${encodeURIComponent(query)}`,
      );
      const data = await res.json();
      if (res.ok) {
        updateConfig(idx, {
          searchResults: data.results || [],
          isSearching: false,
        });
      } else {
        updateConfig(idx, { isSearching: false });
      }
    } catch {
      updateConfig(idx, { isSearching: false });
    }
  };

  const handleSelectImage = async (idx: number, repoName: string) => {
    const common = getCommonConfigForImage(repoName);

    updateConfig(idx, {
      imageName: repoName,
      showSearchDropdown: false,
      imageSearch: repoName,
      isLoadingTags: true,
      tags: [],
      selectedTag: "",
      // Auto-populate ports/envs if a common image match is found
      ports: common
        ? common.ports.map((p) => ({
            host: p.host,
            container: p.container,
            protocol: "tcp" as const,
          }))
        : [],
      env: common
        ? common.env.map((e) => ({ key: e.key, value: e.value }))
        : [],
      containerName: repoName.split("/").pop() || "",
    });

    try {
      const res = await fetch(
        `/api/docker/hub/tags?repo=${encodeURIComponent(repoName)}`,
      );
      const data = await res.json();
      if (res.ok) {
        const tags = data.tags || [];
        updateConfig(idx, {
          tags,
          isLoadingTags: false,
          selectedTag: tags.includes("latest") ? "latest" : tags[0] || "",
        });
      } else {
        updateConfig(idx, { isLoadingTags: false });
      }
    } catch {
      updateConfig(idx, { isLoadingTags: false });
    }
  };

  // Ports functions
  const addPort = (idx: number) => {
    const ports = [
      ...configs[idx].ports,
      { host: "", container: "", protocol: "tcp" as const },
    ];
    updateConfig(idx, { ports });
  };
  const removePort = (cIdx: number, pIdx: number) => {
    const ports = [...configs[cIdx].ports];
    ports.splice(pIdx, 1);
    updateConfig(cIdx, { ports });
  };
  const updatePort = (
    cIdx: number,
    pIdx: number,
    fields: Partial<PortMapping>,
  ) => {
    const ports = [...configs[cIdx].ports];
    ports[pIdx] = { ...ports[pIdx], ...fields };
    updateConfig(cIdx, { ports });
  };

  // Volumes functions
  const addVolume = (idx: number) => {
    const volumes = [
      ...configs[idx].volumes,
      { hostPath: "", containerPath: "" },
    ];
    updateConfig(idx, { volumes });
  };
  const removeVolume = (cIdx: number, vIdx: number) => {
    const volumes = [...configs[cIdx].volumes];
    volumes.splice(vIdx, 1);
    updateConfig(cIdx, { volumes });
  };
  const updateVolume = (
    cIdx: number,
    vIdx: number,
    fields: Partial<VolumeMount>,
  ) => {
    const volumes = [...configs[cIdx].volumes];
    volumes[vIdx] = { ...volumes[vIdx], ...fields };
    updateConfig(cIdx, { volumes });
  };

  // Env functions
  const addEnv = (idx: number) => {
    const env = [...configs[idx].env, { key: "", value: "" }];
    updateConfig(idx, { env });
  };
  const removeEnv = (cIdx: number, eIdx: number) => {
    const env = [...configs[cIdx].env];
    env.splice(eIdx, 1);
    updateConfig(cIdx, { env });
  };
  const updateEnv = (cIdx: number, eIdx: number, fields: Partial<EnvVar>) => {
    const env = [...configs[cIdx].env];
    env[eIdx] = { ...env[eIdx], ...fields };
    updateConfig(cIdx, { env });
  };

  // Generate Docker Compose
  const generateComposeYaml = (): string => {
    let yaml = "version: '3.8'\n\nservices:\n";
    configs.forEach((c) => {
      if (!c.imageName) return;
      const serviceName =
        c.containerName || c.imageName.split("/").pop() || "service";
      const fullImage = `${c.imageName}:${c.selectedTag || "latest"}`;

      yaml += `  ${serviceName.replace(/[^a-zA-Z0-9_-]/g, "_")}:\n`;
      yaml += `    image: ${fullImage}\n`;
      if (c.containerName) {
        yaml += `    container_name: ${c.containerName}\n`;
      }
      if (c.command && c.command.trim()) {
        yaml += `    command: ${c.command.trim()}\n`;
      }
      if (c.tty) {
        yaml += `    tty: true\n`;
        yaml += `    stdin_open: true\n`;
      }
      if (c.ports.length > 0) {
        yaml += "    ports:\n";
        c.ports.forEach((p) => {
          if (p.container) {
            const hostPort = p.host || p.container;
            yaml += `      - "${hostPort}:${p.container}${p.protocol === "udp" ? "/udp" : ""}"\n`;
          }
        });
      }
      if (c.volumes.length > 0) {
        yaml += "    volumes:\n";
        c.volumes.forEach((v) => {
          if (v.hostPath && v.containerPath) {
            yaml += `      - "${v.hostPath}:${v.containerPath}"\n`;
          }
        });
      }
      if (c.env.length > 0) {
        yaml += "    environment:\n";
        c.env.forEach((e) => {
          if (e.key) {
            yaml += `      - ${e.key}=${e.value || ""}\n`;
          }
        });
      }
    });
    return yaml;
  };

  const handleComposeClick = () => {
    const yaml = generateComposeYaml();
    setComposeYaml(yaml);
    setSaveStatus("");
    setComposeModalOpen(true);
  };

  const saveComposeToWorkspace = async () => {
    setSaveStatus("Saving...");
    setSaveError(false);
    try {
      const res = await fetch("/api/docker/hub/save-compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yaml: composeYaml }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus(`Saved successfully to ${data.path}`);
      } else {
        setSaveStatus(data.error || "Failed to save file.");
        setSaveError(true);
      }
    } catch (err: any) {
      setSaveStatus(err.message || "Failed to save file.");
      setSaveError(true);
    }
  };

  const copyComposeToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(composeYaml);
      setSaveStatus("YAML copied to clipboard!");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch {
      // ignore
    }
  };

  // Run Containers
  const handleRunContainers = async () => {
    const validConfigs = configs.filter((c) => c.imageName);
    if (validConfigs.length === 0) {
      onStatusChange("Please select at least one Docker image.", true);
      return;
    }

    const payload = validConfigs.map((c) => ({
      image: `${c.imageName}:${c.selectedTag || "latest"}`,
      name: c.containerName || undefined,
      ports: c.ports.map((p) => ({
        host: Number(p.host || p.container),
        container: Number(p.container),
        protocol: p.protocol,
      })),
      volumes: c.volumes.map((v) => ({
        hostPath: v.hostPath,
        containerPath: v.containerPath,
      })),
      env: c.env.map((e) => ({
        key: e.key,
        value: e.value,
      })),
      command: c.command && c.command.trim() ? c.command.trim() : undefined,
      tty: c.tty || undefined,
    }));

    setRunLogs(["[START] Running batch containers..."]);
    setRunInProgress(true);
    setRunModalOpen(true);

    try {
      const res = await fetch("/api/docker/hub/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs: payload }),
      });

      if (!res.ok) {
        const text = await res.text();
        setRunLogs((prev) => [...prev, `[ERROR] Failed to start: ${text}`]);
        setRunInProgress(false);
        return;
      }

      if (!res.body) {
        setRunLogs((prev) => [
          ...prev,
          "[ERROR] No response body stream received.",
        ]);
        setRunInProgress(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.trim());
        setRunLogs((prev) => [...prev, ...lines]);
      }

      setRunInProgress(false);
      onRefreshSidebar();
    } catch (err: any) {
      setRunLogs((prev) => [
        ...prev,
        `[ERROR] ${err.message || "Failed to communicate with docker backend."}`,
      ]);
      setRunInProgress(false);
    }
  };

  return (
    <div
      className="docker-runner-wrap"
      style={{
        padding: "32px",
        overflowY: "auto",
        height: "100%",
        background: "var(--bg)",
      }}
    >
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "32px",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Launch Containers
          </h2>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              marginTop: "6px",
            }}
          >
            Configure and pull multiple containers concurrently or export a
            compiled <code>docker-compose.yml</code> file.
          </p>
        </div>
        <button
          className="control-btn start-btn"
          type="button"
          onClick={addConfig}
          style={{
            height: "36px",
            padding: "0 16px",
            fontSize: "0.82rem",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              width: 13,
              height: 13,
              marginRight: 5,
              verticalAlign: "middle",
            }}
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>{" "}
          Add Service
        </button>
      </div>

      {/* Container Cards List */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "28px",
          marginBottom: "40px",
        }}
      >
        {configs.map((config, cIdx) => (
          <div
            key={config.key}
            className="metric-card"
            style={{
              padding: "24px",
              border: "1px solid var(--line)",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              background: "var(--surface)",
              boxShadow: "var(--shadow-technical)",
              borderRadius: "var(--radius-lg)",
              overflow: "visible",
            }}
          >
            {/* Remove button */}
            {configs.length > 1 && (
              <button
                type="button"
                className="control-btn stop-btn"
                onClick={() => removeConfig(cIdx)}
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "20px",
                  padding: "6px 10px",
                  height: "28px",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
                title="Remove container config"
              >
                <TrashIcon size={12} style={{ marginRight: 5 }} /> Remove
              </button>
            )}

            <h3
              style={{
                margin: 0,
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--accent)",
                letterSpacing: "0.02em",
              }}
            >
              Container #{cIdx + 1}
            </h3>

            {/* Docker Hub Image Search (Integrated Click-Away stopPropagation) */}
            <div
              className="query-group"
              style={{ position: "relative" }}
              onClick={(e) => e.stopPropagation()}
            >
              <label
                htmlFor={`img-search-${cIdx}`}
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: "8px",
                  display: "block",
                }}
              >
                Image Search (Docker Hub)
              </label>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    id={`img-search-${cIdx}`}
                    type="text"
                    className="query-input"
                    placeholder="Search image (e.g. redis, postgres, nginx...)"
                    value={config.imageSearch}
                    onChange={(e) =>
                      updateConfig(cIdx, { imageSearch: e.target.value })
                    }
                    onFocus={() => {
                      if (config.searchResults.length > 0) {
                        updateConfig(cIdx, { showSearchDropdown: true });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        handleSearchImages(cIdx, config.imageSearch);
                    }}
                    style={{ width: "100%", height: "38px" }}
                  />
                  {/* Search Results Dropdown (Aligned with input width, floating on top) */}
                  {config.showSearchDropdown &&
                    config.searchResults.length > 0 && (
                      <div
                        className="dropdown-menu"
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          maxHeight: "220px",
                          overflowY: "auto",
                          width: "100%",
                          marginTop: "4px",
                          boxShadow: "var(--shadow-technical)",
                          background: "var(--surface-raised)",
                          border: "1px solid var(--line-strong)",
                          zIndex: 1000,
                        }}
                      >
                        {config.searchResults.map((r: any) => (
                          <button
                            key={r.repo_name}
                            onClick={() => handleSelectImage(cIdx, r.repo_name)}
                            className="dropdown-item"
                            type="button"
                            style={{
                              width: "100%",
                              border: "none",
                              justifyContent: "space-between",
                              padding: "10px 14px",
                              fontSize: "0.8rem",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: "var(--text)",
                                }}
                              >
                                {r.repo_name}
                              </span>
                              {r.is_official && (
                                <span
                                  className="badge accent"
                                  style={{
                                    fontSize: "8px",
                                    padding: "1px 4px",
                                  }}
                                >
                                  OFFICIAL
                                </span>
                              )}
                            </div>
                            <span
                              style={{
                                opacity: 0.5,
                                fontSize: "0.75rem",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              {r.star_count} ★
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => handleSearchImages(cIdx, config.imageSearch)}
                  style={{
                    height: "38px",
                    padding: "0 18px",
                    fontSize: "0.82rem",
                  }}
                  disabled={config.isSearching}
                >
                  {config.isSearching ? "Searching..." : "Search"}
                </button>
              </div>
            </div>

            {/* Selected Image Detail and Tag Selector */}
            {config.imageName && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 150px",
                  gap: "16px",
                }}
              >
                <div className="query-group">
                  <label
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "var(--text)",
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    Selected Image Name
                  </label>
                  <input
                    type="text"
                    className="query-input"
                    readOnly
                    value={config.imageName}
                    style={{
                      background: "var(--bg)",
                      color: "var(--accent)",
                      cursor: "default",
                      opacity: 0.9,
                    }}
                  />
                </div>

                <div className="query-group">
                  <label
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "var(--text)",
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    Version (Tag)
                  </label>
                  {config.isLoadingTags ? (
                    <div
                      style={{
                        fontSize: "0.8rem",
                        height: "36px",
                        display: "flex",
                        alignItems: "center",
                        color: "var(--text-muted)",
                      }}
                    >
                      Loading tags...
                    </div>
                  ) : (
                    <select
                      className="query-input"
                      value={config.selectedTag}
                      onChange={(e) =>
                        updateConfig(cIdx, { selectedTag: e.target.value })
                      }
                      style={{
                        height: "36px",
                        cursor: "pointer",
                        width: "100%",
                      }}
                    >
                      {config.tags.length === 0 && (
                        <option value="">latest</option>
                      )}
                      {config.tags.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            {/* Configuration Details Panel */}
            {config.imageName && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                  borderTop: "1px solid var(--line)",
                  paddingTop: "20px",
                }}
              >
                {/* Container Name */}
                <div className="query-group">
                  <label
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "var(--text)",
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    Container Name
                  </label>
                  <input
                    type="text"
                    className="query-input"
                    placeholder="e.g. app-database"
                    value={config.containerName}
                    onChange={(e) =>
                      updateConfig(cIdx, {
                        containerName: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_-]/g, ""),
                      })
                    }
                  />
                </div>

                {/* Ports Section */}
                <div className="query-group">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <label
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: "var(--text)",
                      }}
                    >
                      Port Bindings
                    </label>
                    <button
                      type="button"
                      className="logs-action-btn"
                      onClick={() => addPort(cIdx)}
                      style={{
                        fontSize: "0.75rem",
                        padding: "4px 8px",
                        cursor: "pointer",
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          width: 11,
                          height: 11,
                          marginRight: 4,
                          verticalAlign: "middle",
                        }}
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>{" "}
                      Add Port
                    </button>
                  </div>
                  {config.ports.length === 0 && (
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--text-muted)",
                        fontStyle: "italic",
                        padding: "4px 0",
                      }}
                    >
                      No ports configured.
                    </div>
                  )}
                  {config.ports.map((port, pIdx) => (
                    <div
                      key={pIdx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 90px 30px",
                        gap: "10px",
                        alignItems: "center",
                        marginBottom: "6px",
                      }}
                    >
                      <input
                        type="number"
                        className="query-input"
                        placeholder="Host Port (e.g. 6379)"
                        value={port.host}
                        onChange={(e) =>
                          updatePort(cIdx, pIdx, { host: e.target.value })
                        }
                        style={{ height: "32px", fontSize: "0.8rem" }}
                      />
                      <input
                        type="number"
                        className="query-input"
                        placeholder="Container Port (e.g. 6379)"
                        value={port.container}
                        onChange={(e) =>
                          updatePort(cIdx, pIdx, { container: e.target.value })
                        }
                        style={{ height: "32px", fontSize: "0.8rem" }}
                      />
                      <select
                        className="query-input"
                        value={port.protocol}
                        onChange={(e) =>
                          updatePort(cIdx, pIdx, {
                            protocol: e.target.value as "tcp" | "udp",
                          })
                        }
                        style={{
                          height: "32px",
                          fontSize: "0.8rem",
                          padding: "0 6px",
                        }}
                      >
                        <option value="tcp">TCP</option>
                        <option value="udp">UDP</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removePort(cIdx, pIdx)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--danger)",
                          cursor: "pointer",
                          fontSize: "1rem",
                        }}
                        title="Remove Port Mapping"
                      >
                        <CloseIcon size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Volumes Section */}
                <div className="query-group">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <label
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: "var(--text)",
                      }}
                    >
                      Volume Mounts (Binds)
                    </label>
                    <button
                      type="button"
                      className="logs-action-btn"
                      onClick={() => addVolume(cIdx)}
                      style={{
                        fontSize: "0.75rem",
                        padding: "4px 8px",
                        cursor: "pointer",
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          width: 11,
                          height: 11,
                          marginRight: 4,
                          verticalAlign: "middle",
                        }}
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>{" "}
                      Add Volume
                    </button>
                  </div>
                  {config.volumes.length === 0 && (
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--text-muted)",
                        fontStyle: "italic",
                        padding: "4px 0",
                      }}
                    >
                      No volumes configured.
                    </div>
                  )}
                  {config.volumes.map((vol, vIdx) => (
                    <div
                      key={vIdx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 30px",
                        gap: "10px",
                        alignItems: "center",
                        marginBottom: "6px",
                      }}
                    >
                      <input
                        type="text"
                        className="query-input"
                        placeholder="Host Path (Absolute, e.g. /opt/db/redis)"
                        value={vol.hostPath}
                        onChange={(e) =>
                          updateVolume(cIdx, vIdx, { hostPath: e.target.value })
                        }
                        style={{ height: "32px", fontSize: "0.8rem" }}
                      />
                      <input
                        type="text"
                        className="query-input"
                        placeholder="Container Path (e.g. /data)"
                        value={vol.containerPath}
                        onChange={(e) =>
                          updateVolume(cIdx, vIdx, {
                            containerPath: e.target.value,
                          })
                        }
                        style={{ height: "32px", fontSize: "0.8rem" }}
                      />
                      <button
                        type="button"
                        onClick={() => removeVolume(cIdx, vIdx)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--danger)",
                          cursor: "pointer",
                          fontSize: "1rem",
                        }}
                        title="Remove Volume Mount"
                      >
                        <CloseIcon size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Environment Variables Section */}
                <div className="query-group">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <label
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: "var(--text)",
                      }}
                    >
                      Environment Variables
                    </label>
                    <button
                      type="button"
                      className="logs-action-btn"
                      onClick={() => addEnv(cIdx)}
                      style={{
                        fontSize: "0.75rem",
                        padding: "4px 8px",
                        cursor: "pointer",
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          width: 11,
                          height: 11,
                          marginRight: 4,
                          verticalAlign: "middle",
                        }}
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>{" "}
                      Add Env Var
                    </button>
                  </div>
                  {config.env.length === 0 && (
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--text-muted)",
                        fontStyle: "italic",
                        padding: "4px 0",
                      }}
                    >
                      No environment variables.
                    </div>
                  )}
                  {config.env.map((ev, eIdx) => (
                    <div
                      key={eIdx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 30px",
                        gap: "10px",
                        alignItems: "center",
                        marginBottom: "6px",
                      }}
                    >
                      <input
                        type="text"
                        className="query-input"
                        placeholder="Variable Key (e.g. REDIS_PASSWORD)"
                        value={ev.key}
                        onChange={(e) =>
                          updateEnv(cIdx, eIdx, { key: e.target.value })
                        }
                        style={{ height: "32px", fontSize: "0.8rem" }}
                      />
                      <input
                        type="text"
                        className="query-input"
                        placeholder="Variable Value"
                        value={ev.value}
                        onChange={(e) =>
                          updateEnv(cIdx, eIdx, { value: e.target.value })
                        }
                        style={{ height: "32px", fontSize: "0.8rem" }}
                      />
                      <button
                        type="button"
                        onClick={() => removeEnv(cIdx, eIdx)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--danger)",
                          cursor: "pointer",
                          fontSize: "1rem",
                        }}
                        title="Remove Env Var"
                      >
                        <CloseIcon size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Advanced Startup Commands */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr",
                    gap: "20px",
                    borderTop: "1px solid var(--line)",
                    paddingTop: "16px",
                  }}
                >
                  <div className="query-group">
                    <label
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: "var(--text)",
                        marginBottom: "6px",
                        display: "block",
                      }}
                    >
                      Command Override (Optional)
                    </label>
                    <input
                      type="text"
                      className="query-input"
                      placeholder="e.g. tail -f /dev/null"
                      value={config.command || ""}
                      onChange={(e) =>
                        updateConfig(cIdx, { command: e.target.value })
                      }
                      style={{ height: "32px", fontSize: "0.8rem" }}
                    />
                  </div>

                  <div
                    className="query-group"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        userSelect: "none",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: "var(--text)",
                        marginTop: "16px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={config.tty || false}
                        onChange={(e) =>
                          updateConfig(cIdx, { tty: e.target.checked })
                        }
                        style={{
                          cursor: "pointer",
                          width: "16px",
                          height: "16px",
                          accentColor: "var(--accent)",
                        }}
                      />
                      <span>Keep Alive (TTY/-it)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sticky Bottom Actions Footer */}
      <div
        style={{
          borderTop: "1px solid var(--line)",
          paddingTop: "24px",
          display: "flex",
          justifyContent: "flex-end",
          gap: "16px",
        }}
      >
        <button
          className="control-btn restart-btn"
          type="button"
          onClick={handleComposeClick}
          style={{
            height: "42px",
            padding: "0 24px",
            fontSize: "0.85rem",
            fontWeight: 700,
          }}
        >
          <FileCodeIcon
            size={14}
            style={{ marginRight: 7, verticalAlign: "middle" }}
          />{" "}
          Generate Compose File
        </button>
        <button
          className="control-btn start-btn"
          type="button"
          onClick={handleRunContainers}
          style={{
            height: "42px",
            padding: "0 28px",
            fontSize: "0.85rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <RocketIcon size={14} style={{ marginRight: 8 }} /> Launch Containers
        </button>
      </div>

      {/* DOCKER COMPOSE GENERATION MODAL */}
      {composeModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            className="metric-card"
            style={{
              width: "100%",
              maxWidth: "680px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              border: "1px solid var(--line-strong)",
              background: "var(--surface)",
              boxShadow: "var(--shadow-technical)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>
                Generated docker-compose.yml
              </h3>
              <button
                type="button"
                onClick={() => setComposeModalOpen(false)}
                style={{
                  background: "transparent",
                  color: "var(--text-muted)",
                  border: "none",
                  fontSize: "1.4rem",
                  cursor: "pointer",
                }}
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <pre
              style={{
                background: "var(--bg)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                padding: "16px",
                fontFamily: "var(--font-mono)",
                fontSize: "0.85rem",
                color: "var(--accent)",
                maxHeight: "360px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                textAlign: "left",
              }}
            >
              {composeYaml}
            </pre>

            {saveStatus && (
              <div
                style={{
                  fontSize: "0.82rem",
                  color: saveError ? "var(--danger)" : "var(--success)",
                  padding: "10px 14px",
                  background: saveError
                    ? "rgba(255, 69, 58, 0.05)"
                    : "rgba(50, 215, 75, 0.05)",
                  border: `1px solid ${saveError ? "rgba(255, 69, 58, 0.2)" : "rgba(50, 215, 75, 0.2)"}`,
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {saveStatus}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                marginTop: "8px",
              }}
            >
              <button
                type="button"
                className="logs-action-btn"
                onClick={copyComposeToClipboard}
                style={{
                  height: "36px",
                  padding: "0 16px",
                  fontSize: "0.8rem",
                }}
              >
                <CopyIcon size={13} style={{ marginRight: 6 }} /> Copy Code
              </button>
              <button
                type="button"
                className="logs-action-btn"
                onClick={saveComposeToWorkspace}
                style={{
                  height: "36px",
                  padding: "0 16px",
                  fontSize: "0.8rem",
                }}
              >
                <SaveIcon size={13} style={{ marginRight: 6 }} /> Save Compose
                File
              </button>
              <button
                type="button"
                className="control-btn stop-btn"
                onClick={() => setComposeModalOpen(false)}
                style={{
                  padding: "0 16px",
                  height: "36px",
                  fontSize: "0.82rem",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RUN EXECUTION PROGRESS MODAL */}
      {runModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            className="metric-card"
            style={{
              width: "100%",
              maxWidth: "680px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              border: "1px solid var(--line-strong)",
              background: "var(--surface)",
              boxShadow: "var(--shadow-technical)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>
                {runInProgress ? (
                  <>
                    <RefreshIcon
                      size={15}
                      style={{
                        marginRight: 8,
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    Running Container Build Tasks...
                  </>
                ) : (
                  "Execution Finished"
                )}
              </h3>
              {!runInProgress && (
                <button
                  type="button"
                  onClick={() => setRunModalOpen(false)}
                  style={{
                    background: "transparent",
                    color: "var(--text-muted)",
                    border: "none",
                    fontSize: "1.4rem",
                    cursor: "pointer",
                  }}
                >
                  <CloseIcon size={16} />
                </button>
              )}
            </div>

            <div
              style={{
                background: "var(--bg)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                padding: "16px",
                fontFamily: "var(--font-mono)",
                fontSize: "0.82rem",
                color: "var(--text)",
                height: "300px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              {runLogs.map((log, idx) => {
                let color = "var(--text)";
                if (log.startsWith("[ERROR]")) color = "var(--danger)";
                else if (log.startsWith("[SUCCESS]")) color = "var(--success)";
                else if (log.startsWith("[COMPLETE]")) color = "var(--success)";
                else if (log.startsWith("[INFO]")) color = "var(--accent)";

                return (
                  <div key={idx} style={{ color }}>
                    {log}
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "8px",
              }}
            >
              <button
                type="button"
                className="control-btn stop-btn"
                onClick={() => setRunModalOpen(false)}
                disabled={runInProgress}
                style={{
                  padding: "0 20px",
                  height: "36px",
                  fontSize: "0.82rem",
                }}
              >
                {runInProgress ? "Processing builds..." : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

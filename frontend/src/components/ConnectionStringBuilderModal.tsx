import React, { useState, useEffect, useRef } from "react";

interface ConnectionStringBuilderModalProps {
  onClose: () => void;
}

type Protocol =
  | "postgres"
  | "mongodb"
  | "mongodb+srv"
  | "mysql"
  | "sqlite"
  | "mssql"
  | "redis";

const DEFAULT_PORTS: Record<Protocol, string> = {
  postgres: "5432",
  mongodb: "27017",
  "mongodb+srv": "",
  mysql: "3306",
  sqlite: "",
  mssql: "1433",
  redis: "6379",
};

const DEFAULT_USERS: Record<Protocol, string> = {
  postgres: "postgres",
  mongodb: "",
  "mongodb+srv": "",
  mysql: "root",
  sqlite: "",
  mssql: "sa",
  redis: "",
};

export default function ConnectionStringBuilderModal({
  onClose,
}: ConnectionStringBuilderModalProps) {
  const [protocol, setProtocol] = useState<Protocol>("postgres");
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState("5432");
  const [user, setUser] = useState("postgres");
  const [password, setPassword] = useState("");
  const [database, setDatabase] = useState("app");
  const [filePath, setFilePath] = useState("./data/app.sqlite");
  const [ssl, setSsl] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  // Auto-fill defaults when protocol changes
  useEffect(() => {
    setPort(DEFAULT_PORTS[protocol]);
    setUser(DEFAULT_USERS[protocol]);
    if (protocol === "sqlite") {
      setDatabase("");
    } else if (database === "") {
      setDatabase("app");
    }
  }, [protocol]);

  // Generate connection string
  const generateConnectionString = (): string => {
    const encodedUser = encodeURIComponent(user);
    const encodedPass = encodeURIComponent(password);
    const credentials = encodedUser
      ? `${encodedUser}${encodedPass ? ":" + encodedPass : ""}`
      : "";

    switch (protocol) {
      case "sqlite":
        return `sqlite:${filePath}`;
      case "mongodb+srv":
        return `mongodb+srv://${credentials ? credentials + "@" : ""}${host}/${database}`;
      case "redis":
        const redisCreds = password ? `:${encodedPass}@` : "";
        return `redis://${redisCreds}${host}${port ? ":" + port : ""}`;
      case "postgres":
        const pgSsl = ssl ? "?sslmode=require" : "";
        return `postgres://${credentials ? credentials + "@" : ""}${host}:${port}/${database}${pgSsl}`;
      default:
        return `${protocol}://${credentials ? credentials + "@" : ""}${host}:${port}/${database}`;
    }
  };

  const connectionString = generateConnectionString();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(connectionString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  // Close on clicking outside modal content
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content glass" ref={modalRef}>
        <div className="modal-header">
          <h3>Connection String Builder</h3>
          <button
            className="close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="protocol">Database Type</label>
            <select
              id="protocol"
              value={protocol}
              onChange={(e) => setProtocol(e.target.value as Protocol)}
            >
              <option value="postgres">PostgreSQL / CockroachDB</option>
              <option value="mongodb">MongoDB</option>
              <option value="mongodb+srv">MongoDB (Atlas / DNS SRV)</option>
              <option value="mysql">MySQL / MariaDB</option>
              <option value="sqlite">SQLite</option>
              <option value="mssql">Microsoft SQL Server</option>
              <option value="redis">Redis</option>
            </select>
          </div>

          {protocol === "sqlite" ? (
            <div className="form-group">
              <label htmlFor="filePath">SQLite Database File Path</label>
              <input
                id="filePath"
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="./data/app.sqlite"
              />
            </div>
          ) : (
            <>
              <div className="form-row">
                <div className="form-group flex-2">
                  <label htmlFor="host">Host</label>
                  <input
                    id="host"
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="localhost"
                  />
                </div>
                {protocol !== "mongodb+srv" && (
                  <div className="form-group flex-1">
                    <label htmlFor="port">Port</label>
                    <input
                      id="port"
                      type="text"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      placeholder={DEFAULT_PORTS[protocol]}
                    />
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="user">Username</label>
                  <input
                    id="user"
                    type="text"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="Username"
                  />
                </div>
                <div className="form-group password-group">
                  <label htmlFor="password">Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="database">Database Name</label>
                <input
                  id="database"
                  type="text"
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  placeholder="app"
                />
              </div>

              {protocol === "postgres" && (
                <div className="form-checkbox">
                  <input
                    id="ssl"
                    type="checkbox"
                    checked={ssl}
                    onChange={(e) => setSsl(e.target.checked)}
                  />
                  <label htmlFor="ssl">Require SSL (?sslmode=require)</label>
                </div>
              )}
            </>
          )}

          <div className="preview-section">
            <span className="section-label">Generated Connection URI</span>
            <div className="preview-box">
              <code className="connection-string-code">{connectionString}</code>
            </div>
            <span className="copy-tip">
              Copy and paste this into your local `.env` file as `DATABASE_URL`
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="icon-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="reload-btn" onClick={handleCopy}>
            {copied ? "Copied! ✓" : "Copy Connection URI"}
          </button>
        </div>
      </div>
    </div>
  );
}

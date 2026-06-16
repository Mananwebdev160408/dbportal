import { useState } from "react";
import EmptyState from "../EmptyState";

interface DocumentsViewProps {
  rows: Record<string, unknown>[];
  maskSensitive?: boolean;
}

const SENSITIVE_KEYS = ["password", "token", "secret"];

const isSensitiveKey = (key: string): boolean =>
  SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k));

const maskObject = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(maskObject);
  }
  if (typeof obj === "object") {
    const masked: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (isSensitiveKey(key)) {
        masked[key] = "*****";
      } else if (typeof val === "object" && val !== null) {
        masked[key] = maskObject(val);
      } else {
        masked[key] = val;
      }
    }
    return masked;
  }
  return obj;
};

function DocumentCard({
  row,
  index,
}: {
  row: Record<string, unknown>;
  index: number;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = JSON.stringify(row, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <article className="doc-card">
      <div className="doc-header">
        <span style={{ fontFamily: "var(--font-mono)" }}>
          Record {index + 1}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="copy-card-btn"
          aria-label="Copy record content"
        >
          {copied ? (
            <>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: "12px", height: "12px" }}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Copied</span>
            </>
          ) : (
            <>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: "12px", height: "12px" }}
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="doc-body">{JSON.stringify(row, null, 2)}</pre>
    </article>
  );
}

export default function DocumentsView({
  rows,
  maskSensitive = false,
}: DocumentsViewProps) {
  if (!rows.length) {
    return (
      <EmptyState>
        <p>No records found in this table.</p>
      </EmptyState>
    );
  }

  const displayRows = maskSensitive ? rows.map(maskObject) : rows;

  return (
    <div className="doc-grid">
      {displayRows.map((row, index) => (
        <DocumentCard key={index} row={row} index={index} />
      ))}
    </div>
  );
}

import { useState } from "react";

interface JsonViewProps {
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

const CopyIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function JsonView({
  rows,
  maskSensitive = false,
}: JsonViewProps) {
  const [copied, setCopied] = useState(false);

  const displayRows = maskSensitive ? rows.map(maskObject) : rows;
  const jsonString = JSON.stringify(displayRows, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString).catch( => console.error());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="json-container"
      style={{ position: "relative", height: "100%" }}
    >
      <button
        className={`copy-btn${copied ? " copied" : ""}`}
        onClick={handleCopy}
        type="button"
        aria-label="Copy JSON to clipboard"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        <span>{copied ? "COPIED" : "COPY_JSON"}</span>
      </button>
      <pre className="json-view">{jsonString}</pre>
    </div>
  );
}

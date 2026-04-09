import { useState } from 'react';

interface JsonViewProps {
  rows: Record<string, unknown>[];
}

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default function JsonView({ rows }: JsonViewProps) {
  const [copied, setCopied] = useState(false);
  const jsonString = JSON.stringify(rows, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="json-container" style={{ position: 'relative', height: '100%' }}>
      <button 
        className={`copy-btn${copied ? ' copied' : ''}`}
        onClick={handleCopy}
        type="button"
        aria-label="Copy JSON to clipboard"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        <span>{copied ? 'COPIED' : 'COPY_JSON'}</span>
      </button>
      <pre className="json-view">{jsonString}</pre>
    </div>
  );
}

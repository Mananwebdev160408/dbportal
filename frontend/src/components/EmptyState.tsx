import type { ReactNode } from "react";
import { RefreshIcon } from "./Icons";

interface EmptyStateProps {
  children: ReactNode;
  onRetry?: () => void;
}

export default function EmptyState({ children, onRetry }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {children}
      {onRetry && (
        <button className="retry-btn" onClick={onRetry}>
          <RefreshIcon size={13} style={{ marginRight: 6 }} />
          Retry
        </button>
      )}
    </div>
  );
}

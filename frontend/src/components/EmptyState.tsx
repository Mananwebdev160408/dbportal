import type { ReactNode } from "react";

interface EmptyStateProps {
  children: ReactNode;
  onRetry?: () => void;
}

export default function EmptyState({ children, onRetry }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {children}
      {onRetry && (
        <button
          className="retry-btn"
          onClick={onRetry}
        >
          🔄 Retry
        </button>
      )}
    </div>
  );
}
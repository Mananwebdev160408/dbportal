import type { ReactNode } from 'react';

interface EmptyStateProps {
  children: ReactNode;
}

export default function EmptyState({ children }: EmptyStateProps) {
  return <div className="empty-state">{children}</div>;
}

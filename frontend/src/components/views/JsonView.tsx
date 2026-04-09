interface JsonViewProps {
  rows: Record<string, unknown>[];
}

export default function JsonView({ rows }: JsonViewProps) {
  return <pre className="json-view">{JSON.stringify(rows, null, 2)}</pre>;
}

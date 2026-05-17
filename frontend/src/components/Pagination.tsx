interface PaginationProps {
  offset: number;
  pageSize: number;
  dataLength: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function Pagination({
  offset,
  pageSize,
  dataLength,
  onPrev,
  onNext,
}: PaginationProps) {
  const isFirstPage = offset === 0;
  const isLastPage = dataLength < pageSize;
  const currentPage = Math.floor(offset / pageSize) + 1;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "1rem",
        padding: "1rem",
      }}
    >
      <button
        onClick={onPrev}
        disabled={isFirstPage}
        style={{
          padding: "0.4rem 1.2rem",
          cursor: isFirstPage ? "not-allowed" : "pointer",
          borderRadius: "6px",
          border: "1px solid currentColor",
          background: "transparent",
          opacity: isFirstPage ? 0.4 : 1,
        }}
      >
        Prev
      </button>
      <span style={{ fontSize: "0.85rem", opacity: 0.6 }}>
        Page {currentPage}
      </span>
      <button
        onClick={onNext}
        disabled={isLastPage}
        style={{
          padding: "0.4rem 1.2rem",
          cursor: isLastPage ? "not-allowed" : "pointer",
          borderRadius: "6px",
          border: "1px solid currentColor",
          background: "transparent",
          opacity: isLastPage ? 0.4 : 1,
        }}
      >
        Next
      </button>
    </div>
  );
}
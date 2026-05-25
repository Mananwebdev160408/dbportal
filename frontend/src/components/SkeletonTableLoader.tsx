/**
 * SkeletonTableLoader — shows animated gray placeholder rows
 * while table data is being fetched, matching the real table layout.
 */

interface SkeletonTableLoaderProps {
  rows?: number
  columns?: number
}

export default function SkeletonTableLoader({
  rows = 8,
  columns = 5,
}: SkeletonTableLoaderProps) {
  return (
    <div className="table-view-container">
      <div className="table-responsive-wrapper" style={{ minWidth: '100%', width: 'max-content' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>
                <div className="skeleton-cell" style={{ width: '30px' }} />
              </th>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i}>
                  <div className="skeleton-cell" style={{ width: `${60 + (i % 3) * 20}px` }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx}>
                <td>
                  <div className="skeleton-cell" style={{ width: '30px' }} />
                </td>
                {Array.from({ length: columns }).map((_, colIdx) => (
                  <td key={colIdx}>
                    <div
                      className="skeleton-cell"
                      style={{ width: `${50 + ((rowIdx + colIdx) % 4) * 25}px` }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
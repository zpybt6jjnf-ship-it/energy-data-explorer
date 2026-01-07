interface DataSource {
  label: string
  description: string
  url: string
}

interface SourceInfoProps {
  sources: DataSource[]
  yearsAvailable?: number[]
  lastUpdated?: string
}

/**
 * Displays data source attribution with coverage period and last updated date.
 */
export default function SourceInfo({ sources, yearsAvailable, lastUpdated }: SourceInfoProps) {
  // Format the years range
  const yearsRange = yearsAvailable && yearsAvailable.length > 0
    ? `${Math.min(...yearsAvailable)}–${Math.max(...yearsAvailable)}`
    : null

  // Format the last updated date
  const formattedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : null

  return (
    <div className="source-info">
      <strong>Data Sources</strong>
      <ul>
        {sources.map((source, idx) => (
          <li key={idx}>
            <span className="source-label">{source.label}</span> — {source.description}{' '}
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              (source)
            </a>
          </li>
        ))}
      </ul>
      <div className="source-meta">
        {yearsRange && (
          <span className="source-coverage">
            Data coverage: <strong>{yearsRange}</strong>
          </span>
        )}
        {formattedDate && (
          <span className="source-updated">
            Last updated: <strong>{formattedDate}</strong>
          </span>
        )}
      </div>
    </div>
  )
}

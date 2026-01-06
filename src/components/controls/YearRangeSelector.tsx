interface Props {
  yearStart: number
  yearEnd: number
  yearsAvailable: number[]
  onChange: (updates: { yearStart?: number; yearEnd?: number }) => void
  /** Show as inline row (default) or stacked */
  layout?: 'inline' | 'stacked'
}

/**
 * Reusable year range selector with start and end dropdowns.
 */
export default function YearRangeSelector({
  yearStart,
  yearEnd,
  yearsAvailable,
  onChange,
  layout = 'inline'
}: Props) {
  if (layout === 'stacked') {
    return (
      <>
        <div className="control-group">
          <label>Start Year</label>
          <select
            value={yearStart}
            onChange={(e) => onChange({ yearStart: parseInt(e.target.value) })}
          >
            {yearsAvailable.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>End Year</label>
          <select
            value={yearEnd}
            onChange={(e) => onChange({ yearEnd: parseInt(e.target.value) })}
          >
            {yearsAvailable.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </>
    )
  }

  // Inline layout (default)
  return (
    <div className="control-group">
      <label>Years</label>
      <div className="year-range">
        <select
          value={yearStart}
          onChange={(e) => onChange({ yearStart: parseInt(e.target.value) })}
          aria-label="Start year"
        >
          {yearsAvailable.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <span className="year-separator">–</span>
        <select
          value={yearEnd}
          onChange={(e) => onChange({ yearEnd: parseInt(e.target.value) })}
          aria-label="End year"
        >
          {yearsAvailable.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

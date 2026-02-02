import { StateDataPoint } from '../../types'
import { downloadCSV, downloadJSON } from '../../utils/exportUtils'

interface Props {
  /** Full dataset for CSV/JSON export */
  data: StateDataPoint[]
  /** Filename prefix (without extension) */
  filename: string
  /** Which formats to show (default: CSV and JSON) */
  formats?: ('csv' | 'json')[]
  /** Label for the control group */
  label?: string
}

/**
 * Reusable export buttons for downloading data as CSV or JSON.
 */
export default function ExportButtons({
  data,
  filename,
  formats = ['csv', 'json'],
  label = 'Export'
}: Props) {
  return (
    <div className="control-group">
      <label>{label}</label>
      <div className="button-group">
        {formats.includes('csv') && (
          <button
            onClick={() => downloadCSV(data, filename)}
            title="Download full dataset as CSV"
          >
            CSV
          </button>
        )}
        {formats.includes('json') && (
          <button
            onClick={() => downloadJSON(data, filename)}
            title="Download full dataset as JSON"
          >
            JSON
          </button>
        )}
      </div>
    </div>
  )
}

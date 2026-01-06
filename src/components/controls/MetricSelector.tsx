import { MetricOption } from '../../types/chartConfig'

interface Props {
  value: string
  options: MetricOption[]
  onChange: (value: string) => void
  /** Label for the control group */
  label?: string
  /** Show hint text below selector */
  showHint?: boolean
}

/**
 * Reusable metric selector dropdown with optional hint text.
 */
export default function MetricSelector({
  value,
  options,
  onChange,
  label = 'Measure',
  showHint = true
}: Props) {
  const currentOption = options.find(opt => opt.value === value)

  return (
    <div className="control-group">
      <label>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title={currentOption?.description}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.shortLabel || option.label}
          </option>
        ))}
      </select>
      {showHint && currentOption && (
        <span className="control-hint">{currentOption.description}</span>
      )}
    </div>
  )
}

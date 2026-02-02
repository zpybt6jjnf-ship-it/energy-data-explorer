import { useMemo, useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import { UtilityData } from '../../types'
import { COLORS, baseLayout, axisStyle, axisTitleStyle, baseConfig } from '../../utils/plotly'
import { downloadGenericCSV, downloadGenericJSON } from '../../utils/exportUtils'
import { ChartControlsWrapper } from '../controls'

interface Props {
  yearStart: number
  yearEnd: number
  reliabilityMetric: 'saidi' | 'saifi'
  includeMED: boolean
  yearsAvailable: number[]
  onYearStartChange: (year: number) => void
  onYearEndChange: (year: number) => void
  onMetricChange: (metric: 'saidi' | 'saifi') => void
  onIncludeMEDChange: (include: boolean) => void
}

// Colors for each ownership type
const OWNERSHIP_COLORS: Record<string, string> = {
  'Investor Owned': '#e41a1c',
  'Cooperative': '#377eb8',
  'Municipal': '#4daf4a',
  'Political Subdivision': '#984ea3',
  'State': '#ff7f00',
  'Federal': '#a65628',
  'Other': '#999999'
}

/**
 * Box plot showing distribution of reliability metrics across utility ownership types.
 */
export default function OwnershipBoxPlot({
  yearStart,
  yearEnd,
  reliabilityMetric,
  includeMED,
  yearsAvailable,
  onYearStartChange,
  onYearEndChange,
  onMetricChange,
  onIncludeMEDChange
}: Props) {
  const [utilityData, setUtilityData] = useState<UtilityData | null>(null)
  const [loading, setLoading] = useState(true)

  // Load utility data
  useEffect(() => {
    fetch('/data/utilities.json')
      .then(res => res.json())
      .then(data => {
        setUtilityData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load utility data:', err)
        setLoading(false)
      })
  }, [])

  // Filter utilities by year range and get reliability values
  const filteredData = useMemo(() => {
    if (!utilityData) return []

    return utilityData.utilities
      .filter(u => {
        const yearMatch = u.year >= yearStart && u.year <= yearEnd
        const hasMetric = includeMED
          ? (reliabilityMetric === 'saidi' ? u.saidiWithMED ?? u.saidi : u.saifiWithMED ?? u.saifi) !== null
          : u[reliabilityMetric] !== null
        return yearMatch && hasMetric
      })
      .map(u => {
        const value = includeMED
          ? (reliabilityMetric === 'saidi' ? u.saidiWithMED ?? u.saidi : u.saifiWithMED ?? u.saifi)
          : u[reliabilityMetric]
        return {
          ownership: u.ownership,
          value: value as number,
          utilityName: u.utilityName,
          state: u.state,
          year: u.year
        }
      })
  }, [utilityData, yearStart, yearEnd, reliabilityMetric, includeMED])

  // Group by ownership type for box plot
  const ownershipGroups = useMemo(() => {
    const groups = new Map<string, number[]>()

    filteredData.forEach(d => {
      if (!groups.has(d.ownership)) {
        groups.set(d.ownership, [])
      }
      groups.get(d.ownership)!.push(d.value)
    })

    // Sort by median for visual clarity
    return Array.from(groups.entries())
      .map(([ownership, values]) => ({
        ownership,
        values,
        median: values.sort((a, b) => a - b)[Math.floor(values.length / 2)],
        count: values.length
      }))
      .sort((a, b) => a.median - b.median)
  }, [filteredData])

  const metricLabel = reliabilityMetric === 'saidi' ? 'Outage Duration (SAIDI)' : 'Outage Frequency (SAIFI)'
  const unit = reliabilityMetric === 'saidi' ? 'minutes' : 'interruptions'

  // Build box plot traces
  const plotData = useMemo(() => {
    return ownershipGroups.map(group => ({
      type: 'box' as const,
      y: group.values,
      name: `${group.ownership} (${group.count})`,
      boxpoints: 'outliers' as const,
      jitter: 0.3,
      pointpos: 0,
      marker: {
        color: OWNERSHIP_COLORS[group.ownership] || OWNERSHIP_COLORS['Other'],
        size: 4,
        opacity: 0.5
      },
      line: {
        color: COLORS.ink,
        width: 1.5
      },
      fillcolor: OWNERSHIP_COLORS[group.ownership] || OWNERSHIP_COLORS['Other'],
      hoverinfo: 'y+name' as const
    }))
  }, [ownershipGroups])

  const layout = useMemo(() => ({
    ...baseLayout,
    title: { text: '' },
    yaxis: {
      ...axisStyle,
      title: { text: `${metricLabel} (${unit})`, ...axisTitleStyle },
      zeroline: true,
      zerolinecolor: COLORS.inkMuted
    },
    xaxis: {
      ...axisStyle,
      title: { text: 'Utility Ownership Type', ...axisTitleStyle },
      tickangle: -30
    },
    showlegend: false,
    boxmode: 'group' as const
  }), [metricLabel, unit])

  const plotConfig = {
    ...baseConfig,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: `ownership-reliability-${yearStart}-${yearEnd}`,
      height: 700,
      width: 1000,
      scale: 2
    }
  }

  // Export data - aggregate stats per ownership type
  const exportData = ownershipGroups.map(g => {
    const sorted = [...g.values].sort((a, b) => a - b)
    const q1 = sorted[Math.floor(sorted.length * 0.25)]
    const median = sorted[Math.floor(sorted.length * 0.5)]
    const q3 = sorted[Math.floor(sorted.length * 0.75)]
    const mean = g.values.reduce((s, v) => s + v, 0) / g.values.length
    const min = sorted[0]
    const max = sorted[sorted.length - 1]

    return {
      ownership: g.ownership,
      count: g.count,
      min,
      q1,
      median,
      mean: Math.round(mean * 100) / 100,
      q3,
      max
    }
  })

  if (loading) {
    return (
      <div className="chart-container">
        <div className="loading">Loading utility data...</div>
      </div>
    )
  }

  return (
    <div className="chart-container" role="figure" aria-label={`Box plot showing ${metricLabel} distribution across utility ownership types.`}>
      <div className="chart-header">
        <h2>Reliability by Ownership Type</h2>
        <p>
          How does grid reliability compare across different types of utilities?
          See the distribution of {reliabilityMetric === 'saidi' ? 'outage duration' : 'outage frequency'} by ownership.
        </p>
      </div>

      <details className="chart-description" open>
        <summary>About this chart</summary>
        <div className="chart-description-content">
          <div className="description-section">
            <h3>Ownership Types</h3>
            <dl>
              <div>
                <dt>Investor Owned (IOU)</dt>
                <dd>Privately owned utilities that operate for profit, typically the largest utilities</dd>
              </div>
              <div>
                <dt>Cooperative</dt>
                <dd>Member-owned utilities, often serving rural areas</dd>
              </div>
              <div>
                <dt>Municipal</dt>
                <dd>City or town-owned utilities, often in urban areas</dd>
              </div>
              <div>
                <dt>Other types</dt>
                <dd>Includes state, federal, and political subdivision utilities</dd>
              </div>
            </dl>
          </div>
          <div className="description-section">
            <h3>How to read box plots</h3>
            <p>
              The box shows the middle 50% of values (interquartile range). The line inside
              is the median. Whiskers extend to values within 1.5x the IQR. Individual dots
              are outliers beyond the whiskers.
            </p>
          </div>
        </div>
      </details>

      <ChartControlsWrapper
        advancedContent={
          <div className="control-group">
            <label>&nbsp;</label>
            <label className="checkbox-label" title="Include data from Major Event Days">
              <input
                type="checkbox"
                checked={includeMED}
                onChange={(e) => onIncludeMEDChange(e.target.checked)}
              />
              Include Major Events
            </label>
          </div>
        }
        advancedLabel="Advanced"
      >
        <div className="control-group">
          <label>Start Year</label>
          <select
            value={yearStart}
            onChange={(e) => onYearStartChange(parseInt(e.target.value))}
          >
            {yearsAvailable
              .filter(y => y <= yearEnd)
              .map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
          </select>
        </div>

        <div className="control-group">
          <label>End Year</label>
          <select
            value={yearEnd}
            onChange={(e) => onYearEndChange(parseInt(e.target.value))}
          >
            {yearsAvailable
              .filter(y => y >= yearStart)
              .map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
          </select>
        </div>

        <div className="control-group">
          <label>Measure</label>
          <select
            value={reliabilityMetric}
            onChange={(e) => onMetricChange(e.target.value as 'saidi' | 'saifi')}
          >
            <option value="saidi">Duration (SAIDI)</option>
            <option value="saifi">Frequency (SAIFI)</option>
          </select>
        </div>

        <div className="control-group">
          <label>Export</label>
          <div className="button-group">
            <button onClick={() => downloadGenericCSV(exportData, `ownership-reliability-${yearStart}-${yearEnd}`)}>
              CSV
            </button>
            <button onClick={() => downloadGenericJSON(exportData, `ownership-reliability-${yearStart}-${yearEnd}`)}>
              JSON
            </button>
          </div>
        </div>
      </ChartControlsWrapper>

      <div className="stats-panel">
        <div className="stats-summary">
          <p className="summary-main">
            Showing {filteredData.length.toLocaleString()} utility-years across {ownershipGroups.length} ownership types
            ({yearStart}–{yearEnd})
          </p>
        </div>
      </div>

      <div className="chart-plot-wrapper">
        <Plot
          data={plotData}
          layout={layout}
          config={plotConfig}
          style={{ width: '100%', height: '500px' }}
        />
      </div>
    </div>
  )
}

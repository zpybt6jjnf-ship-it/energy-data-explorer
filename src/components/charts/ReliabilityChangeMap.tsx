import { useMemo, useState } from 'react'
import Plot from 'react-plotly.js'
import { ChartData, StateDataPoint } from '../../types'
import { COLORS, baseLayout, baseConfig } from '../../utils/plotly'
import { downloadGenericCSV, downloadGenericJSON } from '../../utils/exportUtils'
import { ChartControlsWrapper } from '../controls'

interface Props {
  data: ChartData
  yearStart: number
  yearEnd: number
  reliabilityMetric: 'saidi' | 'saifi'
  includeMED: boolean
  onYearStartChange: (year: number) => void
  onYearEndChange: (year: number) => void
  onMetricChange: (metric: 'saidi' | 'saifi') => void
  onIncludeMEDChange: (include: boolean) => void
}

interface StateChange {
  stateCode: string
  state: string
  change: number
  percentChange: number
  startValue: number
  endValue: number
}

/**
 * Choropleth map showing year-over-year reliability change by state.
 * Green = improved (lower SAIDI/SAIFI), Red = degraded (higher SAIDI/SAIFI)
 */
export default function ReliabilityChangeMap({
  data,
  yearStart,
  yearEnd,
  reliabilityMetric,
  includeMED,
  onYearStartChange,
  onYearEndChange,
  onMetricChange,
  onIncludeMEDChange
}: Props) {
  const [showPercentChange, setShowPercentChange] = useState(false)

  // Helper to get reliability value from a point (handles MED toggle)
  const getReliabilityValue = (point: StateDataPoint): number | null => {
    if (includeMED) {
      const withMEDKey = reliabilityMetric === 'saidi' ? 'saidiWithMED' : 'saifiWithMED'
      const withMEDValue = point[withMEDKey] as number | null
      if (withMEDValue !== null) return withMEDValue
    }
    return point[reliabilityMetric] as number | null
  }

  // Calculate per-state changes between yearStart and yearEnd
  const stateChanges = useMemo((): StateChange[] => {
    const changes: StateChange[] = []
    const states = [...new Set(data.points.map(p => p.stateCode))]

    for (const stateCode of states) {
      const startPoint = data.points.find(p => p.stateCode === stateCode && p.year === yearStart)
      const endPoint = data.points.find(p => p.stateCode === stateCode && p.year === yearEnd)

      if (!startPoint || !endPoint) continue

      const startValue = getReliabilityValue(startPoint)
      const endValue = getReliabilityValue(endPoint)

      if (startValue === null || endValue === null) continue

      const change = endValue - startValue
      const percentChange = startValue !== 0 ? ((endValue - startValue) / startValue) * 100 : 0

      changes.push({
        stateCode,
        state: startPoint.state,
        change,
        percentChange,
        startValue,
        endValue
      })
    }

    return changes
  }, [data.points, yearStart, yearEnd, reliabilityMetric, includeMED])

  const metricLabel = reliabilityMetric === 'saidi' ? 'SAIDI' : 'SAIFI'
  const unit = reliabilityMetric === 'saidi' ? 'min' : 'interruptions'

  // Calculate color scale bounds (symmetric around zero)
  const maxAbsChange = useMemo(() => {
    if (stateChanges.length === 0) return 50
    const values = showPercentChange
      ? stateChanges.map(s => Math.abs(s.percentChange))
      : stateChanges.map(s => Math.abs(s.change))
    return Math.max(...values, 1) // At least 1 to avoid division issues
  }, [stateChanges, showPercentChange])

  // Build the choropleth trace
  const plotData = useMemo(() => {
    const values = showPercentChange
      ? stateChanges.map(s => s.percentChange)
      : stateChanges.map(s => s.change)

    const hoverText = stateChanges.map(s => {
      const changeSign = s.change > 0 ? '+' : ''
      const percentSign = s.percentChange > 0 ? '+' : ''
      const improved = s.change < 0 ? 'Improved' : s.change > 0 ? 'Degraded' : 'No change'
      return [
        `<b>${s.state}</b>`,
        `${improved}`,
        ``,
        `${yearStart}: ${s.startValue.toFixed(1)} ${unit}`,
        `${yearEnd}: ${s.endValue.toFixed(1)} ${unit}`,
        ``,
        `Change: ${changeSign}${s.change.toFixed(1)} ${unit}`,
        `(${percentSign}${s.percentChange.toFixed(1)}%)`
      ].join('<br>')
    })

    return [
      {
        type: 'choropleth' as const,
        locationmode: 'USA-states' as const,
        locations: stateChanges.map(s => s.stateCode),
        z: values,
        text: hoverText,
        hoverinfo: 'text' as const,
        colorscale: [
          [0, '#2ca02c'],      // Green (improved - negative change)
          [0.5, '#ffffff'],    // White (no change)
          [1, '#d62728']       // Red (degraded - positive change)
        ] as Array<[number, string]>,
        zmin: -maxAbsChange,
        zmax: maxAbsChange,
        colorbar: {
          title: {
            text: showPercentChange ? 'Change (%)' : `Change (${unit})`,
            font: { size: 12, color: COLORS.ink }
          },
          tickfont: { size: 11, color: COLORS.inkMuted },
          ticksuffix: showPercentChange ? '%' : '',
          thickness: 15,
          len: 0.6
        },
        marker: {
          line: {
            color: COLORS.inkMuted,
            width: 0.5
          }
        }
      }
    ]
  }, [stateChanges, showPercentChange, maxAbsChange, yearStart, yearEnd, unit])

  const layout = useMemo(() => ({
    ...baseLayout,
    title: { text: '' },
    geo: {
      scope: 'usa' as const,
      projection: { type: 'albers usa' as const },
      showlakes: true,
      lakecolor: '#e8e6e1',
      showland: true,
      landcolor: '#fafaf8',
      subunitcolor: COLORS.inkMuted,
      countrycolor: COLORS.ink,
      coastlinecolor: COLORS.ink,
      bgcolor: 'rgba(0,0,0,0)'
    },
    margin: { t: 20, b: 20, l: 20, r: 20 },
    dragmode: false as const
  }), [])

  const plotConfig = {
    ...baseConfig,
    scrollZoom: false,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: `reliability-map-${yearStart}-${yearEnd}`,
      height: 600,
      width: 1000,
      scale: 2
    }
  }

  // Export data format
  const exportData = stateChanges.map(s => ({
    state: s.state,
    stateCode: s.stateCode,
    [`${reliabilityMetric}_${yearStart}`]: s.startValue,
    [`${reliabilityMetric}_${yearEnd}`]: s.endValue,
    change: s.change,
    percent_change: s.percentChange
  }))

  // Summary stats
  const improved = stateChanges.filter(s => s.change < 0).length
  const degraded = stateChanges.filter(s => s.change > 0).length
  const unchanged = stateChanges.filter(s => s.change === 0).length

  return (
    <div className="chart-container" role="figure" aria-label={`Choropleth map showing change in ${metricLabel} from ${yearStart} to ${yearEnd} across U.S. states.`}>
      <div className="chart-header">
        <h2>Reliability Change Map</h2>
        <p>
          Which states improved or degraded in grid reliability?
          Compare {metricLabel} between any two years.
        </p>
      </div>

      <details className="chart-description" open>
        <summary>About this chart</summary>
        <div className="chart-description-content">
          <div className="description-section">
            <h3>How to read this map</h3>
            <dl>
              <div>
                <dt>Green states</dt>
                <dd>Reliability improved (fewer/shorter outages in {yearEnd} vs {yearStart})</dd>
              </div>
              <div>
                <dt>Red states</dt>
                <dd>Reliability degraded (more/longer outages in {yearEnd} vs {yearStart})</dd>
              </div>
              <div>
                <dt>White/light states</dt>
                <dd>Little change in reliability between the two years</dd>
              </div>
            </dl>
          </div>
          <div className="description-section">
            <p className="description-caveat">
              Note: Year-over-year changes can be volatile. Consider comparing across
              longer time periods for more meaningful trends.
            </p>
          </div>
        </div>
      </details>

      <ChartControlsWrapper
        advancedContent={
          <>
            <div className="control-group">
              <label>&nbsp;</label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showPercentChange}
                  onChange={(e) => setShowPercentChange(e.target.checked)}
                />
                Show % Change
              </label>
            </div>
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
          </>
        }
        advancedLabel="Advanced"
      >
        <div className="control-group">
          <label>Start Year</label>
          <select
            value={yearStart}
            onChange={(e) => onYearStartChange(parseInt(e.target.value))}
          >
            {data.metadata.yearsAvailable
              .filter(y => y < yearEnd)
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
            {data.metadata.yearsAvailable
              .filter(y => y > yearStart)
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
            <button onClick={() => downloadGenericCSV(exportData, `reliability-map-${yearStart}-${yearEnd}`)}>
              CSV
            </button>
            <button onClick={() => downloadGenericJSON(exportData, `reliability-map-${yearStart}-${yearEnd}`)}>
              JSON
            </button>
          </div>
        </div>
      </ChartControlsWrapper>

      <div className="stats-panel">
        <div className="stats-summary">
          <p className="summary-main">
            From {yearStart} to {yearEnd}:{' '}
            <strong style={{ color: '#2ca02c' }}>{improved} states improved</strong>,{' '}
            <strong style={{ color: '#d62728' }}>{degraded} states degraded</strong>
            {unchanged > 0 && <>, {unchanged} unchanged</>}
          </p>
        </div>
      </div>

      <div className="chart-plot-wrapper" style={{ maxWidth: '900px', margin: '0 auto' }}>
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

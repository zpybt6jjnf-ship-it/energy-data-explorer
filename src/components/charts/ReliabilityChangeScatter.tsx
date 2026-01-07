import { useMemo, useCallback, useRef } from 'react'
import Plot from 'react-plotly.js'
import { ChartData, REGION_COLORS, StateDataPoint } from '../../types'
import { COLORS, baseLayout, axisStyle, axisTitleStyle, baseConfig } from '../../utils/plotly'
import { calculateRegression, RegressionResult, getTCritical } from '../../utils/statistics'
import { downloadGenericCSV, downloadGenericJSON } from '../../utils/export'
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

interface StateChangePoint {
  stateCode: string
  state: string
  region: string
  vreChange: number
  reliabilityChange: number
  vreStart: number
  vreEnd: number
  reliabilityStart: number
  reliabilityEnd: number
}

/**
 * Zeke Plot: Change in Reliability vs Change in VRE between two user-selected years.
 * Each point represents one state's change over the selected period.
 */
export default function ReliabilityChangeScatter({
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
  const plotRef = useRef<HTMLDivElement>(null)

  // Helper to get reliability value from a point (handles MED toggle)
  const getReliabilityValue = useCallback((point: StateDataPoint): number | null => {
    if (includeMED) {
      const withMEDKey = reliabilityMetric === 'saidi' ? 'saidiWithMED' : 'saifiWithMED'
      const withMEDValue = point[withMEDKey] as number | null
      if (withMEDValue !== null) return withMEDValue
    }
    return point[reliabilityMetric] as number | null
  }, [reliabilityMetric, includeMED])

  // Calculate per-state changes between yearStart and yearEnd
  const stateChanges = useMemo((): StateChangePoint[] => {
    const changes: StateChangePoint[] = []

    // Get unique states
    const states = [...new Set(data.points.map(p => p.stateCode))]

    for (const stateCode of states) {
      const startPoint = data.points.find(p => p.stateCode === stateCode && p.year === yearStart)
      const endPoint = data.points.find(p => p.stateCode === stateCode && p.year === yearEnd)

      if (!startPoint || !endPoint) continue

      const reliabilityStart = getReliabilityValue(startPoint)
      const reliabilityEnd = getReliabilityValue(endPoint)

      if (reliabilityStart === null || reliabilityEnd === null) continue

      changes.push({
        stateCode,
        state: startPoint.state,
        region: startPoint.region,
        vreChange: endPoint.vrePenetration - startPoint.vrePenetration,
        reliabilityChange: reliabilityEnd - reliabilityStart,
        vreStart: startPoint.vrePenetration,
        vreEnd: endPoint.vrePenetration,
        reliabilityStart,
        reliabilityEnd
      })
    }

    return changes
  }, [data.points, yearStart, yearEnd, getReliabilityValue])

  // Calculate regression
  const regression = useMemo((): RegressionResult | null => {
    if (stateChanges.length < 3) return null
    const points = stateChanges.map(p => ({ x: p.vreChange, y: p.reliabilityChange }))
    return calculateRegression(points)
  }, [stateChanges])

  // Generate summary text
  const summary = useMemo(() => {
    if (!regression) return null

    const strength = Math.abs(regression.r) < 0.1 ? 'no' :
                     Math.abs(regression.r) < 0.3 ? 'a weak' :
                     Math.abs(regression.r) < 0.5 ? 'a moderate' : 'a strong'
    const direction = regression.r > 0 ? 'positive' : 'negative'

    const metricLabel = reliabilityMetric === 'saidi' ? 'outage duration' : 'outage frequency'
    const unit = reliabilityMetric === 'saidi' ? 'minutes' : 'interruptions'

    return {
      strength,
      direction,
      metricLabel,
      unit,
      r: regression.r,
      n: regression.n
    }
  }, [regression, reliabilityMetric])

  // Build plot traces
  const plotData = useMemo(() => {
    const traces: Array<Record<string, unknown>> = []
    const metricLabel = reliabilityMetric === 'saidi' ? 'Outage Duration' : 'Outage Frequency'
    const unit = reliabilityMetric === 'saidi' ? 'min' : 'interruptions'

    const hoverTemplate =
      '<b>%{customdata.state}</b><br>' +
      `<span style="color:${COLORS.inkMuted}">%{customdata.region}</span><br><br>` +
      `<b>VRE Change:</b> %{customdata.vreChange:+.1f}%<br>` +
      `<span style="color:${COLORS.inkMuted}">%{customdata.vreStart:.1f}% → %{customdata.vreEnd:.1f}%</span><br><br>` +
      `<b>${metricLabel} Change:</b> %{customdata.reliabilityChange:+.1f} ${unit}<br>` +
      `<span style="color:${COLORS.inkMuted}">%{customdata.reliabilityStart:.1f} → %{customdata.reliabilityEnd:.1f}</span>` +
      '<extra></extra>'

    // Group by region
    const regions = [...new Set(stateChanges.map(p => p.region))]

    regions.forEach(region => {
      const regionPoints = stateChanges.filter(p => p.region === region)

      traces.push({
        x: regionPoints.map(p => p.vreChange),
        y: regionPoints.map(p => p.reliabilityChange),
        text: regionPoints.map(p => p.stateCode),
        customdata: regionPoints.map(p => ({
          state: p.state,
          stateCode: p.stateCode,
          region: p.region,
          vreChange: p.vreChange,
          reliabilityChange: p.reliabilityChange,
          vreStart: p.vreStart,
          vreEnd: p.vreEnd,
          reliabilityStart: p.reliabilityStart,
          reliabilityEnd: p.reliabilityEnd
        })),
        mode: 'markers+text' as const,
        type: 'scatter' as const,
        name: region,
        marker: {
          color: REGION_COLORS[region] || COLORS.inkMuted,
          size: 12,
          opacity: 0.85,
          line: { color: COLORS.ink, width: 1 }
        },
        textposition: 'top center',
        textfont: { size: 9, color: COLORS.ink },
        hovertemplate: hoverTemplate
      })
    })

    // Add zero reference lines
    const xRange = stateChanges.length > 0
      ? [Math.min(...stateChanges.map(p => p.vreChange)), Math.max(...stateChanges.map(p => p.vreChange))]
      : [-5, 20]
    const yRange = stateChanges.length > 0
      ? [Math.min(...stateChanges.map(p => p.reliabilityChange)), Math.max(...stateChanges.map(p => p.reliabilityChange))]
      : [-50, 50]

    // Vertical zero line (x=0)
    traces.push({
      x: [0, 0],
      y: [yRange[0] * 1.1, yRange[1] * 1.1],
      mode: 'lines' as const,
      type: 'scatter' as const,
      name: 'No VRE Change',
      line: { color: COLORS.inkMuted, width: 1, dash: 'dash' },
      hoverinfo: 'skip' as const,
      showlegend: false
    })

    // Horizontal zero line (y=0)
    traces.push({
      x: [xRange[0] * 1.1, xRange[1] * 1.1],
      y: [0, 0],
      mode: 'lines' as const,
      type: 'scatter' as const,
      name: 'No Reliability Change',
      line: { color: COLORS.inkMuted, width: 1, dash: 'dash' },
      hoverinfo: 'skip' as const,
      showlegend: false
    })

    // Add trend line if we have regression
    if (regression) {
      // Confidence interval
      traces.push({
        x: [...regression.ciX, ...regression.ciX.slice().reverse()],
        y: [...regression.ciUpper, ...regression.ciLower.slice().reverse()],
        fill: 'toself',
        fillcolor: `${COLORS.ink}26`,
        line: { color: `${COLORS.ink}4D`, width: 1 },
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: '95% CI',
        hoverinfo: 'skip' as const,
        showlegend: true
      })

      // Trend line
      traces.push({
        x: regression.lineX,
        y: regression.lineY,
        mode: 'lines' as const,
        type: 'scatter' as const,
        name: regression.isSignificant ? 'Trend (p<0.05)' : 'Trend (n.s.)',
        line: { color: COLORS.ink, width: 3 },
        hoverinfo: 'skip' as const
      })
    }

    return traces
  }, [stateChanges, regression, reliabilityMetric])

  const metricLabel = reliabilityMetric === 'saidi' ? 'Outage Duration (SAIDI)' : 'Outage Frequency (SAIFI)'
  const unit = reliabilityMetric === 'saidi' ? 'minutes' : 'interruptions'

  const layout = useMemo(() => ({
    ...baseLayout,
    title: { text: '' },
    xaxis: {
      ...axisStyle,
      title: { text: `Change in Renewable Energy Share (${yearStart}→${yearEnd})`, ...axisTitleStyle },
      ticksuffix: '%',
      zeroline: false
    },
    yaxis: {
      ...axisStyle,
      title: { text: `Change in ${metricLabel} (${unit})`, ...axisTitleStyle },
      zeroline: false
    },
    annotations: [
      {
        x: 0.02,
        y: 0.98,
        xref: 'paper' as const,
        yref: 'paper' as const,
        text: '<b>Improved reliability</b><br>with more renewables',
        showarrow: false,
        font: { size: 10, color: '#2ca02c' },
        align: 'left' as const,
        xanchor: 'left' as const,
        yanchor: 'top' as const
      },
      {
        x: 0.98,
        y: 0.02,
        xref: 'paper' as const,
        yref: 'paper' as const,
        text: '<b>Degraded reliability</b><br>with more renewables',
        showarrow: false,
        font: { size: 10, color: '#d62728' },
        align: 'right' as const,
        xanchor: 'right' as const,
        yanchor: 'bottom' as const
      }
    ]
  }), [yearStart, yearEnd, metricLabel, unit])

  const plotConfig = {
    ...baseConfig,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: `reliability-change-${yearStart}-${yearEnd}`,
      height: 700,
      width: 1200,
      scale: 2
    }
  }

  // Export data format
  const exportData = stateChanges.map(p => ({
    state: p.state,
    stateCode: p.stateCode,
    region: p.region,
    [`vre_${yearStart}`]: p.vreStart,
    [`vre_${yearEnd}`]: p.vreEnd,
    vre_change: p.vreChange,
    [`${reliabilityMetric}_${yearStart}`]: p.reliabilityStart,
    [`${reliabilityMetric}_${yearEnd}`]: p.reliabilityEnd,
    [`${reliabilityMetric}_change`]: p.reliabilityChange
  }))

  return (
    <div className="chart-container" role="figure" aria-label={`Scatter plot showing change in ${metricLabel} versus change in renewable energy share from ${yearStart} to ${yearEnd} for ${stateChanges.length} states.`}>
      <div className="chart-header">
        <h2>Reliability Change vs. Renewable Adoption</h2>
        <p>
          How did grid reliability change in states that added more renewable energy?
          Compare any two years to see the relationship.
        </p>
      </div>

      <details className="chart-description" open>
        <summary>About this chart</summary>
        <div className="chart-description-content">
          <div className="description-section">
            <h3>What does this show?</h3>
            <p>
              Each point represents a U.S. state. The position shows how much that state&apos;s
              renewable energy share changed (X-axis) and how much its grid reliability changed
              (Y-axis) between <strong>{yearStart}</strong> and <strong>{yearEnd}</strong>.
            </p>
            <dl>
              <div>
                <dt>Points in the lower-right quadrant</dt>
                <dd>States that added renewables and improved reliability (fewer/shorter outages)</dd>
              </div>
              <div>
                <dt>Points in the upper-right quadrant</dt>
                <dd>States that added renewables but saw degraded reliability</dd>
              </div>
              <div>
                <dt>Points in the lower-left quadrant</dt>
                <dd>States that reduced renewables and improved reliability</dd>
              </div>
              <div>
                <dt>Points in the upper-left quadrant</dt>
                <dd>States that reduced renewables and saw degraded reliability</dd>
              </div>
            </dl>
          </div>
          <div className="description-section">
            <h3>Why is this useful?</h3>
            <p>
              This &quot;delta vs delta&quot; view helps control for baseline differences between states.
              Instead of asking &quot;do states with more renewables have worse reliability?&quot; we ask
              &quot;did states that added more renewables see their reliability change?&quot;
            </p>
            <p className="description-caveat">
              Note: Correlation does not imply causation. Many factors affect reliability including
              infrastructure investment, weather patterns, and grid modernization efforts.
            </p>
          </div>
        </div>
      </details>

      <ChartControlsWrapper
        advancedContent={
          <div className="control-group">
            <label>&nbsp;</label>
            <label className="checkbox-label" title="Include data from Major Event Days (extreme weather, disasters)">
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
            <button onClick={() => downloadGenericCSV(exportData, `reliability-change-${yearStart}-${yearEnd}`)}>
              CSV
            </button>
            <button onClick={() => downloadGenericJSON(exportData, `reliability-change-${yearStart}-${yearEnd}`)}>
              JSON
            </button>
          </div>
        </div>
      </ChartControlsWrapper>

      {regression && summary && (
        <div className="stats-panel">
          <div className="stats-summary">
            <p className="summary-main">
              The data shows <strong>{summary.strength} {summary.direction} correlation</strong> between
              renewable adoption and changes in {summary.metricLabel}.
            </p>
            <p className="summary-detail">
              Based on {summary.n} states comparing {yearStart} to {yearEnd}.
            </p>
          </div>
          <details className="stats-technical">
            <summary>Technical details</summary>
            <div className="stats-grid">
              <div className="stat">
                <span className="stat-label">Correlation (r)</span>
                <span className="stat-value">{regression.r.toFixed(3)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">R² <span className="stat-hint">(variance explained)</span></span>
                <span className="stat-value">{(regression.r2 * 100).toFixed(1)}%</span>
              </div>
              <div className="stat">
                <span className="stat-label">p-value</span>
                <span className="stat-value">{regression.pValue < 0.001 ? '< 0.001' : regression.pValue.toFixed(3)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Slope <span className="stat-hint">({unit} per 1% VRE change)</span></span>
                <span className="stat-value">{regression.slope.toFixed(2)} ± {(regression.seSlope * getTCritical(regression.n - 2)).toFixed(2)}</span>
              </div>
            </div>
          </details>
        </div>
      )}

      <div ref={plotRef}>
        <p className="chart-interaction-hint">
          Hover over points to see state details · Drag to zoom · Double-click to reset
        </p>
        <div className="chart-plot-wrapper">
          <Plot
            data={plotData}
            layout={layout}
            config={plotConfig}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
    </div>
  )
}

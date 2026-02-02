import { useMemo, useState, useRef } from 'react'
import Plot from 'react-plotly.js'
import { ChartData, REGION_COLORS } from '../../types'
import { COLORS, baseLayout, axisStyle, axisTitleStyle, baseConfig } from '../../utils/plotly'
import { calculateRegression, RegressionResult, getTCritical } from '../../utils/statistics'
import { downloadGenericCSV, downloadGenericJSON } from '../../utils/exportUtils'
import { ChartControlsWrapper } from '../controls'

interface Props {
  data: ChartData
  yearStart: number
  yearEnd: number
  onYearStartChange: (year: number) => void
  onYearEndChange: (year: number) => void
}

interface StateVolatilityPoint {
  stateCode: string
  state: string
  region: string
  avgExposure: number  // Average gas or renewable share
  rateStdDev: number   // Standard deviation of rates over period
  avgRate: number      // Average rate over period
  minRate: number
  maxRate: number
  yearCount: number
}

// Calculate standard deviation
function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  return Math.sqrt(squaredDiffs.reduce((s, d) => s + d, 0) / (values.length - 1))
}

/**
 * Scatter plot showing rate volatility vs fuel mix exposure.
 * X-axis: Average gas or renewable share over period
 * Y-axis: Standard deviation of electricity rates over period
 */
export default function RateVolatilityChart({
  data,
  yearStart,
  yearEnd,
  onYearStartChange,
  onYearEndChange
}: Props) {
  const plotRef = useRef<HTMLDivElement>(null)
  const [showTrendLine, setShowTrendLine] = useState(true)
  const [xAxisMode, setXAxisMode] = useState<'gas' | 'renewable'>('gas')
  const [rateType, setRateType] = useState<'rateResidential' | 'rateCommercial' | 'rateIndustrial' | 'rateAll'>('rateResidential')

  // Calculate per-state volatility metrics
  const stateVolatility = useMemo((): StateVolatilityPoint[] => {
    const points: StateVolatilityPoint[] = []
    const states = [...new Set(data.points.map(p => p.stateCode))]

    for (const stateCode of states) {
      const stateData = data.points.filter(p =>
        p.stateCode === stateCode &&
        p.year >= yearStart &&
        p.year <= yearEnd
      )

      if (stateData.length < 2) continue

      // Get rate values
      const rates = stateData
        .map(p => p[rateType] as number | null)
        .filter((r): r is number => r !== null)

      if (rates.length < 2) continue

      // Calculate exposure (gas or renewable share)
      const exposures = stateData.map(p => {
        if (xAxisMode === 'gas') {
          const total = p.generationGas + p.generationCoal + p.generationNuclear +
            p.generationHydro + p.generationWind + p.generationSolar + p.generationOther
          return total > 0 ? (p.generationGas / total) * 100 : 0
        } else {
          return p.vrePenetration
        }
      })

      const avgExposure = exposures.reduce((s, v) => s + v, 0) / exposures.length
      const rateStdDev = standardDeviation(rates)
      const avgRate = rates.reduce((s, v) => s + v, 0) / rates.length
      const minRate = Math.min(...rates)
      const maxRate = Math.max(...rates)

      points.push({
        stateCode,
        state: stateData[0].state,
        region: stateData[0].region,
        avgExposure,
        rateStdDev,
        avgRate,
        minRate,
        maxRate,
        yearCount: stateData.length
      })
    }

    return points
  }, [data.points, yearStart, yearEnd, xAxisMode, rateType])

  // Calculate regression
  const regression = useMemo((): RegressionResult | null => {
    if (stateVolatility.length < 3 || !showTrendLine) return null
    const points = stateVolatility.map(p => ({ x: p.avgExposure, y: p.rateStdDev }))
    return calculateRegression(points)
  }, [stateVolatility, showTrendLine])

  // Generate summary
  const summary = useMemo(() => {
    if (!regression) return null

    const strength = Math.abs(regression.r) < 0.1 ? 'no' :
                     Math.abs(regression.r) < 0.3 ? 'a weak' :
                     Math.abs(regression.r) < 0.5 ? 'a moderate' : 'a strong'
    const direction = regression.r > 0 ? 'positive' : 'negative'

    return {
      strength,
      direction,
      r: regression.r,
      n: regression.n
    }
  }, [regression])

  const xAxisLabel = xAxisMode === 'gas' ? 'Average Gas Share' : 'Average Renewable Share'
  const rateLabel = {
    rateResidential: 'Residential',
    rateCommercial: 'Commercial',
    rateIndustrial: 'Industrial',
    rateAll: 'All-Sector'
  }[rateType]

  // Build plot traces
  const plotData = useMemo(() => {
    const traces: Array<Record<string, unknown>> = []

    const hoverTemplate =
      '<b>%{customdata.state}</b><br>' +
      `<span style="color:${COLORS.inkMuted}">%{customdata.region}</span><br><br>` +
      `<b>${xAxisLabel}:</b> %{customdata.avgExposure:.1f}%<br>` +
      `<b>Rate Volatility:</b> %{customdata.rateStdDev:.2f} ¢/kWh<br>` +
      `<span style="color:${COLORS.inkMuted}">Avg rate: %{customdata.avgRate:.2f} ¢/kWh</span><br>` +
      `<span style="color:${COLORS.inkMuted}">Range: %{customdata.minRate:.2f} - %{customdata.maxRate:.2f}</span>` +
      '<extra></extra>'

    // Group by region
    const regions = [...new Set(stateVolatility.map(p => p.region))]

    regions.forEach(region => {
      const regionPoints = stateVolatility.filter(p => p.region === region)

      traces.push({
        x: regionPoints.map(p => p.avgExposure),
        y: regionPoints.map(p => p.rateStdDev),
        text: regionPoints.map(p => p.stateCode),
        customdata: regionPoints.map(p => ({
          state: p.state,
          stateCode: p.stateCode,
          region: p.region,
          avgExposure: p.avgExposure,
          rateStdDev: p.rateStdDev,
          avgRate: p.avgRate,
          minRate: p.minRate,
          maxRate: p.maxRate
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

    // Add trend line if enabled
    if (regression && showTrendLine) {
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
  }, [stateVolatility, regression, showTrendLine, xAxisLabel])

  const layout = useMemo(() => ({
    ...baseLayout,
    title: { text: '' },
    xaxis: {
      ...axisStyle,
      title: { text: `${xAxisLabel} (${yearStart}–${yearEnd})`, ...axisTitleStyle },
      ticksuffix: '%'
    },
    yaxis: {
      ...axisStyle,
      title: { text: `${rateLabel} Rate Volatility (Std Dev, ¢/kWh)`, ...axisTitleStyle }
    }
  }), [xAxisLabel, rateLabel, yearStart, yearEnd])

  const plotConfig = {
    ...baseConfig,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: `rate-volatility-${xAxisMode}-${yearStart}-${yearEnd}`,
      height: 700,
      width: 1200,
      scale: 2
    }
  }

  // Export data
  const exportData = stateVolatility.map(p => ({
    state: p.state,
    stateCode: p.stateCode,
    region: p.region,
    [`avg_${xAxisMode}_share`]: p.avgExposure,
    rate_std_dev: p.rateStdDev,
    avg_rate: p.avgRate,
    min_rate: p.minRate,
    max_rate: p.maxRate,
    year_count: p.yearCount
  }))

  return (
    <div className="chart-container" role="figure" aria-label={`Scatter plot showing rate volatility versus ${xAxisMode} share for ${stateVolatility.length} states.`}>
      <div className="chart-header">
        <h2>Rate Volatility vs. Fuel Mix Exposure</h2>
        <p>
          Do states with more {xAxisMode === 'gas' ? 'natural gas' : 'renewable'} generation
          experience more volatile electricity prices?
        </p>
      </div>

      <details className="chart-description" open>
        <summary>About this chart</summary>
        <div className="chart-description-content">
          <div className="description-section">
            <h3>What does this show?</h3>
            <p>
              Each point represents a U.S. state. The X-axis shows the state&apos;s average
              {xAxisMode === 'gas' ? ' natural gas' : ' wind and solar'} share of generation
              over the selected period. The Y-axis shows how much the electricity rate
              varied (standard deviation) over that same period.
            </p>
          </div>
          <div className="description-section">
            <h3>Why is this useful?</h3>
            <p>
              {xAxisMode === 'gas'
                ? 'Natural gas prices are notoriously volatile, tied to commodity markets and weather. States with high gas dependence might see that volatility passed through to retail rates.'
                : 'Renewable energy has zero fuel cost, which could stabilize prices. But variable output might increase market volatility. This chart explores which effect dominates.'}
            </p>
            <p className="description-caveat">
              Note: Rate volatility is affected by many factors including regulatory structure,
              fuel contract terms, and market design.
            </p>
          </div>
        </div>
      </details>

      <ChartControlsWrapper>
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
          <label>X-Axis</label>
          <select
            value={xAxisMode}
            onChange={(e) => setXAxisMode(e.target.value as 'gas' | 'renewable')}
          >
            <option value="gas">Gas Share</option>
            <option value="renewable">Renewable Share</option>
          </select>
        </div>

        <div className="control-group">
          <label>Rate Type</label>
          <select
            value={rateType}
            onChange={(e) => setRateType(e.target.value as 'rateResidential' | 'rateCommercial' | 'rateIndustrial' | 'rateAll')}
          >
            <option value="rateResidential">Residential</option>
            <option value="rateCommercial">Commercial</option>
            <option value="rateIndustrial">Industrial</option>
            <option value="rateAll">All Sectors</option>
          </select>
        </div>

        <div className="control-group">
          <label>Analysis</label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showTrendLine}
              onChange={(e) => setShowTrendLine(e.target.checked)}
            />
            Trend Line
          </label>
        </div>

        <div className="control-group">
          <label>Export</label>
          <div className="button-group">
            <button onClick={() => downloadGenericCSV(exportData, `rate-volatility-${xAxisMode}-${yearStart}-${yearEnd}`)}>
              CSV
            </button>
            <button onClick={() => downloadGenericJSON(exportData, `rate-volatility-${xAxisMode}-${yearStart}-${yearEnd}`)}>
              JSON
            </button>
          </div>
        </div>
      </ChartControlsWrapper>

      {regression && summary && showTrendLine && (
        <div className="stats-panel">
          <div className="stats-summary">
            <p className="summary-main">
              The data shows <strong>{summary.strength} {summary.direction} correlation</strong> between
              {xAxisMode === 'gas' ? ' gas' : ' renewable'} share and rate volatility.
            </p>
            <p className="summary-detail">
              Based on {summary.n} states comparing average exposure to rate volatility ({yearStart}–{yearEnd}).
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
                <span className="stat-label">R²</span>
                <span className="stat-value">{(regression.r2 * 100).toFixed(1)}%</span>
              </div>
              <div className="stat">
                <span className="stat-label">p-value</span>
                <span className="stat-value">{regression.pValue < 0.001 ? '< 0.001' : regression.pValue.toFixed(3)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Slope</span>
                <span className="stat-value">{regression.slope.toFixed(3)} ± {(regression.seSlope * getTCritical(regression.n - 2)).toFixed(3)}</span>
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

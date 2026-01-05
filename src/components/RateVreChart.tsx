import { useMemo, useCallback, useRef } from 'react'
import Plot from 'react-plotly.js'
import { ChartData, ChartFilters, REGION_COLORS } from '../types'
import { downloadCSV, downloadJSON } from '../utils/export'
import { COLORS, RETRO_COLORS, formatPercentDelta, baseLayout, axisStyle, axisTitleStyle, baseConfig } from '../utils/plotly'

interface Props {
  data: ChartData
  filters: ChartFilters
  onFilterChange: (filters: Partial<ChartFilters>) => void
  onResetViewport?: () => void
}

// T-distribution critical values for 95% CI (two-tailed)
function getTCritical(df: number): number {
  if (df >= 120) return 1.96
  if (df >= 60) return 2.00
  if (df >= 40) return 2.02
  if (df >= 30) return 2.04
  if (df >= 20) return 2.09
  if (df >= 15) return 2.13
  if (df >= 10) return 2.23
  if (df >= 5) return 2.57
  if (df >= 3) return 3.18
  return 4.30
}

// Calculate p-value from t-statistic (approximation)
function calculatePValue(t: number, df: number): number {
  const absT = Math.abs(t)
  const p = Math.exp(
    -0.5 * absT * absT * (1 + 0.5 / df + 0.375 / (df * df))
  ) * Math.sqrt(2 / Math.PI)
  return Math.min(1, p * 2)
}

// Calculate linear regression and correlation with full statistics
function calculateRegression(points: { x: number; y: number }[]) {
  const n = points.length
  if (n < 3) return null

  const sumX = points.reduce((acc, p) => acc + p.x, 0)
  const sumY = points.reduce((acc, p) => acc + p.y, 0)
  const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0)
  const sumX2 = points.reduce((acc, p) => acc + p.x * p.x, 0)
  const sumY2 = points.reduce((acc, p) => acc + p.y * p.y, 0)

  const meanX = sumX / n

  const denominator = n * sumX2 - sumX * sumX
  if (denominator === 0) return null

  const slope = (n * sumXY - sumX * sumY) / denominator
  const intercept = (sumY - slope * sumX) / n

  const numerator = n * sumXY - sumX * sumY
  const denominatorR = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  const r = denominatorR === 0 ? 0 : numerator / denominatorR
  const r2 = r * r

  const df = n - 2
  const tStat = r * Math.sqrt(df / (1 - r * r + 0.0001))
  const pValue = calculatePValue(tStat, df)

  const predictions = points.map(p => slope * p.x + intercept)
  const residuals = points.map((p, i) => p.y - predictions[i])
  const sse = residuals.reduce((acc, r) => acc + r * r, 0)
  const mse = sse / df
  const se = Math.sqrt(mse)

  const sxx = points.reduce((acc, p) => acc + (p.x - meanX) ** 2, 0)

  const minX = Math.min(...points.map(p => p.x))
  const maxX = Math.max(...points.map(p => p.x))

  const tCrit = getTCritical(df)
  const xRange = Array.from({ length: 50 }, (_, i) => minX + (maxX - minX) * i / 49)
  const ciUpper: number[] = []
  const ciLower: number[] = []

  xRange.forEach(x => {
    const yHat = slope * x + intercept
    const sePred = se * Math.sqrt(1/n + (x - meanX) ** 2 / sxx)
    const margin = tCrit * sePred
    ciUpper.push(yHat + margin)
    ciLower.push(yHat - margin)
  })

  return {
    slope,
    intercept,
    r,
    r2,
    pValue,
    n,
    xRange,
    yLine: xRange.map(x => slope * x + intercept),
    ciUpper,
    ciLower
  }
}

export default function RateVreChart({ data, filters, onFilterChange, onResetViewport }: Props) {
  const onFilterChangeRef = useRef(onFilterChange)
  onFilterChangeRef.current = onFilterChange

  // Handle plot initialization for zoom persistence
  const handleInitialized = useCallback((_figure: unknown, graphDiv: HTMLElement) => {
    const plotlyDiv = graphDiv as HTMLElement & {
      on: (event: string, callback: (event: unknown) => void) => void
    }

    plotlyDiv.on('plotly_relayout', (event: unknown) => {
      const e = event as Record<string, unknown>

      const xRange = e['xaxis.range'] as [number, number] | undefined ||
        (e['xaxis.range[0]'] !== undefined ? [e['xaxis.range[0]'], e['xaxis.range[1]']] as [number, number] : null)
      const yRange = e['yaxis.range'] as [number, number] | undefined ||
        (e['yaxis.range[0]'] !== undefined ? [e['yaxis.range[0]'], e['yaxis.range[1]']] as [number, number] : null)

      if (xRange && yRange) {
        onFilterChangeRef.current({
          xAxisRange: xRange,
          yAxisRange: yRange
        })
      }

      if (e['xaxis.autorange'] === true || e['yaxis.autorange'] === true) {
        onFilterChangeRef.current({ xAxisRange: null, yAxisRange: null })
      }
    })
  }, [])

  // Get residential rate (primary display)
  const getRate = (point: typeof data.points[0]): number | null => {
    return point.rateResidential
  }

  // Filter data by year, state, and valid rate
  const filteredData = useMemo(() => {
    return data.points.filter(point => {
      const yearMatch = point.year >= filters.yearStart && point.year <= filters.yearEnd
      const stateMatch = filters.selectedStates.length === 0 ||
        filters.selectedStates.includes(point.stateCode)
      const hasRate = getRate(point) !== null
      return yearMatch && stateMatch && hasRate
    })
  }, [data.points, filters.yearStart, filters.yearEnd, filters.selectedStates])

  // Calculate regression for trend line
  const regression = useMemo(() => {
    if (!filters.showTrendLine) return null
    const points = filteredData.map(p => ({
      x: p.vrePenetration,
      y: getRate(p) ?? 0
    }))
    return calculateRegression(points)
  }, [filteredData, filters.showTrendLine])

  // Calculate average rate for reference
  const avgRate = useMemo(() => {
    if (filteredData.length === 0) return 0
    const rates = filteredData.map(p => getRate(p)).filter((r): r is number => r !== null)
    return rates.reduce((sum, r) => sum + r, 0) / rates.length
  }, [filteredData])

  // Enrich data with rankings and comparisons
  const enrichedData = useMemo(() => {
    if (filteredData.length === 0) return []

    const sortedByRate = [...filteredData].sort((a, b) => {
      const rateA = getRate(a) ?? 0
      const rateB = getRate(b) ?? 0
      return rateA - rateB
    })
    const rateRankMap = new Map<string, number>()
    sortedByRate.forEach((p, i) => {
      rateRankMap.set(`${p.stateCode}-${p.year}`, i + 1)
    })

    const total = filteredData.length

    return filteredData.map(p => {
      const key = `${p.stateCode}-${p.year}`
      const rateRank = rateRankMap.get(key) || 0
      const rate = getRate(p) ?? 0

      return {
        ...p,
        rate,
        rateRank,
        total,
        rateDeltaStr: formatPercentDelta(rate, avgRate)
      }
    })
  }, [filteredData, avgRate])

  // Build plot traces
  const plotData = useMemo(() => {
    const traces: Array<Record<string, unknown>> = []

    // Add confidence interval band first (behind other traces)
    if (regression && filters.showTrendLine) {
      traces.push({
        x: [...regression.xRange, ...regression.xRange.slice().reverse()],
        y: [...regression.ciUpper, ...regression.ciLower.slice().reverse()],
        fill: 'toself',
        fillcolor: 'rgba(42, 157, 143, 0.15)',
        line: { color: 'transparent' },
        type: 'scatter',
        mode: 'lines',
        name: '95% CI',
        hoverinfo: 'skip',
        showlegend: false
      })
    }

    if (filters.colorBy === 'region') {
      const regions = [...new Set(enrichedData.map(p => p.region))]
      regions.forEach(region => {
        const regionPoints = enrichedData.filter(p => p.region === region)
        traces.push({
          x: regionPoints.map(p => p.vrePenetration),
          y: regionPoints.map(p => p.rate),
          text: regionPoints.map(p => `${p.state} (${p.year})`),
          customdata: regionPoints.map(p => ({
            state: p.state,
            stateCode: p.stateCode,
            year: p.year,
            region: p.region,
            rate: p.rate,
            vrePenetration: p.vrePenetration,
            rateDeltaStr: p.rateDeltaStr
          })),
          mode: 'markers' as const,
          type: 'scatter' as const,
          name: region,
          marker: {
            color: REGION_COLORS[region] || COLORS.inkMuted,
            size: 11,
            opacity: 0.85,
            line: { color: COLORS.ink, width: 1 }
          },
          hovertemplate:
            '<b>%{customdata.state}</b> (%{customdata.year})<br>' +
            `<span style="color:${COLORS.inkMuted}">%{customdata.region}</span><br><br>` +
            'Rate: %{customdata.rate:.1f} ¢/kWh (%{customdata.rateDeltaStr})<br>' +
            'VRE: %{customdata.vrePenetration:.1f}%' +
            '<extra></extra>'
        })
      })
    } else {
      const years = [...new Set(enrichedData.map(p => p.year))].sort()
      years.forEach((year, i) => {
        const yearPoints = enrichedData.filter(p => p.year === year)
        const colorIndex = i % RETRO_COLORS.length
        traces.push({
          x: yearPoints.map(p => p.vrePenetration),
          y: yearPoints.map(p => p.rate),
          text: yearPoints.map(p => p.state),
          customdata: yearPoints.map(p => ({
            state: p.state,
            stateCode: p.stateCode,
            year: p.year,
            region: p.region,
            rate: p.rate,
            vrePenetration: p.vrePenetration,
            rateDeltaStr: p.rateDeltaStr
          })),
          mode: 'markers' as const,
          type: 'scatter' as const,
          name: year.toString(),
          marker: {
            color: RETRO_COLORS[colorIndex],
            size: 11,
            opacity: 0.85,
            line: { color: COLORS.ink, width: 1 }
          },
          hovertemplate:
            '<b>%{customdata.state}</b> (%{customdata.year})<br>' +
            `<span style="color:${COLORS.inkMuted}">%{customdata.region}</span><br><br>` +
            'Rate: %{customdata.rate:.1f} ¢/kWh (%{customdata.rateDeltaStr})<br>' +
            'VRE: %{customdata.vrePenetration:.1f}%' +
            '<extra></extra>'
        })
      })
    }

    // Add trend line
    if (regression && filters.showTrendLine) {
      const significanceLabel = regression.pValue < 0.001 ? 'p < 0.001' :
        regression.pValue < 0.01 ? 'p < 0.01' :
        regression.pValue < 0.05 ? 'p < 0.05' : `p = ${regression.pValue.toFixed(2)}`

      traces.push({
        x: regression.xRange,
        y: regression.yLine,
        mode: 'lines',
        type: 'scatter',
        name: `Trend (R² = ${(regression.r2 * 100).toFixed(1)}%)`,
        line: {
          color: COLORS.teal,
          width: 2.5,
          dash: 'solid'
        },
        hovertemplate:
          `<b>Linear Regression</b><br>` +
          `R² = ${(regression.r2 * 100).toFixed(1)}% (${significanceLabel})<br>` +
          `Slope: ${regression.slope > 0 ? '+' : ''}${regression.slope.toFixed(3)} ¢/kWh per 1% VRE<br>` +
          `n = ${regression.n} observations` +
          '<extra></extra>'
      })
    }

    return traces
  }, [enrichedData, filters.colorBy, filters.showTrendLine, regression])

  const layout = useMemo(() => ({
    ...baseLayout,
    title: { text: '' },
    xaxis: {
      ...axisStyle,
      title: { text: 'VRE Penetration (%) — Higher = more renewables', ...axisTitleStyle },
      ticksuffix: '%',
      range: filters.xAxisRange || undefined,
      autorange: filters.xAxisRange ? false : true
    },
    yaxis: {
      ...axisStyle,
      title: { text: 'Electricity Rate (¢/kWh) — Higher = more expensive', ...axisTitleStyle },
      ticksuffix: '¢',
      range: filters.yAxisRange || undefined,
      autorange: filters.yAxisRange ? false : true
    }
  }), [filters.xAxisRange, filters.yAxisRange])

  const config = {
    ...baseConfig,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: 'rate-vre-chart',
      height: 700,
      width: 1200,
      scale: 2
    }
  }

  return (
    <div
      className="chart-container"
      role="figure"
      aria-label={`Scatter plot showing electricity rates versus VRE penetration for ${filteredData.length} state-year observations`}
    >
      <div className="chart-header">
        <h2>Electricity Rates vs. Renewable Penetration</h2>
        <p>Do states with more wind and solar have higher electricity prices?</p>
      </div>

      <details className="chart-description" open>
        <summary>About this chart</summary>
        <div className="chart-description-content">
          <div className="description-section">
            <h3>What are we measuring?</h3>
            <dl>
              <dt>Electricity Rate (¢/kWh)</dt>
              <dd>Average retail price of electricity in cents per kilowatt-hour. This chart shows residential rates by default—the price households pay for electricity. Rates vary significantly by state due to differences in fuel mix, infrastructure costs, and regulatory policies.</dd>

              <dt>VRE Penetration (Variable Renewable Energy)</dt>
              <dd>The percentage of a state's electricity generation from wind and solar sources. States like Iowa and Kansas exceed 40% VRE, while others remain below 5%.</dd>
            </dl>
          </div>

          <div className="description-section">
            <h3>Why compare them?</h3>
            <p>A common question is whether renewable energy is related to electricity costs. This visualization allows you to explore the relationship between renewable penetration and retail electricity rates across U.S. states.</p>
            <p className="description-caveat">Note: Electricity rates are influenced by many factors including fuel costs, infrastructure age, market structure, labor costs, weather patterns, and state regulatory policies. Correlation does not imply causation.</p>
          </div>
        </div>
      </details>

      <div className="controls">
        <div className="control-group">
          <label>Start Year</label>
          <select
            value={filters.yearStart}
            onChange={(e) => onFilterChange({ yearStart: parseInt(e.target.value) })}
          >
            {data.metadata.yearsAvailable.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>End Year</label>
          <select
            value={filters.yearEnd}
            onChange={(e) => onFilterChange({ yearEnd: parseInt(e.target.value) })}
          >
            {data.metadata.yearsAvailable.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Color By</label>
          <select
            value={filters.colorBy}
            onChange={(e) => onFilterChange({ colorBy: e.target.value as 'year' | 'region' })}
          >
            <option value="year">Year</option>
            <option value="region">Region</option>
          </select>
        </div>

        <div className="control-group">
          <label>Analysis</label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={filters.showTrendLine}
              onChange={(e) => onFilterChange({ showTrendLine: e.target.checked })}
            />
            Show Trend Line
          </label>
        </div>

        <div className="control-group">
          <label>Filter States</label>
          <select
            multiple
            size={5}
            value={filters.selectedStates}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, opt => opt.value)
              onFilterChange({ selectedStates: selected })
            }}
          >
            {data.metadata.states.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>&nbsp;</label>
          <button onClick={() => onFilterChange({ selectedStates: [] })}>
            Clear Selection
          </button>
        </div>

        <div className="control-group">
          <label>View</label>
          <button
            onClick={onResetViewport}
            disabled={!filters.xAxisRange && !filters.yAxisRange}
            title="Reset to default zoom level"
          >
            Reset Zoom
          </button>
        </div>

        <div className="control-group">
          <label>Export</label>
          <div className="button-group">
            <button
              onClick={() => downloadCSV(filteredData, `rate-vre-${filters.yearStart}-${filters.yearEnd}`)}
              title="Download filtered data as CSV"
            >
              CSV
            </button>
            <button
              onClick={() => downloadJSON(filteredData, `rate-vre-${filters.yearStart}-${filters.yearEnd}`)}
              title="Download filtered data as JSON"
            >
              JSON
            </button>
          </div>
        </div>
      </div>

      {regression && filters.showTrendLine && (
        <div className="regression-stats">
          <strong>Regression Analysis:</strong>{' '}
          R² = {(regression.r2 * 100).toFixed(1)}% |
          Slope: {regression.slope > 0 ? '+' : ''}{regression.slope.toFixed(3)} ¢/kWh per 1% VRE |
          {regression.pValue < 0.05 ? (
            <span className="stat-significant">Statistically significant (p {'<'} 0.05)</span>
          ) : (
            <span className="stat-not-significant">Not statistically significant (p = {regression.pValue.toFixed(2)})</span>
          )}
        </div>
      )}

      <Plot
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '480px' }}
        onInitialized={handleInitialized}
        onUpdate={handleInitialized}
      />
    </div>
  )
}

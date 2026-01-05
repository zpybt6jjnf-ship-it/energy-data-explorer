import { useMemo, useState, useCallback, useRef } from 'react'
import Plot from 'react-plotly.js'
import { ChartData, ChartFilters, REGION_COLORS } from '../types'
import { downloadCSV, downloadJSON } from '../utils/export'
import { COLORS, RETRO_COLORS, formatRank, formatPercentDelta, baseLayout, axisStyle, axisTitleStyle, baseConfig } from '../utils/plotly'

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
  const meanY = sumY / n

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
  const seSlope = se / Math.sqrt(sxx)

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
    n,
    pValue,
    tStat,
    se,
    seSlope,
    isSignificant: pValue < 0.05,
    lineX: [minX, maxX],
    lineY: [slope * minX + intercept, slope * maxX + intercept],
    ciX: xRange,
    ciUpper,
    ciLower,
    meanX,
    meanY
  }
}

export default function SaidiVreChart({ data, filters, onFilterChange, onResetViewport }: Props) {
  const plotRef = useRef<HTMLDivElement>(null)
  const onFilterChangeRef = useRef(onFilterChange)
  onFilterChangeRef.current = onFilterChange

  // Handle plot initialization - attach relayout event for zoom/pan persistence
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

  // Filter data by year, state, and valid SAIDI (exclude null values)
  const filteredData = useMemo(() => {
    return data.points.filter(point => {
      const yearMatch = point.year >= filters.yearStart && point.year <= filters.yearEnd
      const stateMatch = filters.selectedStates.length === 0 ||
        filters.selectedStates.includes(point.stateCode)
      const hasSaidi = point.saidi !== null
      return yearMatch && stateMatch && hasSaidi
    }) as Array<typeof data.points[0] & { saidi: number; saifi: number }>
  }, [data.points, filters.yearStart, filters.yearEnd, filters.selectedStates])

  // Calculate regression statistics
  const regression = useMemo(() => {
    const points = filteredData.map(p => ({ x: p.vrePenetration, y: p.saidi }))
    return calculateRegression(points)
  }, [filteredData])

  // Calculate average SAIDI for reference line
  const avgSaidi = useMemo(() => {
    if (filteredData.length === 0) return 0
    return filteredData.reduce((sum, p) => sum + p.saidi, 0) / filteredData.length
  }, [filteredData])

  // Compute rankings and enriched data for tooltips
  const enrichedData = useMemo(() => {
    if (filteredData.length === 0) return []

    const sortedBySaidi = [...filteredData].sort((a, b) => a.saidi - b.saidi)
    const saidiRankMap = new Map<string, number>()
    sortedBySaidi.forEach((p, i) => {
      saidiRankMap.set(`${p.stateCode}-${p.year}`, i + 1)
    })

    const sortedByVre = [...filteredData].sort((a, b) => b.vrePenetration - a.vrePenetration)
    const vreRankMap = new Map<string, number>()
    sortedByVre.forEach((p, i) => {
      vreRankMap.set(`${p.stateCode}-${p.year}`, i + 1)
    })

    const total = filteredData.length

    return filteredData.map(p => {
      const key = `${p.stateCode}-${p.year}`
      const saidiRank = saidiRankMap.get(key) || 0
      const vreRank = vreRankMap.get(key) || 0

      return {
        ...p,
        saidiRank,
        vreRank,
        total,
        saidiRankStr: formatRank(saidiRank, total, 'most reliable'),
        vreDeltaStr: formatPercentDelta(p.vrePenetration, filteredData.reduce((s, pt) => s + pt.vrePenetration, 0) / filteredData.length),
        saidiDeltaStr: formatPercentDelta(p.saidi, avgSaidi)
      }
    })
  }, [filteredData, avgSaidi])

  // Generate plain-language summary
  const summary = useMemo(() => {
    if (!regression) return null

    const strength = Math.abs(regression.r) < 0.1 ? 'no' :
                     Math.abs(regression.r) < 0.3 ? 'a weak' :
                     Math.abs(regression.r) < 0.5 ? 'a moderate' : 'a strong'

    const direction = regression.r > 0 ? 'positive' : 'negative'

    const slopeText = regression.slope > 0
      ? `each 1% increase in renewable penetration is associated with ${Math.abs(regression.slope).toFixed(1)} more minutes of outages`
      : `each 1% increase in renewable penetration is associated with ${Math.abs(regression.slope).toFixed(1)} fewer minutes of outages`

    return {
      strength,
      direction,
      slopeText,
      r: regression.r,
      n: regression.n
    }
  }, [regression])

  // Easter egg: Texas 2021 winter storm
  const [showSnowflake, setShowSnowflake] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePlotClick = useCallback((event: any) => {
    if (!event.points || event.points.length === 0) return

    const point = event.points[0]
    const customdata = point.customdata as { stateCode?: string; year?: number } | undefined
    const clickedTexas2021 = customdata?.stateCode === 'TX' && customdata?.year === 2021

    if (clickedTexas2021) {
      setShowSnowflake(true)
      setTimeout(() => setShowSnowflake(false), 5000)
    }
  }, [])

  const plotData = useMemo(() => {
    const traces: Array<Record<string, unknown>> = []

    if (filters.colorBy === 'region') {
      const regions = [...new Set(enrichedData.map(p => p.region))]
      regions.forEach(region => {
        const regionPoints = enrichedData.filter(p => p.region === region)
        traces.push({
          x: regionPoints.map(p => p.vrePenetration),
          y: regionPoints.map(p => p.saidi),
          text: regionPoints.map(p => `${p.state} (${p.year})`),
          customdata: regionPoints.map(p => ({
            state: p.state,
            stateCode: p.stateCode,
            year: p.year,
            region: p.region,
            saidi: p.saidi,
            vrePenetration: p.vrePenetration,
            windPenetration: p.windPenetration,
            solarPenetration: p.solarPenetration,
            saidiRankStr: p.saidiRankStr,
            saidiDeltaStr: p.saidiDeltaStr
          })),
          mode: 'markers' as const,
          type: 'scatter' as const,
          name: region,
          marker: {
            color: REGION_COLORS[region] || COLORS.inkMuted,
            size: filters.showTrendLine ? 9 : 11,
            opacity: filters.showTrendLine ? 0.5 : 0.85,
            line: {
              color: COLORS.ink,
              width: filters.showTrendLine ? 0.5 : 1
            }
          },
          hovertemplate:
            '<b>%{customdata.state}</b> (%{customdata.year})<br>' +
            `<span style="color:${COLORS.inkMuted}">%{customdata.region}</span><br><br>` +
            'SAIDI: %{customdata.saidi:.1f} min (%{customdata.saidiDeltaStr})<br>' +
            `<span style="color:${COLORS.inkMuted}">%{customdata.saidiRankStr}</span><br><br>` +
            'VRE: %{customdata.vrePenetration:.1f}%<br>' +
            '  ├ Wind: %{customdata.windPenetration:.1f}%<br>' +
            '  └ Solar: %{customdata.solarPenetration:.1f}%' +
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
          y: yearPoints.map(p => p.saidi),
          text: yearPoints.map(p => p.state),
          customdata: yearPoints.map(p => ({
            state: p.state,
            stateCode: p.stateCode,
            year: p.year,
            region: p.region,
            saidi: p.saidi,
            vrePenetration: p.vrePenetration,
            windPenetration: p.windPenetration,
            solarPenetration: p.solarPenetration,
            saidiRankStr: p.saidiRankStr,
            saidiDeltaStr: p.saidiDeltaStr
          })),
          mode: 'markers' as const,
          type: 'scatter' as const,
          name: year.toString(),
          marker: {
            color: RETRO_COLORS[colorIndex],
            size: filters.showTrendLine ? 9 : 11,
            opacity: filters.showTrendLine ? 0.5 : 0.85,
            line: {
              color: COLORS.ink,
              width: filters.showTrendLine ? 0.5 : 1
            }
          },
          hovertemplate:
            '<b>%{customdata.state}</b> (%{customdata.year})<br>' +
            `<span style="color:${COLORS.inkMuted}">%{customdata.region}</span><br><br>` +
            'SAIDI: %{customdata.saidi:.1f} min (%{customdata.saidiDeltaStr})<br>' +
            `<span style="color:${COLORS.inkMuted}">%{customdata.saidiRankStr}</span><br><br>` +
            'VRE: %{customdata.vrePenetration:.1f}%<br>' +
            '  ├ Wind: %{customdata.windPenetration:.1f}%<br>' +
            '  └ Solar: %{customdata.solarPenetration:.1f}%' +
            '<extra></extra>'
        })
      })
    }

    // Add trend line if enabled
    if (filters.showTrendLine && regression) {
      const xRange = filteredData.length > 0
        ? [Math.min(...filteredData.map(p => p.vrePenetration)), Math.max(...filteredData.map(p => p.vrePenetration))]
        : [0, 50]

      traces.push({
        x: xRange,
        y: [avgSaidi, avgSaidi],
        mode: 'lines' as const,
        type: 'scatter' as const,
        name: `Avg SAIDI (${avgSaidi.toFixed(0)} min)`,
        line: {
          color: COLORS.inkMuted,
          width: 1,
          dash: 'dot'
        },
        hoverinfo: 'skip' as const
      })

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

      traces.push({
        x: regression.lineX,
        y: regression.lineY,
        mode: 'lines' as const,
        type: 'scatter' as const,
        name: regression.isSignificant ? 'Trend (p<0.05)' : 'Trend (n.s.)',
        line: {
          color: COLORS.ink,
          width: 3
        },
        hoverinfo: 'skip' as const
      })
    }

    return traces
  }, [enrichedData, filteredData, filters.colorBy, filters.showTrendLine, regression, avgSaidi])

  const layout = useMemo(() => ({
    ...baseLayout,
    title: { text: '' },
    xaxis: {
      ...axisStyle,
      title: { text: 'VRE Penetration (%) → More renewables', ...axisTitleStyle },
      ticksuffix: '%',
      range: filters.xAxisRange || undefined,
      autorange: filters.xAxisRange ? false : true
    },
    yaxis: {
      ...axisStyle,
      title: { text: 'SAIDI (minutes) — Higher = more outages', ...axisTitleStyle },
      range: filters.yAxisRange || undefined,
      autorange: filters.yAxisRange ? false : true
    }
  }), [filters.xAxisRange, filters.yAxisRange])

  const config = {
    ...baseConfig,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: 'saidi-vre-chart',
      height: 700,
      width: 1200,
      scale: 2
    }
  }

  return (
    <div
      className="chart-container"
      role="figure"
      aria-label={`Scatter plot showing SAIDI versus VRE penetration for ${filteredData.length} state-year observations from ${filters.yearStart} to ${filters.yearEnd}. ${summary ? `Shows ${summary.strength} ${summary.direction} correlation.` : ''}`}
    >
      <div className="chart-header">
        <h2>Reliability vs. Renewable Penetration</h2>
        <p>Do states with more wind and solar experience more outages?</p>
      </div>

      <details className="chart-description" open>
        <summary>About this chart</summary>
        <div className="chart-description-content">
          <div className="description-section">
            <h3>What are we measuring?</h3>
            <dl>
              <dt>SAIDI (System Average Interruption Duration Index)</dt>
              <dd>The average number of minutes per year that a customer experiences a power outage. Lower values indicate more reliable grid service.</dd>

              <dt>VRE Penetration (Variable Renewable Energy)</dt>
              <dd>The percentage of a state's electricity generation from wind and solar sources.</dd>
            </dl>
          </div>

          <div className="description-section">
            <h3>Why compare them?</h3>
            <p>A common question is whether integrating variable sources like wind and solar affects grid stability. This visualization explores whether states with higher renewable penetration actually experience different reliability outcomes.</p>
            <p className="description-caveat">Note: Correlation does not imply causation. Grid reliability is affected by many factors including infrastructure age, weather patterns, and investment levels.</p>
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
              onClick={() => downloadCSV(filteredData, `saidi-vre-${filters.yearStart}-${filters.yearEnd}`)}
              title="Download filtered data as CSV"
            >
              CSV
            </button>
            <button
              onClick={() => downloadJSON(filteredData, `saidi-vre-${filters.yearStart}-${filters.yearEnd}`)}
              title="Download filtered data as JSON"
            >
              JSON
            </button>
          </div>
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
      </div>

      {filters.showTrendLine && regression && summary && (
        <div className="stats-panel">
          <div className="stats-summary">
            <p className="summary-main">
              The data shows <strong>{summary.strength} {summary.direction} correlation</strong> between
              renewable energy penetration and grid outage duration.
            </p>
            <p className="summary-detail">
              Based on {summary.n} state-year observations, {summary.slopeText}.
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
                <span className="stat-label">Slope <span className="stat-hint">(min per 1% VRE)</span></span>
                <span className="stat-value">{regression.slope.toFixed(2)} ± {(regression.seSlope * getTCritical(regression.n - 2)).toFixed(2)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Std. Error</span>
                <span className="stat-value">{regression.se.toFixed(1)} min</span>
              </div>
              <div className="stat">
                <span className="stat-label">Sample size</span>
                <span className="stat-value">{regression.n}</span>
              </div>
            </div>
          </details>
        </div>
      )}

      <div ref={plotRef}>
        <Plot
          data={plotData}
          layout={layout}
          config={config}
          style={{ width: '100%', height: '480px' }}
          onClick={handlePlotClick}
          onInitialized={handleInitialized}
          onUpdate={handleInitialized}
        />
      </div>

      {showSnowflake && (
        <div className="snowflake-overlay">
          {[...Array(12)].map((_, i) => (
            <div key={i} className={`snowflake snowflake-${i}`}>❄</div>
          ))}
          <div className="brrr-text">brrrr</div>
        </div>
      )}
    </div>
  )
}

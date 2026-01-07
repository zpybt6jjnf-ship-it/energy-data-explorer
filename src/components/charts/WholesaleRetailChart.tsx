import { useMemo, useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import { WholesalePriceData, ChartData, HUB_COLORS, REGION_COLORS } from '../../types'
import { COLORS, baseLayout, axisStyle, axisTitleStyle, baseConfig } from '../../utils/plotly'
import { calculateRegression } from '../../utils/statistics'
import { downloadGenericCSV, downloadGenericJSON } from '../../utils/export'
import { ChartControlsWrapper } from '../controls'

interface Props {
  stateData: ChartData
  yearStart: number
  yearEnd: number
  onYearStartChange: (year: number) => void
  onYearEndChange: (year: number) => void
}

/**
 * Scatter plot comparing wholesale electricity prices to retail rates.
 * Shows the retail markup by region/hub.
 */
export default function WholesaleRetailChart({
  stateData,
  yearStart,
  yearEnd,
  onYearStartChange,
  onYearEndChange
}: Props) {
  const [wholesaleData, setWholesaleData] = useState<WholesalePriceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTrendLine, setShowTrendLine] = useState(true)
  const [colorBy, setColorBy] = useState<'region' | 'hub'>('region')

  // Load wholesale price data
  useEffect(() => {
    fetch('/data/wholesale-prices.json')
      .then(res => res.json())
      .then(data => {
        setWholesaleData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load wholesale data:', err)
        setLoading(false)
      })
  }, [])

  // Combine wholesale and retail data by state-year
  const combinedData = useMemo(() => {
    if (!wholesaleData) return []

    const results: Array<{
      stateCode: string
      state: string
      year: number
      region: string
      hub: string
      wholesalePrice: number
      retailRate: number
      spread: number
    }> = []

    // Create hub lookup by state
    const stateToHub = wholesaleData.metadata.stateToHub

    // Get wholesale prices by hub-year
    const wholesaleByHubYear = new Map<string, number>()
    wholesaleData.points.forEach(p => {
      if (p.year >= yearStart && p.year <= yearEnd) {
        wholesaleByHubYear.set(`${p.hub}-${p.year}`, p.avgPrice)
      }
    })

    // Match state retail rates to wholesale hub prices
    stateData.points.forEach(point => {
      if (point.year < yearStart || point.year > yearEnd) return
      if (!point.rateResidential) return

      const hub = stateToHub[point.stateCode]
      if (!hub) return

      const wholesalePrice = wholesaleByHubYear.get(`${hub}-${point.year}`)
      if (!wholesalePrice) return

      // Convert wholesale $/MWh to ¢/kWh for comparison
      const wholesaleCentsKwh = wholesalePrice / 10

      results.push({
        stateCode: point.stateCode,
        state: point.state,
        year: point.year,
        region: point.region,
        hub,
        wholesalePrice: wholesaleCentsKwh,
        retailRate: point.rateResidential,
        spread: point.rateResidential - wholesaleCentsKwh
      })
    })

    return results
  }, [stateData, wholesaleData, yearStart, yearEnd])

  // Calculate regression
  const regression = useMemo(() => {
    if (combinedData.length < 3 || !showTrendLine) return null
    const points = combinedData.map(p => ({ x: p.wholesalePrice, y: p.retailRate }))
    return calculateRegression(points)
  }, [combinedData, showTrendLine])

  // Build plot traces
  const plotData = useMemo(() => {
    const traces: Array<Record<string, unknown>> = []

    const hoverTemplate =
      '<b>%{customdata.state}</b> (%{customdata.year})<br>' +
      `<span style="color:${COLORS.inkMuted}">%{customdata.hub}</span><br><br>` +
      '<b>Wholesale:</b> %{customdata.wholesalePrice:.2f} ¢/kWh<br>' +
      '<b>Retail:</b> %{customdata.retailRate:.2f} ¢/kWh<br>' +
      '<b>Spread:</b> %{customdata.spread:.2f} ¢/kWh' +
      '<extra></extra>'

    // Group by color category
    const groups = colorBy === 'region'
      ? [...new Set(combinedData.map(p => p.region))]
      : [...new Set(combinedData.map(p => p.hub))]

    groups.forEach(group => {
      const groupData = combinedData.filter(p =>
        colorBy === 'region' ? p.region === group : p.hub === group
      )

      const colors = colorBy === 'region' ? REGION_COLORS : HUB_COLORS

      traces.push({
        x: groupData.map(p => p.wholesalePrice),
        y: groupData.map(p => p.retailRate),
        text: groupData.map(p => p.stateCode),
        customdata: groupData,
        mode: 'markers+text' as const,
        type: 'scatter' as const,
        name: group,
        marker: {
          color: colors[group] || COLORS.inkMuted,
          size: 10,
          opacity: 0.8,
          line: { color: COLORS.ink, width: 1 }
        },
        textposition: 'top center',
        textfont: { size: 8, color: COLORS.ink },
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
        showlegend: false
      })

      // Trend line
      traces.push({
        x: regression.lineX,
        y: regression.lineY,
        mode: 'lines' as const,
        type: 'scatter' as const,
        name: regression.isSignificant ? 'Trend (p<0.05)' : 'Trend (n.s.)',
        line: { color: COLORS.ink, width: 2, dash: 'dash' as const },
        hoverinfo: 'skip' as const
      })
    }

    return traces
  }, [combinedData, colorBy, regression, showTrendLine])

  const layout = useMemo(() => ({
    ...baseLayout,
    title: { text: '' },
    xaxis: {
      ...axisStyle,
      title: { text: 'Wholesale Price (¢/kWh)', ...axisTitleStyle }
    },
    yaxis: {
      ...axisStyle,
      title: { text: 'Retail Rate (¢/kWh)', ...axisTitleStyle }
    },
    legend: {
      orientation: 'h' as const,
      x: 0.5,
      xanchor: 'center' as const,
      y: -0.15
    }
  }), [])

  const plotConfig = {
    ...baseConfig,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: `wholesale-retail-${yearStart}-${yearEnd}`,
      height: 600,
      width: 900,
      scale: 2
    }
  }

  // Export data
  const exportData = combinedData.map(p => ({
    state: p.state,
    stateCode: p.stateCode,
    year: p.year,
    region: p.region,
    hub: p.hub,
    wholesale_cents_kwh: Math.round(p.wholesalePrice * 100) / 100,
    retail_cents_kwh: Math.round(p.retailRate * 100) / 100,
    spread_cents_kwh: Math.round(p.spread * 100) / 100
  }))

  // Summary stats
  const avgSpread = combinedData.length > 0
    ? combinedData.reduce((s, p) => s + p.spread, 0) / combinedData.length
    : 0

  if (loading) {
    return <div className="chart-container"><div className="loading">Loading wholesale data...</div></div>
  }

  return (
    <div className="chart-container" role="figure" aria-label="Scatter plot comparing wholesale and retail electricity prices.">
      <div className="chart-header">
        <h2>Wholesale vs. Retail Electricity Prices</h2>
        <p>
          How much markup do retail customers pay above wholesale market prices?
        </p>
      </div>

      <details className="chart-description" open>
        <summary>About this chart</summary>
        <div className="chart-description-content">
          <div className="description-section">
            <h3>What does this show?</h3>
            <p>
              Each point represents a state-year. The X-axis shows the wholesale electricity
              price at the regional trading hub. The Y-axis shows the retail rate customers
              pay. The difference (spread) includes transmission, distribution, and utility costs.
            </p>
          </div>
          <div className="description-section">
            <h3>Why do spreads vary?</h3>
            <p>
              Retail rates include fixed infrastructure costs, taxes, and utility margins.
              States with older grids or higher labor costs tend to have larger spreads.
              Regulated markets may show different patterns than deregulated ones.
            </p>
          </div>
        </div>
      </details>

      <ChartControlsWrapper>
        <div className="control-group">
          <label>Start Year</label>
          <select value={yearStart} onChange={(e) => onYearStartChange(parseInt(e.target.value))}>
            {stateData.metadata.yearsAvailable.filter(y => y < yearEnd).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>End Year</label>
          <select value={yearEnd} onChange={(e) => onYearEndChange(parseInt(e.target.value))}>
            {stateData.metadata.yearsAvailable.filter(y => y > yearStart).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Color By</label>
          <select value={colorBy} onChange={(e) => setColorBy(e.target.value as 'region' | 'hub')}>
            <option value="region">Region</option>
            <option value="hub">Trading Hub</option>
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
            <button onClick={() => downloadGenericCSV(exportData, `wholesale-retail-${yearStart}-${yearEnd}`)}>
              CSV
            </button>
            <button onClick={() => downloadGenericJSON(exportData, `wholesale-retail-${yearStart}-${yearEnd}`)}>
              JSON
            </button>
          </div>
        </div>
      </ChartControlsWrapper>

      <div className="stats-panel">
        <div className="stats-summary">
          <p className="summary-main">
            Average retail markup: <strong>{avgSpread.toFixed(2)} ¢/kWh</strong> above wholesale
          </p>
          <p className="summary-detail">
            Based on {combinedData.length} state-year observations ({yearStart}–{yearEnd})
          </p>
        </div>
        {regression && showTrendLine && (
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
                <span className="stat-label">Slope</span>
                <span className="stat-value">{regression.slope.toFixed(3)}</span>
              </div>
            </div>
          </details>
        )}
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

import { useMemo, useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import { WholesalePriceData, HUB_COLORS } from '../../types'
import { baseLayout, axisStyle, axisTitleStyle, baseConfig } from '../../utils/plotly'
import { downloadGenericCSV, downloadGenericJSON } from '../../utils/export'
import { ChartControlsWrapper } from '../controls'

interface Props {
  yearStart: number
  yearEnd: number
  yearsAvailable: number[]
  onYearStartChange: (year: number) => void
  onYearEndChange: (year: number) => void
}

/**
 * Line chart showing wholesale electricity price trends by hub over time.
 */
export default function WholesaleTrendsChart({
  yearStart,
  yearEnd,
  yearsAvailable,
  onYearStartChange,
  onYearEndChange
}: Props) {
  const [wholesaleData, setWholesaleData] = useState<WholesalePriceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showVolatility, setShowVolatility] = useState(false)

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

  // Filter and organize data by hub
  const hubData = useMemo(() => {
    if (!wholesaleData) return new Map()

    const byHub = new Map<string, Array<{ year: number; avgPrice: number; volatility: number }>>()

    wholesaleData.points.forEach(p => {
      if (p.year < yearStart || p.year > yearEnd) return

      if (!byHub.has(p.hub)) {
        byHub.set(p.hub, [])
      }
      byHub.get(p.hub)!.push({
        year: p.year,
        avgPrice: p.avgPrice,
        volatility: p.volatility
      })
    })

    // Sort by year
    byHub.forEach((data, hub) => {
      byHub.set(hub, data.sort((a, b) => a.year - b.year))
    })

    return byHub
  }, [wholesaleData, yearStart, yearEnd])

  // Build plot traces
  const plotData = useMemo(() => {
    const traces: Array<Record<string, unknown>> = []

    hubData.forEach((data, hub) => {
      // Main price line
      traces.push({
        x: data.map((d: { year: number; avgPrice: number; volatility: number }) => d.year),
        y: data.map((d: { year: number; avgPrice: number; volatility: number }) => d.avgPrice),
        mode: 'lines+markers' as const,
        type: 'scatter' as const,
        name: hub,
        line: {
          color: HUB_COLORS[hub] || '#999999',
          width: 2
        },
        marker: {
          color: HUB_COLORS[hub] || '#999999',
          size: 6
        },
        hovertemplate:
          `<b>${hub}</b> (%{x})<br>` +
          'Avg Price: $%{y:.2f}/MWh<br>' +
          '<extra></extra>'
      })

      // Volatility band if enabled
      if (showVolatility) {
        type DataPoint = { year: number; avgPrice: number; volatility: number }
        traces.push({
          x: [...data.map((d: DataPoint) => d.year), ...data.map((d: DataPoint) => d.year).reverse()],
          y: [
            ...data.map((d: DataPoint) => d.avgPrice + d.volatility),
            ...data.map((d: DataPoint) => d.avgPrice - d.volatility).reverse()
          ],
          fill: 'toself',
          fillcolor: (HUB_COLORS[hub] || '#999999') + '33',
          line: { color: 'transparent' },
          type: 'scatter' as const,
          mode: 'lines' as const,
          name: `${hub} (±1σ)`,
          showlegend: false,
          hoverinfo: 'skip' as const
        })
      }
    })

    return traces
  }, [hubData, showVolatility])

  const layout = useMemo(() => ({
    ...baseLayout,
    title: { text: '' },
    xaxis: {
      ...axisStyle,
      title: { text: 'Year', ...axisTitleStyle },
      dtick: 2
    },
    yaxis: {
      ...axisStyle,
      title: { text: 'Wholesale Price ($/MWh)', ...axisTitleStyle }
    },
    legend: {
      orientation: 'h' as const,
      x: 0.5,
      xanchor: 'center' as const,
      y: -0.2
    },
    hovermode: 'x unified' as const
  }), [])

  const plotConfig = {
    ...baseConfig,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: `wholesale-trends-${yearStart}-${yearEnd}`,
      height: 500,
      width: 900,
      scale: 2
    }
  }

  // Export data
  const exportData = wholesaleData?.points
    .filter(p => p.year >= yearStart && p.year <= yearEnd)
    .map(p => ({
      hub: p.hub,
      year: p.year,
      avg_price_mwh: p.avgPrice,
      min_price_mwh: p.minPrice,
      max_price_mwh: p.maxPrice,
      volatility: p.volatility,
      region: p.region
    })) || []

  if (loading) {
    return <div className="chart-container"><div className="loading">Loading wholesale data...</div></div>
  }

  return (
    <div className="chart-container" role="figure" aria-label="Line chart showing wholesale electricity price trends by hub.">
      <div className="chart-header">
        <h2>Wholesale Price Trends by Hub</h2>
        <p>
          How have wholesale electricity prices evolved at major trading hubs?
        </p>
      </div>

      <details className="chart-description">
        <summary>About this chart</summary>
        <div className="chart-description-content">
          <div className="description-section">
            <h3>What are trading hubs?</h3>
            <p>
              Wholesale electricity is traded at regional hubs representing major market areas.
              PJM West serves the Mid-Atlantic, ERCOT North serves Texas, and so on.
              Prices at these hubs reflect supply/demand in their regions.
            </p>
          </div>
          <div className="description-section">
            <h3>What drives price differences?</h3>
            <p>
              Hub prices vary based on fuel costs (especially natural gas), transmission
              constraints, renewable penetration, and local demand patterns. The volatility
              band shows price variability throughout the year.
            </p>
          </div>
        </div>
      </details>

      <ChartControlsWrapper>
        <div className="control-group">
          <label>Start Year</label>
          <select value={yearStart} onChange={(e) => onYearStartChange(parseInt(e.target.value))}>
            {yearsAvailable.filter(y => y < yearEnd).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>End Year</label>
          <select value={yearEnd} onChange={(e) => onYearEndChange(parseInt(e.target.value))}>
            {yearsAvailable.filter(y => y > yearStart).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Display</label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showVolatility}
              onChange={(e) => setShowVolatility(e.target.checked)}
            />
            Show Volatility
          </label>
        </div>

        <div className="control-group">
          <label>Export</label>
          <div className="button-group">
            <button onClick={() => downloadGenericCSV(exportData, `wholesale-trends-${yearStart}-${yearEnd}`)}>
              CSV
            </button>
            <button onClick={() => downloadGenericJSON(exportData, `wholesale-trends-${yearStart}-${yearEnd}`)}>
              JSON
            </button>
          </div>
        </div>
      </ChartControlsWrapper>

      <div className="stats-panel">
        <div className="stats-summary">
          <p className="summary-main">
            Showing {hubData.size} trading hubs from {yearStart} to {yearEnd}
          </p>
        </div>
      </div>

      <div className="chart-plot-wrapper">
        <Plot
          data={plotData}
          layout={layout}
          config={plotConfig}
          style={{ width: '100%', height: '450px' }}
        />
      </div>
    </div>
  )
}

import { useMemo, useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import { OutageEventData, CAUSE_COLORS } from '../../types'
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
 * Stacked bar chart showing outage events by cause category over time.
 */
export default function OutageCausesChart({
  yearStart,
  yearEnd,
  yearsAvailable,
  onYearStartChange,
  onYearEndChange
}: Props) {
  const [outageData, setOutageData] = useState<OutageEventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedState, setSelectedState] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'count' | 'customers'>('count')

  // Load outage data
  useEffect(() => {
    fetch('/data/outage-events.json')
      .then(res => res.json())
      .then(data => {
        setOutageData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load outage data:', err)
        setLoading(false)
      })
  }, [])

  // Get unique states
  const states = useMemo(() => {
    if (!outageData) return ['all']
    const stateSet = new Set(outageData.stateYearSummary.map(s => s.stateCode))
    return ['all', ...Array.from(stateSet).sort()]
  }, [outageData])

  // Aggregate data by year and cause
  const yearlyData = useMemo(() => {
    if (!outageData) return new Map()

    const byYear = new Map<number, {
      weather: number
      equipment: number
      demand: number
      other: number
      total: number
    }>()

    outageData.stateYearSummary.forEach(s => {
      if (s.year < yearStart || s.year > yearEnd) return
      if (selectedState !== 'all' && s.stateCode !== selectedState) return

      if (!byYear.has(s.year)) {
        byYear.set(s.year, { weather: 0, equipment: 0, demand: 0, other: 0, total: 0 })
      }

      const yearData = byYear.get(s.year)!
      if (viewMode === 'count') {
        yearData.weather += s.weatherEvents
        yearData.equipment += s.equipmentEvents
        yearData.demand += s.demandEvents
        yearData.other += s.otherEvents
        yearData.total += s.totalEvents
      } else {
        // Use customer impact as weight
        const total = s.totalEvents || 1
        yearData.weather += (s.weatherEvents / total) * s.totalCustomersAffected
        yearData.equipment += (s.equipmentEvents / total) * s.totalCustomersAffected
        yearData.demand += (s.demandEvents / total) * s.totalCustomersAffected
        yearData.other += (s.otherEvents / total) * s.totalCustomersAffected
        yearData.total += s.totalCustomersAffected
      }
    })

    return byYear
  }, [outageData, yearStart, yearEnd, selectedState, viewMode])

  // Build plot traces
  const plotData = useMemo(() => {
    const years = Array.from(yearlyData.keys()).sort()
    const causes = ['weather', 'equipment', 'demand', 'other'] as const

    return causes.map(cause => ({
      x: years,
      y: years.map(y => yearlyData.get(y)?.[cause] || 0),
      type: 'bar' as const,
      name: cause.charAt(0).toUpperCase() + cause.slice(1),
      marker: {
        color: CAUSE_COLORS[cause]
      },
      hovertemplate:
        `<b>${cause.charAt(0).toUpperCase() + cause.slice(1)}</b> (%{x})<br>` +
        (viewMode === 'count'
          ? '%{y} events'
          : '%{y:,.0f} customers affected') +
        '<extra></extra>'
    }))
  }, [yearlyData, viewMode])

  const layout = useMemo(() => ({
    ...baseLayout,
    title: { text: '' },
    barmode: 'stack' as const,
    xaxis: {
      ...axisStyle,
      title: { text: 'Year', ...axisTitleStyle },
      dtick: 1
    },
    yaxis: {
      ...axisStyle,
      title: {
        text: viewMode === 'count' ? 'Number of Events' : 'Customers Affected',
        ...axisTitleStyle
      }
    },
    legend: {
      orientation: 'h' as const,
      x: 0.5,
      xanchor: 'center' as const,
      y: -0.2
    }
  }), [viewMode])

  const plotConfig = {
    ...baseConfig,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: `outage-causes-${yearStart}-${yearEnd}`,
      height: 500,
      width: 900,
      scale: 2
    }
  }

  // Export data
  const exportData = Array.from(yearlyData.entries()).map(([year, data]) => ({
    year,
    weather_events: Math.round(data.weather),
    equipment_events: Math.round(data.equipment),
    demand_events: Math.round(data.demand),
    other_events: Math.round(data.other),
    total: Math.round(data.total)
  }))

  // Summary stats
  const totals = useMemo(() => {
    let weather = 0, equipment = 0, demand = 0, other = 0
    yearlyData.forEach(data => {
      weather += data.weather
      equipment += data.equipment
      demand += data.demand
      other += data.other
    })
    const total = weather + equipment + demand + other
    return {
      weather, equipment, demand, other, total,
      weatherPct: total > 0 ? (weather / total * 100) : 0
    }
  }, [yearlyData])

  if (loading) {
    return <div className="chart-container"><div className="loading">Loading outage data...</div></div>
  }

  const stateLabel = selectedState === 'all' ? 'All States' : selectedState

  return (
    <div className="chart-container" role="figure" aria-label="Stacked bar chart showing outage events by cause.">
      <div className="chart-header">
        <h2>Power Outages by Cause</h2>
        <p>
          What causes major power outages in {stateLabel}?
        </p>
      </div>

      <details className="chart-description" open>
        <summary>About this chart</summary>
        <div className="chart-description-content">
          <div className="description-section">
            <h3>What does this show?</h3>
            <p>
              Major power disturbance events reported to the Department of Energy,
              categorized by cause. Weather-related events include storms, extreme
              temperatures, and natural disasters. Equipment failures include
              transmission and distribution system issues.
            </p>
          </div>
          <div className="description-section">
            <h3>Data source</h3>
            <p>
              Based on DOE-417 Electric Emergency Incident and Disturbance Reports.
              Only major events (affecting 50,000+ customers for 1+ hour) are included.
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
          <label>State</label>
          <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
            <option value="all">All States</option>
            {states.filter(s => s !== 'all').map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Metric</label>
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value as 'count' | 'customers')}>
            <option value="count">Event Count</option>
            <option value="customers">Customers Affected</option>
          </select>
        </div>

        <div className="control-group">
          <label>Export</label>
          <div className="button-group">
            <button onClick={() => downloadGenericCSV(exportData, `outage-causes-${selectedState}-${yearStart}-${yearEnd}`)}>
              CSV
            </button>
            <button onClick={() => downloadGenericJSON(exportData, `outage-causes-${selectedState}-${yearStart}-${yearEnd}`)}>
              JSON
            </button>
          </div>
        </div>
      </ChartControlsWrapper>

      <div className="stats-panel">
        <div className="stats-summary">
          <p className="summary-main">
            <strong>{totals.weatherPct.toFixed(0)}%</strong> of major outages are weather-related
          </p>
          <p className="summary-detail">
            {Math.round(totals.total).toLocaleString()} total {viewMode === 'count' ? 'events' : 'customer impacts'} ({yearStart}–{yearEnd})
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

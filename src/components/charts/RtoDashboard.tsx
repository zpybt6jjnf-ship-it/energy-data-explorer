import { useMemo, useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import { UtilityData, UtilityDataPoint } from '../../types'
import { baseLayout, axisStyle, axisTitleStyle, baseConfig } from '../../utils/plotly'
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

interface RtoYearData {
  rto: string
  year: number
  avgMetric: number
  totalCustomers: number
  utilityCount: number
}

// Colors for RTOs
const RTO_COLORS: Record<string, string> = {
  'PJM': '#e41a1c',
  'MISO': '#377eb8',
  'ERCOT': '#4daf4a',
  'SPP': '#984ea3',
  'CAISO': '#ff7f00',
  'ISO-NE': '#a65628',
  'NYISO': '#f781bf',
  'Non-RTO': '#999999'
}

/**
 * Small multiples dashboard showing reliability trends by RTO region.
 * Each panel shows customer-weighted average SAIDI/SAIFI over time for an RTO.
 */
export default function RtoDashboard({
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

  // Get metric value from utility
  const getMetricValue = (u: UtilityDataPoint): number | null => {
    if (includeMED) {
      const withMEDKey = reliabilityMetric === 'saidi' ? 'saidiWithMED' : 'saifiWithMED'
      const withMEDValue = u[withMEDKey] as number | null
      if (withMEDValue !== null) return withMEDValue
    }
    return u[reliabilityMetric] as number | null
  }

  // Calculate customer-weighted average per RTO per year
  const rtoData = useMemo((): RtoYearData[] => {
    if (!utilityData) return []

    const rtoYearMap = new Map<string, {
      weightedSum: number
      totalCustomers: number
      count: number
    }>()

    utilityData.utilities.forEach(u => {
      if (u.year < yearStart || u.year > yearEnd) return
      const metricValue = getMetricValue(u)
      if (metricValue === null || !u.customers) return

      const rto = u.primaryRto || 'Non-RTO'
      const key = `${rto}-${u.year}`

      if (!rtoYearMap.has(key)) {
        rtoYearMap.set(key, { weightedSum: 0, totalCustomers: 0, count: 0 })
      }

      const entry = rtoYearMap.get(key)!
      entry.weightedSum += metricValue * u.customers
      entry.totalCustomers += u.customers
      entry.count += 1
    })

    const results: RtoYearData[] = []
    rtoYearMap.forEach((value, key) => {
      const [rto, yearStr] = key.split('-')
      const year = parseInt(yearStr)
      if (value.totalCustomers > 0) {
        results.push({
          rto,
          year,
          avgMetric: value.weightedSum / value.totalCustomers,
          totalCustomers: value.totalCustomers,
          utilityCount: value.count
        })
      }
    })

    return results.sort((a, b) => a.year - b.year || a.rto.localeCompare(b.rto))
  }, [utilityData, yearStart, yearEnd, reliabilityMetric, includeMED])

  // Group by RTO
  const rtoGroups = useMemo(() => {
    const groups = new Map<string, RtoYearData[]>()

    rtoData.forEach(d => {
      if (!groups.has(d.rto)) {
        groups.set(d.rto, [])
      }
      groups.get(d.rto)!.push(d)
    })

    // Sort RTOs by average metric value
    return Array.from(groups.entries())
      .map(([rto, data]) => ({
        rto,
        data: data.sort((a, b) => a.year - b.year),
        avgMetric: data.reduce((s, d) => s + d.avgMetric, 0) / data.length,
        totalCustomers: data.reduce((s, d) => s + d.totalCustomers, 0) / data.length
      }))
      .sort((a, b) => a.avgMetric - b.avgMetric)
  }, [rtoData])

  const metricLabel = reliabilityMetric === 'saidi' ? 'SAIDI' : 'SAIFI'
  const unit = reliabilityMetric === 'saidi' ? 'min' : 'interruptions'

  // Find max Y value for consistent scales
  const maxY = useMemo(() => {
    return Math.max(...rtoData.map(d => d.avgMetric), 0) * 1.1
  }, [rtoData])

  // Build traces for all RTOs in one chart
  const plotData = useMemo(() => {
    return rtoGroups.map(group => ({
      x: group.data.map(d => d.year),
      y: group.data.map(d => d.avgMetric),
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: group.rto,
      line: {
        color: RTO_COLORS[group.rto] || '#999999',
        width: 2
      },
      marker: {
        color: RTO_COLORS[group.rto] || '#999999',
        size: 6
      },
      hovertemplate:
        `<b>${group.rto}</b> (%{x})<br>` +
        `${metricLabel}: %{y:.1f} ${unit}<br>` +
        '<extra></extra>'
    }))
  }, [rtoGroups, metricLabel, unit])

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
      title: { text: `Customer-Weighted Avg ${metricLabel} (${unit})`, ...axisTitleStyle },
      range: [0, maxY]
    },
    legend: {
      orientation: 'h' as const,
      x: 0.5,
      xanchor: 'center' as const,
      y: -0.15
    },
    hovermode: 'x unified' as const
  }), [metricLabel, unit, maxY])

  const plotConfig = {
    ...baseConfig,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: `rto-reliability-${yearStart}-${yearEnd}`,
      height: 600,
      width: 1000,
      scale: 2
    }
  }

  // Export data
  const exportData = rtoData.map(d => ({
    rto: d.rto,
    year: d.year,
    [`avg_${reliabilityMetric}`]: Math.round(d.avgMetric * 100) / 100,
    total_customers: d.totalCustomers,
    utility_count: d.utilityCount
  }))

  if (loading) {
    return (
      <div className="chart-container">
        <div className="loading">Loading utility data...</div>
      </div>
    )
  }

  return (
    <div className="chart-container" role="figure" aria-label={`Line chart showing ${metricLabel} trends across RTO regions.`}>
      <div className="chart-header">
        <h2>RTO Region Reliability Comparison</h2>
        <p>
          Compare grid reliability across Regional Transmission Organizations (RTOs).
          Values are customer-weighted averages of utilities in each RTO.
        </p>
      </div>

      <details className="chart-description" open>
        <summary>About this chart</summary>
        <div className="chart-description-content">
          <div className="description-section">
            <h3>What are RTOs?</h3>
            <p>
              Regional Transmission Organizations (RTOs) operate the electric grid across
              regions, coordinating wholesale electricity markets and ensuring grid reliability.
              Major U.S. RTOs include PJM, MISO, ERCOT, SPP, CAISO, ISO-NE, and NYISO.
            </p>
          </div>
          <div className="description-section">
            <h3>How is this calculated?</h3>
            <p>
              Each line shows the <strong>customer-weighted average</strong> of reliability
              metrics for all utilities in that RTO. This means larger utilities (with more
              customers) have more influence on the average than smaller ones.
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
            <button onClick={() => downloadGenericCSV(exportData, `rto-reliability-${yearStart}-${yearEnd}`)}>
              CSV
            </button>
            <button onClick={() => downloadGenericJSON(exportData, `rto-reliability-${yearStart}-${yearEnd}`)}>
              JSON
            </button>
          </div>
        </div>
      </ChartControlsWrapper>

      <div className="stats-panel">
        <div className="stats-summary">
          <p className="summary-main">
            Showing {rtoGroups.length} RTO regions from {yearStart} to {yearEnd}
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

import { useMemo, useCallback, useRef } from 'react'
import Plot from 'react-plotly.js'
import { ChartData, ChartFilters } from '../types'
import { downloadCSV, downloadJSON } from '../utils/export'
import { COLORS, LINE_COLORS, baseLayout, axisStyle, axisTitleStyle, baseConfig } from '../utils/plotly'

interface Props {
  data: ChartData
  filters: ChartFilters
  onFilterChange: (filters: Partial<ChartFilters>) => void
  onResetViewport?: () => void
}

type ReliabilityMetric = 'saidi' | 'saifi'

const METRIC_INFO: Record<ReliabilityMetric, { label: string; unit: string; description: string; yAxisLabel: string }> = {
  saidi: {
    label: 'SAIDI',
    unit: 'minutes',
    description: 'System Average Interruption Duration Index - average outage minutes per customer per year',
    yAxisLabel: 'SAIDI (minutes) — Higher = longer outages'
  },
  saifi: {
    label: 'SAIFI',
    unit: 'interruptions',
    description: 'System Average Interruption Frequency Index - average number of outages per customer per year',
    yAxisLabel: 'SAIFI (interruptions) — Higher = more frequent outages'
  }
}

export default function SaidiOverTimeChart({ data, filters, onFilterChange, onResetViewport }: Props) {
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
          timeXRange: xRange,
          timeYRange: yRange
        })
      }

      if (e['xaxis.autorange'] === true || e['yaxis.autorange'] === true) {
        onFilterChangeRef.current({ timeXRange: null, timeYRange: null })
      }
    })
  }, [])

  // Get metric info for current selection
  const metric = filters.reliabilityMetric
  const metricInfo = METRIC_INFO[metric]

  // Filter data by year range and valid metric (exclude null values)
  const filteredData = useMemo(() => {
    return data.points.filter(point =>
      point.year >= filters.yearStart &&
      point.year <= filters.yearEnd &&
      point[metric] !== null
    ) as Array<typeof data.points[0] & { saidi: number; saifi: number }>
  }, [data.points, filters.yearStart, filters.yearEnd, metric])

  // Get unique states
  const availableStates = useMemo(() => {
    return [...new Set(filteredData.map(p => p.stateCode))].sort()
  }, [filteredData])

  // Compute national average by year
  const nationalAverage = useMemo(() => {
    const years = [...new Set(filteredData.map(p => p.year))].sort()
    return years.map(year => {
      const yearPoints = filteredData.filter(p => p.year === year)
      const avg = yearPoints.reduce((sum, p) => sum + p[metric]!, 0) / yearPoints.length
      return { year, avg }
    })
  }, [filteredData, metric])

  // Get state info for selected states
  const selectedStateData = useMemo(() => {
    const states = filters.selectedStates.length > 0
      ? filters.selectedStates
      : availableStates.slice(0, 5) // Default to first 5 states

    return states.map((stateCode, i) => {
      const statePoints = filteredData
        .filter(p => p.stateCode === stateCode)
        .sort((a, b) => a.year - b.year)

      const stateName = statePoints[0]?.state || stateCode
      const region = statePoints[0]?.region || 'Unknown'

      return {
        stateCode,
        stateName,
        region,
        points: statePoints,
        color: LINE_COLORS[i % LINE_COLORS.length]
      }
    })
  }, [filteredData, filters.selectedStates, availableStates])

  // Build plot traces
  const plotData = useMemo(() => {
    const traces: Array<Record<string, unknown>> = []
    const metricFormat = metric === 'saidi' ? '.1f' : '.2f'
    const unitLabel = metricInfo.unit

    // National average reference line
    traces.push({
      x: nationalAverage.map(p => p.year),
      y: nationalAverage.map(p => p.avg),
      mode: 'lines',
      type: 'scatter',
      name: 'National Avg',
      line: {
        color: COLORS.inkMuted,
        width: 2,
        dash: 'dot'
      },
      hovertemplate: `<b>National Average</b><br>Year: %{x}<br>${metricInfo.label}: %{y:${metricFormat}} ${unitLabel}<extra></extra>`
    })

    // State lines
    selectedStateData.forEach(state => {
      const stateAvg = state.points.length > 0
        ? state.points.reduce((s, p) => s + p[metric]!, 0) / state.points.length
        : 0

      traces.push({
        x: state.points.map(p => p.year),
        y: state.points.map(p => p[metric]),
        mode: 'lines+markers',
        type: 'scatter',
        name: `${state.stateName} (${state.stateCode})`,
        line: {
          color: state.color,
          width: 2.5
        },
        marker: {
          color: state.color,
          size: 7,
          line: { color: COLORS.ink, width: 1 }
        },
        customdata: state.points.map(p => ({
          state: p.state,
          stateCode: p.stateCode,
          year: p.year,
          region: p.region,
          metricValue: p[metric],
          stateAvg: stateAvg.toFixed(metric === 'saidi' ? 1 : 2),
          natAvg: (nationalAverage.find(n => n.year === p.year)?.avg || 0).toFixed(metric === 'saidi' ? 1 : 2)
        })),
        hovertemplate:
          '<b>%{customdata.state}</b> (%{customdata.year})<br>' +
          `<span style="color:${COLORS.inkMuted}">%{customdata.region}</span><br><br>` +
          `${metricInfo.label}: %{customdata.metricValue:${metricFormat}} ${unitLabel}<br>` +
          `State avg: %{customdata.stateAvg} ${unitLabel}<br>` +
          `National avg: %{customdata.natAvg} ${unitLabel}` +
          '<extra></extra>'
      })
    })

    return traces
  }, [selectedStateData, nationalAverage, metric, metricInfo])

  const layout = useMemo(() => ({
    ...baseLayout,
    title: { text: '' },
    xaxis: {
      ...axisStyle,
      title: { text: 'Year', ...axisTitleStyle },
      dtick: 1,
      range: filters.timeXRange || undefined,
      autorange: filters.timeXRange ? false : true
    },
    yaxis: {
      ...axisStyle,
      title: { text: metricInfo.yAxisLabel, ...axisTitleStyle },
      range: filters.timeYRange || undefined,
      autorange: filters.timeYRange ? false : true
    }
  }), [filters.timeXRange, filters.timeYRange, metricInfo.yAxisLabel])

  const config = {
    ...baseConfig,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: 'saidi-over-time',
      height: 700,
      width: 1200,
      scale: 2
    }
  }

  // Get data for selected states only (for export)
  const exportData = useMemo(() => {
    const stateCodes = filters.selectedStates.length > 0
      ? filters.selectedStates
      : availableStates.slice(0, 5)
    return filteredData.filter(p => stateCodes.includes(p.stateCode))
  }, [filteredData, filters.selectedStates, availableStates])

  return (
    <div className="chart-container" role="figure" aria-label="Line chart showing SAIDI trends over time by state">
      <div className="chart-header">
        <h2>Reliability Trends by State</h2>
        <p>How has outage duration changed over time? Select states to compare.</p>
      </div>

      <details className="chart-description" open>
        <summary>About this chart</summary>
        <div className="chart-description-content">
          <div className="description-section">
            <h3>What are we measuring?</h3>
            <dl>
              <dt>SAIDI (System Average Interruption Duration Index)</dt>
              <dd>The average number of minutes per year that a customer experiences a power outage. Lower values indicate more reliable grid service.</dd>

              <dt>SAIFI (System Average Interruption Frequency Index)</dt>
              <dd>The average number of power interruptions per customer per year. Lower values indicate fewer outage events, regardless of duration.</dd>
            </dl>
          </div>

          <div className="description-section">
            <h3>Why track reliability over time?</h3>
            <p>Understanding how grid reliability evolves helps identify whether states are improving or declining in service quality, and whether changes correlate with policy decisions, infrastructure investments, or shifts in generation mix.</p>
            <p className="description-caveat">Note: Grid reliability is affected by many factors including infrastructure age, weather patterns, investment levels, and grid management practices.</p>
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
          <label>Metric</label>
          <select
            value={filters.reliabilityMetric}
            onChange={(e) => onFilterChange({ reliabilityMetric: e.target.value as 'saidi' | 'saifi' })}
            title={METRIC_INFO[filters.reliabilityMetric].description}
          >
            <option value="saidi">SAIDI (Duration)</option>
            <option value="saifi">SAIFI (Frequency)</option>
          </select>
          <span className="control-hint">{metric === 'saidi' ? 'Outage minutes per customer' : 'Outages per customer'}</span>
        </div>

        <div className="control-group">
          <label>Select States</label>
          <select
            multiple
            size={5}
            value={filters.selectedStates}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, opt => opt.value)
              onFilterChange({ selectedStates: selected })
            }}
          >
            {availableStates.map(state => (
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
            disabled={!filters.timeXRange && !filters.timeYRange}
            title="Reset to default zoom level"
          >
            Reset Zoom
          </button>
        </div>

        <div className="control-group">
          <label>Export</label>
          <div className="button-group">
            <button
              onClick={() => downloadCSV(exportData, `saidi-time-${filters.yearStart}-${filters.yearEnd}`)}
              title="Download filtered data as CSV"
            >
              CSV
            </button>
            <button
              onClick={() => downloadJSON(exportData, `saidi-time-${filters.yearStart}-${filters.yearEnd}`)}
              title="Download filtered data as JSON"
            >
              JSON
            </button>
          </div>
        </div>
      </div>

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

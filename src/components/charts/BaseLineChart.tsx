import { useMemo, useCallback, useRef } from 'react'
import Plot from 'react-plotly.js'
import { ChartData, ChartFilters, StateDataPoint } from '../../types'
import { LineChartConfig, MetricOption } from '../../types/chartConfig'
// Export functions are used via ExportButtons component
import { COLORS, LINE_COLORS, baseLayout, axisStyle, axisTitleStyle, baseConfig } from '../../utils/plotly'
import StateFilter from '../filters/StateFilter'
import { YearRangeSelector, ExportButtons, ChartControlsWrapper } from '../controls'

export interface BaseLineChartProps {
  config: LineChartConfig
  data: ChartData
  filters: ChartFilters
  onFilterChange: (filters: Partial<ChartFilters>) => void
  onResetViewport?: () => void
  /** Number of default states to show when none selected */
  defaultStateCount?: number
}

interface MetricInfo {
  label: string
  unit: string
  description: string
  yAxisLabel: string
  format: string
}

/**
 * Base line chart component for time series visualizations.
 * Shows trend lines for selected states over time.
 */
export default function BaseLineChart({
  config,
  data,
  filters,
  onFilterChange,
  onResetViewport,
  defaultStateCount = 5
}: BaseLineChartProps) {
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

  // Get metric info based on config and current filter
  const metricKey = filters.reliabilityMetric || config.defaultMetric || config.metrics?.[0]?.value || 'saidi'
  const metricOption = config.metrics?.find(m => m.value === metricKey)

  const metricInfo: MetricInfo = metricOption ? {
    label: metricOption.label,
    unit: metricOption.unit,
    description: metricOption.description,
    yAxisLabel: config.yAxis.label.replace('{metric}', metricOption.label),
    format: metricOption.format || '.1f'
  } : {
    label: config.yAxis.label,
    unit: config.yAxis.suffix || '',
    description: '',
    yAxisLabel: config.yAxis.label,
    format: config.yAxis.format || '.1f'
  }

  // Helper to get Y value from a point
  const getYValue = useCallback((point: StateDataPoint): number | null => {
    // Handle metric switching
    if (config.metrics && (metricKey === 'saidi' || metricKey === 'saifi')) {
      return point[metricKey as keyof StateDataPoint] as number | null
    }
    // Handle rate metrics
    if (metricKey.startsWith('rate')) {
      return point[metricKey as keyof StateDataPoint] as number | null
    }
    const field = config.yAxis.field as keyof StateDataPoint
    return point[field] as number | null
  }, [config.yAxis.field, config.metrics, metricKey])

  // Filter data by year range and valid metric
  const filteredData = useMemo(() => {
    return data.points.filter(point =>
      point.year >= filters.yearStart &&
      point.year <= filters.yearEnd &&
      getYValue(point) !== null
    )
  }, [data.points, filters.yearStart, filters.yearEnd, getYValue])

  // Get unique states
  const availableStates = useMemo(() => {
    return [...new Set(filteredData.map(p => p.stateCode))].sort()
  }, [filteredData])

  // Compute national average by year
  const nationalAverage = useMemo(() => {
    const years = [...new Set(filteredData.map(p => p.year))].sort()
    return years.map(year => {
      const yearPoints = filteredData.filter(p => p.year === year)
      const avg = yearPoints.reduce((sum, p) => sum + getYValue(p)!, 0) / yearPoints.length
      return { year, avg }
    })
  }, [filteredData, getYValue])

  // Get state info for selected states
  const selectedStateData = useMemo(() => {
    const states = filters.selectedStates.length > 0
      ? filters.selectedStates
      : availableStates.slice(0, defaultStateCount)

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
  }, [filteredData, filters.selectedStates, availableStates, defaultStateCount])

  // Build plot traces
  const plotData = useMemo(() => {
    const traces: Array<Record<string, unknown>> = []
    const metricFormat = metricInfo.format
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
        ? state.points.reduce((s, p) => s + getYValue(p)!, 0) / state.points.length
        : 0

      traces.push({
        x: state.points.map(p => p.year),
        y: state.points.map(p => getYValue(p)),
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
          metricValue: getYValue(p),
          stateAvg: stateAvg.toFixed(metricInfo.format === '.2f' ? 2 : 1),
          natAvg: (nationalAverage.find(n => n.year === p.year)?.avg || 0).toFixed(metricInfo.format === '.2f' ? 2 : 1)
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
  }, [selectedStateData, nationalAverage, metricInfo, getYValue])

  const layout = useMemo(() => ({
    ...baseLayout,
    title: { text: '' },
    xaxis: {
      ...axisStyle,
      title: { text: config.xAxis.label, ...axisTitleStyle },
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
  }), [filters.timeXRange, filters.timeYRange, metricInfo.yAxisLabel, config.xAxis.label])

  const plotConfig = {
    ...baseConfig,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: config.exportFilename || config.id,
      height: 700,
      width: 1200,
      scale: 2
    }
  }

  // Get data for selected states only (for export)
  const exportData = useMemo(() => {
    const stateCodes = filters.selectedStates.length > 0
      ? filters.selectedStates
      : availableStates.slice(0, defaultStateCount)
    return filteredData.filter(p => stateCodes.includes(p.stateCode))
  }, [filteredData, filters.selectedStates, availableStates, defaultStateCount])

  return (
    <div className="chart-container" role="figure" aria-label={`Line chart showing ${metricInfo.label} trends over time by state`}>
      <div className="chart-header">
        <h2>{config.title}</h2>
        {config.subtitle && <p>{config.subtitle}</p>}
      </div>

      {config.description && (
        <details className="chart-description" open>
          <summary>About this chart</summary>
          <div className="chart-description-content">
            {config.description.whatMeasuring && (
              <div className="description-section">
                <h3>What are we measuring?</h3>
                <dl>
                  {config.description.whatMeasuring.map(item => (
                    <div key={item.term}>
                      <dt>{item.term}</dt>
                      <dd>{item.definition}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {config.description.whyCompare && (
              <div className="description-section">
                <h3>Why track over time?</h3>
                <p>{config.description.whyCompare}</p>
                {config.description.caveat && (
                  <p className="description-caveat">{config.description.caveat}</p>
                )}
              </div>
            )}
          </div>
        </details>
      )}

      <ChartControlsWrapper>
        <YearRangeSelector
          yearStart={filters.yearStart}
          yearEnd={filters.yearEnd}
          yearsAvailable={data.metadata.yearsAvailable}
          onChange={onFilterChange}
        />

        {config.metrics && config.metrics.length > 1 && (
          <div className="control-group">
            <label>Measure</label>
            <select
              value={metricKey}
              onChange={(e) => onFilterChange({ reliabilityMetric: e.target.value as ChartFilters['reliabilityMetric'] })}
              title={metricInfo.description}
            >
              {config.metrics.map((m: MetricOption) => (
                <option key={m.value} value={m.value}>{m.shortLabel || m.label}</option>
              ))}
            </select>
            <span className="control-hint">{metricInfo.description}</span>
          </div>
        )}

        <StateFilter
          selectedStates={filters.selectedStates}
          availableStates={availableStates}
          onChange={(states) => onFilterChange({ selectedStates: states })}
        />

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

        <ExportButtons
          data={exportData}
          filename={`${config.exportFilename || config.id}-${filters.yearStart}-${filters.yearEnd}`}
        />
      </ChartControlsWrapper>

      <p className="chart-interaction-hint">
        Drag to zoom · Double-click to reset
      </p>

      <div className="chart-plot-wrapper">
        <Plot
          data={plotData}
          layout={layout}
          config={plotConfig}
          style={{ width: '100%', height: '100%' }}
          onInitialized={handleInitialized}
          onUpdate={handleInitialized}
        />
      </div>
    </div>
  )
}

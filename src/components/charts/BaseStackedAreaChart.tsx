import { useMemo, useCallback, useRef } from 'react'
import Plot from 'react-plotly.js'
import { ChartData, ChartFilters, StateDataPoint } from '../../types'
import { StackedAreaChartConfig } from '../../types/chartConfig'
import { COLORS, baseLayout, axisStyle, axisTitleStyle, baseConfig } from '../../utils/plotly'
import { YearRangeSelector, ExportButtons, ChartControlsWrapper } from '../controls'

export interface BaseStackedAreaChartProps {
  config: StackedAreaChartConfig
  data: ChartData
  filters: ChartFilters
  onFilterChange: (filters: Partial<ChartFilters>) => void
  onResetViewport?: () => void
  /** Selected state to display (single state for clarity) */
  selectedState: string
  onStateChange: (state: string) => void
}

/**
 * Base stacked area chart component for showing composition over time.
 * Shows how different categories (e.g., fuel types) contribute to a total.
 */
export default function BaseStackedAreaChart({
  config,
  data,
  filters,
  onFilterChange,
  onResetViewport,
  selectedState,
  onStateChange
}: BaseStackedAreaChartProps) {
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

  // Get unique states from data
  const availableStates = useMemo(() => {
    return [...new Set(data.points.map(p => p.stateCode))].sort()
  }, [data.points])

  // Filter data by year range and selected state
  const filteredData = useMemo(() => {
    return data.points.filter(point =>
      point.year >= filters.yearStart &&
      point.year <= filters.yearEnd &&
      point.stateCode === selectedState
    ).sort((a, b) => a.year - b.year)
  }, [data.points, filters.yearStart, filters.yearEnd, selectedState])

  // Get the state name for display
  const stateName = filteredData[0]?.state || selectedState

  // Calculate percentages if needed
  const chartData = useMemo(() => {
    if (!config.showAsPercentage) {
      return filteredData
    }

    return filteredData.map(point => {
      const total = config.series.reduce((sum, s) => {
        const val = point[s.field as keyof StateDataPoint] as number
        return sum + (val || 0)
      }, 0)

      const percentages: Record<string, number> = {}
      config.series.forEach(s => {
        const val = point[s.field as keyof StateDataPoint] as number
        percentages[s.field] = total > 0 ? (val / total) * 100 : 0
      })

      return { ...point, ...percentages }
    })
  }, [filteredData, config.series, config.showAsPercentage])

  // Build plot traces
  const plotData = useMemo(() => {
    const years = chartData.map(p => p.year)

    return config.series.map(series => {
      const values = chartData.map(p => {
        const val = p[series.field as keyof typeof p] as number
        return val || 0
      })

      const unit = config.showAsPercentage ? '%' : 'TWh'
      const format = config.showAsPercentage ? '.1f' : ',.0f'

      return {
        x: years,
        y: values,
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: series.label,
        stackgroup: 'one',
        fillcolor: series.color,
        line: { color: series.color, width: 0 },
        hovertemplate: `<b>${series.label}</b><br>Year: %{x}<br>Generation: %{y:${format}} ${unit}<extra></extra>`
      }
    })
  }, [chartData, config.series, config.showAsPercentage])

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
      title: {
        text: config.showAsPercentage ? 'Share of Generation (%)' : config.yAxis.label,
        ...axisTitleStyle
      },
      range: filters.timeYRange || undefined,
      autorange: filters.timeYRange ? false : true,
      ticksuffix: config.showAsPercentage ? '%' : ''
    },
    hovermode: 'x unified' as const
  }), [filters.timeXRange, filters.timeYRange, config.xAxis.label, config.yAxis.label, config.showAsPercentage])

  const plotConfig = {
    ...baseConfig,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: `${config.exportFilename || config.id}-${selectedState}`,
      height: 700,
      width: 1200,
      scale: 2
    }
  }

  return (
    <div className="chart-container" role="figure" aria-label={`Stacked area chart showing ${config.title} for ${stateName}`}>
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
                <h3>Why track energy mix?</h3>
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

        <div className="control-group">
          <label>State</label>
          <select
            value={selectedState}
            onChange={(e) => onStateChange(e.target.value)}
          >
            {availableStates.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
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

        <ExportButtons
          data={filteredData}
          filename={`${config.exportFilename || config.id}-${selectedState}-${filters.yearStart}-${filters.yearEnd}`}
        />
      </ChartControlsWrapper>

      <p className="chart-interaction-hint">
        Drag to zoom · Double-click to reset · Showing: <strong>{stateName}</strong>
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

      {/* Legend */}
      <div className="stacked-area-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem', justifyContent: 'center' }}>
        {config.series.map(series => (
          <div key={series.field} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              width: '1rem',
              height: '1rem',
              backgroundColor: series.color,
              borderRadius: '2px'
            }} />
            <span style={{ color: COLORS.ink, fontSize: '0.875rem' }}>{series.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

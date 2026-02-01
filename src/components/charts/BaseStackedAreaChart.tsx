import { useMemo, useCallback, useRef } from 'react'
import Plot from 'react-plotly.js'
import { ChartData, ChartFilters, StateDataPoint } from '../../types'
import { StackedAreaChartConfig } from '../../types/chartConfig'
import { baseConfig } from '../../utils/plotly'
import { useChartTheme } from '../../hooks/useChartTheme'
import { YearRangeSelector, ExportButtons, ChartControlsWrapper } from '../controls'
import { STATE_GROUP_CATEGORIES, GroupCategory } from '../../data/groups/stateGroups'

export type DisplayMode = 'percentage' | 'absolute'

export interface AdvancedOptions {
  displayMode: DisplayMode
  groupBy: string | null  // null = individual states/US, or category ID like 'rto-regions'
}

export interface BaseStackedAreaChartProps {
  config: StackedAreaChartConfig
  data: ChartData
  filters: ChartFilters
  onFilterChange: (filters: Partial<ChartFilters>) => void
  onResetViewport?: () => void
  /** Selected state/region to display */
  selectedRegion: string
  onRegionChange: (region: string) => void
  /** Display options */
  advancedOptions: AdvancedOptions
  onAdvancedOptionsChange: (options: Partial<AdvancedOptions>) => void
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
  selectedRegion,
  onRegionChange,
  advancedOptions,
  onAdvancedOptionsChange
}: BaseStackedAreaChartProps) {
  const onFilterChangeRef = useRef(onFilterChange)
  onFilterChangeRef.current = onFilterChange
  const plotRef = useRef<HTMLDivElement>(null)

  // Theme-aware chart configuration
  const { baseLayout, axisStyle, axisTitleStyle, colors: COLORS } = useChartTheme()

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

  // Get the active group category (if grouping is enabled)
  const activeGroupCategory = useMemo((): GroupCategory | null => {
    if (!advancedOptions.groupBy) return null
    return STATE_GROUP_CATEGORIES.find(c => c.id === advancedOptions.groupBy) || null
  }, [advancedOptions.groupBy])

  // Build available regions based on grouping mode
  const availableRegions = useMemo(() => {
    if (activeGroupCategory) {
      // Return group names when grouping is active
      return ['US', ...activeGroupCategory.groups.map(g => g.id)]
    }
    // Individual states plus US total
    const states = [...new Set(data.points.map(p => p.stateCode))].sort()
    return ['US', ...states]
  }, [data.points, activeGroupCategory])

  // Get region display name
  const getRegionDisplayName = useCallback((regionId: string): string => {
    if (regionId === 'US') return 'U.S. Total'
    if (activeGroupCategory) {
      const group = activeGroupCategory.groups.find(g => g.id === regionId)
      return group?.name || regionId
    }
    return regionId
  }, [activeGroupCategory])

  // Filter and aggregate data by year range and selected region
  const filteredData = useMemo(() => {
    const yearFiltered = data.points.filter(point =>
      point.year >= filters.yearStart &&
      point.year <= filters.yearEnd
    )

    // Helper to aggregate points into a single point per year
    const aggregatePoints = (points: StateDataPoint[], label: string, code: string): StateDataPoint[] => {
      const byYear = new Map<number, StateDataPoint>()

      points.forEach(point => {
        const existing = byYear.get(point.year)
        if (existing) {
          // Sum up generation fields
          config.series.forEach(s => {
            const field = s.field as keyof StateDataPoint
            const existingVal = existing[field] as number || 0
            const newVal = point[field] as number || 0
            ;(existing as unknown as Record<string, number>)[field] = existingVal + newVal
          })
        } else {
          // Create new aggregate point
          const aggregate: StateDataPoint = {
            ...point,
            state: label,
            stateCode: code,
            region: label
          }
          byYear.set(point.year, aggregate)
        }
      })

      return [...byYear.values()].sort((a, b) => a.year - b.year)
    }

    // US Total - aggregate all states
    if (selectedRegion === 'US') {
      return aggregatePoints(yearFiltered, 'United States', 'US')
    }

    // Group aggregation mode
    if (activeGroupCategory) {
      const group = activeGroupCategory.groups.find(g => g.id === selectedRegion)
      if (group) {
        const groupPoints = yearFiltered.filter(p => group.states.includes(p.stateCode))
        return aggregatePoints(groupPoints, group.name, group.id)
      }
    }

    // Individual state mode
    return yearFiltered
      .filter(point => point.stateCode === selectedRegion)
      .sort((a, b) => a.year - b.year)
  }, [data.points, filters.yearStart, filters.yearEnd, selectedRegion, activeGroupCategory, config.series])

  // Get the region name for display
  const regionName = getRegionDisplayName(selectedRegion)

  // Calculate percentages if in percentage mode
  const chartData = useMemo(() => {
    if (advancedOptions.displayMode === 'absolute') {
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
  }, [filteredData, config.series, advancedOptions.displayMode])

  // Build plot traces
  const plotData = useMemo(() => {
    const years = chartData.map(p => p.year)
    const isPercentage = advancedOptions.displayMode === 'percentage'

    return config.series.map(series => {
      const values = chartData.map(p => {
        const val = p[series.field as keyof typeof p] as number
        return val || 0
      })

      const unit = isPercentage ? '%' : 'TWh'
      const format = isPercentage ? '.1f' : ',.0f'

      return {
        x: years,
        y: values,
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: series.label,
        stackgroup: 'one',
        fillcolor: series.color,
        line: { color: series.color, width: 0 },
        hovertemplate: `<b>${series.label}</b> (%{x})<br>` +
          `${isPercentage ? 'Share' : 'Generation'}: %{y:${format}} ${unit}<extra></extra>`
      }
    })
  }, [chartData, config.series, advancedOptions.displayMode])

  const isPercentage = advancedOptions.displayMode === 'percentage'

  const layout = useMemo(() => ({
    ...baseLayout,
    title: { text: '' },
    showlegend: false, // We use custom legend
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
        text: isPercentage ? 'Share of Generation (%)' : config.yAxis.label,
        ...axisTitleStyle
      },
      range: filters.timeYRange || undefined,
      autorange: filters.timeYRange ? false : true,
      ticksuffix: isPercentage ? '%' : ''
    },
    hovermode: 'x unified' as const
  }), [filters.timeXRange, filters.timeYRange, config.xAxis.label, config.yAxis.label, isPercentage])

  const plotConfig = {
    ...baseConfig,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: `${config.exportFilename || config.id}-${selectedRegion}`,
      height: 700,
      width: 1200,
      scale: 2
    }
  }

  // Reset region to US when changing group mode
  const handleGroupByChange = (groupId: string | null) => {
    onAdvancedOptionsChange({ groupBy: groupId })
    onRegionChange('US')
  }

  return (
    <div className="chart-container" role="figure" aria-label={`Stacked area chart showing ${config.title} for ${regionName}`}>
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
          <label>Compare</label>
          <select
            value={advancedOptions.groupBy || ''}
            onChange={(e) => handleGroupByChange(e.target.value || null)}
            title="Group states by category"
          >
            <option value="">Individual States</option>
            {STATE_GROUP_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>{activeGroupCategory ? 'Region' : 'State'}</label>
          <select
            value={selectedRegion}
            onChange={(e) => onRegionChange(e.target.value)}
          >
            {availableRegions.map(region => (
              <option key={region} value={region}>
                {getRegionDisplayName(region)}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Display</label>
          <select
            value={advancedOptions.displayMode}
            onChange={(e) => onAdvancedOptionsChange({ displayMode: e.target.value as DisplayMode })}
            title="Show as percentage share or absolute generation"
          >
            <option value="percentage">Percentage (%)</option>
            <option value="absolute">Absolute (TWh)</option>
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
          data={data.points}
          filename={`${config.exportFilename || config.id}-${selectedRegion}-${filters.yearStart}-${filters.yearEnd}`}
        />
      </ChartControlsWrapper>

      <p className="chart-interaction-hint">
        Drag to zoom · Double-click to reset · Showing: <strong>{regionName}</strong>
      </p>

      <div ref={plotRef} className="chart-plot-wrapper">
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

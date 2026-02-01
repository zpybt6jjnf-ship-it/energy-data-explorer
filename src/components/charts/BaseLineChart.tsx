import { useMemo, useCallback, useRef } from 'react'
import Plot from 'react-plotly.js'
import { ChartData, ChartFilters, StateDataPoint } from '../../types'
import { LineChartConfig, MetricOption } from '../../types/chartConfig'
// Export functions are used via ExportButtons component
import { LINE_COLORS, formatPercentDelta, baseConfig } from '../../utils/plotly'
import { useChartTheme } from '../../hooks/useChartTheme'
import { STATE_GROUP_CATEGORIES, GroupCategory } from '../../data/groups/stateGroups'
import StateFilter from '../filters/StateFilter'
import { YearRangeSelector, ExportButtons, ChartControlsWrapper } from '../controls'

/** Compare mode - individual states or a group category */
export type CompareMode = 'states' | string // string is category ID like 'rto-regions'

export interface BaseLineChartProps {
  config: LineChartConfig
  data: ChartData
  filters: ChartFilters
  onFilterChange: (filters: Partial<ChartFilters>) => void
  onResetViewport?: () => void
  /** Number of default states to show when none selected */
  defaultStateCount?: number
  /** Enable grouping feature (Compare dropdown) */
  enableGrouping?: boolean
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
  defaultStateCount = 5,
  enableGrouping = true
}: BaseLineChartProps) {
  const onFilterChangeRef = useRef(onFilterChange)
  onFilterChangeRef.current = onFilterChange
  const plotRef = useRef<HTMLDivElement>(null)

  // Theme-aware chart configuration
  const { baseLayout, axisStyle, axisTitleStyle, colors: COLORS } = useChartTheme()

  // Compare mode from filters (defaults to 'states')
  const compareMode: CompareMode = filters.timeCompareMode || 'states'
  const selectedCategory: GroupCategory | undefined = STATE_GROUP_CATEGORIES.find(c => c.id === compareMode)

  // Selected groups within the category (for comparison filtering)
  const selectedGroups: string[] = filters.timeSelectedGroups || []

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

  // Helper to get Y value from a point (handles MED toggle for reliability metrics)
  const getYValue = useCallback((point: StateDataPoint): number | null => {
    // Handle metric switching
    if (config.metrics && (metricKey === 'saidi' || metricKey === 'saifi')) {
      // If MED toggle is on and we have "with MED" data, use it
      if (filters.includeMED) {
        const withMEDKey = metricKey === 'saidi' ? 'saidiWithMED' : 'saifiWithMED'
        const withMEDValue = point[withMEDKey] as number | null
        // Use "with MED" value if available, otherwise fall back to regular value
        if (withMEDValue !== null) {
          return withMEDValue
        }
      }
      return point[metricKey as keyof StateDataPoint] as number | null
    }
    // Handle rate metrics
    if (metricKey.startsWith('rate')) {
      return point[metricKey as keyof StateDataPoint] as number | null
    }
    const field = config.yAxis.field as keyof StateDataPoint
    return point[field] as number | null
  }, [config.yAxis.field, config.metrics, metricKey, filters.includeMED])

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

  // Compute group averages when in group mode
  const groupAverages = useMemo(() => {
    if (!selectedCategory) return []

    const years = [...new Set(filteredData.map(p => p.year))].sort()
    const result: Array<{
      groupId: string
      groupName: string
      points: Array<{ year: number; avg: number; count: number }>
      color: string
    }> = []

    // Filter to selected groups if any are specified
    const groupsToShow = selectedGroups.length > 0
      ? selectedCategory.groups.filter(g => selectedGroups.includes(g.id))
      : selectedCategory.groups

    groupsToShow.forEach((group, i) => {
      const groupPoints = years.map(year => {
        const yearData = filteredData.filter(
          p => p.year === year && group.states.includes(p.stateCode)
        )
        if (yearData.length === 0) return null
        const avg = yearData.reduce((sum, p) => sum + getYValue(p)!, 0) / yearData.length
        return { year, avg, count: yearData.length }
      }).filter((p): p is { year: number; avg: number; count: number } => p !== null)

      if (groupPoints.length > 0) {
        result.push({
          groupId: group.id,
          groupName: group.name,
          points: groupPoints,
          color: LINE_COLORS[i % LINE_COLORS.length]
        })
      }
    })

    return result
  }, [filteredData, selectedCategory, selectedGroups, getYValue])

  // Get state info for selected states (used in 'states' compare mode)
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

  // Handle click on plot to toggle state filter
  const handlePlotClick = useCallback((event: unknown) => {
    const e = event as { points?: Array<{ customdata?: { stateCode?: string } }> }
    if (!e.points || e.points.length === 0) return

    const point = e.points[0]
    const stateCode = point.customdata?.stateCode
    if (!stateCode) return

    // Toggle state in filter
    const isSelected = filters.selectedStates.includes(stateCode)
    if (isSelected) {
      onFilterChange({ selectedStates: filters.selectedStates.filter(s => s !== stateCode) })
    } else {
      onFilterChange({ selectedStates: [...filters.selectedStates, stateCode] })
    }
  }, [filters.selectedStates, onFilterChange])

  // Build plot traces
  const plotData = useMemo(() => {
    const traces: Array<Record<string, unknown>> = []
    const metricFormat = metricInfo.format
    const unitLabel = metricInfo.unit
    const overallAvg = nationalAverage.length > 0
      ? nationalAverage.reduce((s, p) => s + p.avg, 0) / nationalAverage.length
      : 0

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

    // Group mode: show group averages
    if (selectedCategory && groupAverages.length > 0) {
      groupAverages.forEach(group => {
        const groupAvg = group.points.reduce((s, p) => s + p.avg, 0) / group.points.length

        traces.push({
          x: group.points.map(p => p.year),
          y: group.points.map(p => p.avg),
          mode: 'lines+markers',
          type: 'scatter',
          name: group.groupName,
          line: {
            color: group.color,
            width: 3
          },
          marker: {
            color: group.color,
            size: 8,
            line: { color: COLORS.ink, width: 1 }
          },
          customdata: group.points.map(p => ({
            groupName: group.groupName,
            groupId: group.groupId,
            year: p.year,
            metricValue: p.avg,
            memberCount: p.count,
            groupAvg: groupAvg.toFixed(metricInfo.format === '.2f' ? 2 : 1),
            natAvg: (nationalAverage.find(n => n.year === p.year)?.avg || 0).toFixed(metricInfo.format === '.2f' ? 2 : 1),
            deltaVsNat: formatPercentDelta(p.avg, nationalAverage.find(n => n.year === p.year)?.avg || overallAvg)
          })),
          hovertemplate:
            '<b>%{customdata.groupName}</b> (%{customdata.year})<br>' +
            `<span style="color:${COLORS.inkMuted}">%{customdata.memberCount} states</span><br><br>` +
            `${metricInfo.label}: %{customdata.metricValue:${metricFormat}} ${unitLabel} (%{customdata.deltaVsNat})<br>` +
            `Group avg: %{customdata.groupAvg} ${unitLabel}<br>` +
            `National avg: %{customdata.natAvg} ${unitLabel}` +
            '<extra></extra>'
        })
      })
    } else {
      // State mode: show individual state lines
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
          customdata: state.points.map(p => {
            const natAvgForYear = nationalAverage.find(n => n.year === p.year)?.avg || overallAvg
            const metricValue = getYValue(p)!
            return {
              state: p.state,
              stateCode: p.stateCode,
              year: p.year,
              region: p.region,
              metricValue,
              stateAvg: stateAvg.toFixed(metricInfo.format === '.2f' ? 2 : 1),
              natAvg: natAvgForYear.toFixed(metricInfo.format === '.2f' ? 2 : 1),
              deltaVsNat: formatPercentDelta(metricValue, natAvgForYear)
            }
          }),
          hovertemplate:
            '<b>%{customdata.state}</b> (%{customdata.year})<br>' +
            `<span style="color:${COLORS.inkMuted}">%{customdata.region}</span><br><br>` +
            `${metricInfo.label}: %{customdata.metricValue:${metricFormat}} ${unitLabel} (%{customdata.deltaVsNat})<br>` +
            `State avg: %{customdata.stateAvg} ${unitLabel}<br>` +
            `National avg: %{customdata.natAvg} ${unitLabel}` +
            '<extra></extra>'
        })
      })
    }

    return traces
  }, [selectedStateData, groupAverages, selectedCategory, nationalAverage, metricInfo, getYValue])

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

            {/* MED info section - only for reliability charts */}
            {config.metrics && (
              <div className="description-section">
                <h3>About Major Event Days (MED)</h3>
                <p>
                  <strong>Major Event Days</strong> are days when system reliability metrics exceed
                  a statistical threshold (typically 2.5 standard deviations above historical average),
                  often due to severe weather, natural disasters, or other extraordinary circumstances.
                </p>
                <p>
                  The EIA allows utilities to report SAIDI/SAIFI both with and without MED.
                  By default, this chart shows data <em>excluding</em> MED to provide a &quot;normalized&quot;
                  view of baseline reliability. Use the <strong>Include Major Events</strong> toggle
                  to see the full customer experience including extreme events.
                </p>
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

        {/* MED toggle - only show for reliability metrics */}
        {config.metrics && (metricKey === 'saidi' || metricKey === 'saifi') && (
          <div className="control-group">
            <label>&nbsp;</label>
            <label className="checkbox-label" title="Include data from Major Event Days (extreme weather, disasters)">
              <input
                type="checkbox"
                checked={filters.includeMED}
                onChange={(e) => onFilterChange({ includeMED: e.target.checked })}
              />
              Include Major Events
            </label>
          </div>
        )}

        {enableGrouping && (
          <div className="control-group">
            <label>Compare</label>
            <select
              value={compareMode}
              onChange={(e) => onFilterChange({
                timeCompareMode: e.target.value,
                timeSelectedGroups: [] // Reset group selection when category changes
              })}
            >
              <option value="states">Individual States</option>
              {STATE_GROUP_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        )}

        {compareMode === 'states' && (
          <StateFilter
            selectedStates={filters.selectedStates}
            availableStates={availableStates}
            onChange={(states) => onFilterChange({ selectedStates: states })}
          />
        )}

        {selectedCategory && (
          <div className="control-group">
            <label>Groups</label>
            <div className="group-checkboxes">
              {selectedCategory.groups.map(group => (
                <label key={group.id} className="checkbox-label" title={group.description}>
                  <input
                    type="checkbox"
                    checked={selectedGroups.length === 0 || selectedGroups.includes(group.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // If checking and currently showing all (empty), select just this one
                        if (selectedGroups.length === 0) {
                          onFilterChange({ timeSelectedGroups: [group.id] })
                        } else {
                          // Add to selection
                          const newSelection = [...selectedGroups, group.id]
                          // If all are now selected, reset to empty (show all)
                          if (newSelection.length === selectedCategory.groups.length) {
                            onFilterChange({ timeSelectedGroups: [] })
                          } else {
                            onFilterChange({ timeSelectedGroups: newSelection })
                          }
                        }
                      } else {
                        // Unchecking
                        if (selectedGroups.length === 0) {
                          // Currently showing all - select all except this one
                          onFilterChange({
                            timeSelectedGroups: selectedCategory.groups
                              .filter(g => g.id !== group.id)
                              .map(g => g.id)
                          })
                        } else {
                          // Remove from selection (but keep at least one)
                          const newSelection = selectedGroups.filter(id => id !== group.id)
                          if (newSelection.length > 0) {
                            onFilterChange({ timeSelectedGroups: newSelection })
                          }
                        }
                      }
                    }}
                  />
                  {group.name}
                </label>
              ))}
            </div>
          </div>
        )}

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
          filename={`${config.exportFilename || config.id}-${filters.yearStart}-${filters.yearEnd}`}
        />
      </ChartControlsWrapper>

      <p className="chart-interaction-hint">
        {compareMode === 'states' ? 'Click a line to toggle state filter · ' : ''}Drag to zoom · Double-click to reset
      </p>

      <div ref={plotRef} className="chart-plot-wrapper">
        <Plot
          data={plotData}
          layout={layout}
          config={plotConfig}
          style={{ width: '100%', height: '100%' }}
          onClick={compareMode === 'states' ? handlePlotClick : undefined}
          onInitialized={handleInitialized}
          onUpdate={handleInitialized}
        />
      </div>
    </div>
  )
}

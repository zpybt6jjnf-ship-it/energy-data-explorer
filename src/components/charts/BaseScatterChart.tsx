import { useMemo, useState, useCallback, useRef, useEffect, ReactNode } from 'react'
import Plot from 'react-plotly.js'
import { ChartData, ChartFilters, REGION_COLORS, AggregatedDataPoint, UtilityData, StateDataPoint } from '../../types'
import { ScatterChartConfig, MetricOption } from '../../types/chartConfig'
// Export functions are used via ExportButtons component
import { COLORS, RETRO_COLORS, formatRank, formatPercentDelta, baseLayout, axisStyle, axisTitleStyle, baseConfig } from '../../utils/plotly'
import { calculateRegression, RegressionResult, getTCritical } from '../../utils/statistics'
import { STATE_GROUP_CATEGORIES } from '../../data/groups/stateGroups'
import { UTILITY_GROUP_CATEGORIES } from '../../data/groups/utilityGroups'
import { aggregateCategoryOverTime, aggregateUtilitiesByField } from '../../utils/aggregation'
import GroupSelector, { GroupSelection } from '../filters/GroupSelector'
import StateFilter from '../filters/StateFilter'
import { YearRangeSelector, ExportButtons, ChartControlsWrapper } from '../controls'

// WebGL threshold - use scattergl for better performance with many points
const WEBGL_THRESHOLD = 1000

export interface BaseScatterChartProps {
  config: ScatterChartConfig
  data: ChartData
  filters: ChartFilters
  onFilterChange: (filters: Partial<ChartFilters>) => void
  onResetViewport?: () => void
  /** Custom content to render after the chart (e.g., easter eggs) */
  renderAfterChart?: (props: { filteredData: StateDataPoint[] }) => ReactNode
  /** Custom click handler for plot points (called in addition to default state toggle behavior) */
  onPointClick?: (stateCode: string, year: number, point: StateDataPoint) => void
  /** Override default description content */
  descriptionContent?: ReactNode
}

interface MetricInfo {
  label: string
  shortLabel: string
  unit: string
  description: string
  yAxisLabel: string
  format: string // Number format (e.g., '.1f')
}

/**
 * Base scatter chart component with support for:
 * - Multiple Y-axis metrics
 * - Trend line with confidence intervals
 * - State/utility aggregation
 * - Utility-level view mode
 * - Axis swapping
 * - Viewport persistence
 */
export default function BaseScatterChart({
  config,
  data,
  filters,
  onFilterChange,
  onResetViewport,
  renderAfterChart,
  onPointClick,
  descriptionContent
}: BaseScatterChartProps) {
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

  // Get metric info based on config and current filter
  const metricKey = filters.reliabilityMetric || config.defaultMetric || config.metrics?.[0]?.value || 'saidi'
  const metricOption = config.metrics?.find(m => m.value === metricKey)

  const metricInfo: MetricInfo = metricOption ? {
    label: metricOption.label,
    shortLabel: metricOption.shortLabel || metricOption.label,
    unit: metricOption.unit,
    description: metricOption.description,
    yAxisLabel: config.yAxis.label.replace('{metric}', metricOption.label),
    format: metricOption.format || '.1f'
  } : {
    label: config.yAxis.label,
    shortLabel: config.yAxis.label,
    unit: config.yAxis.suffix || '',
    description: '',
    yAxisLabel: config.yAxis.label,
    format: config.yAxis.format || '.1f'
  }

  // Helper to get Y value from a point (handles MED toggle for reliability metrics)
  const getYValue = useCallback((point: StateDataPoint): number | null => {
    const field = config.yAxis.field as keyof StateDataPoint
    // Handle metric switching for reliability charts
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
    return point[field] as number | null
  }, [config.yAxis.field, config.metrics, metricKey, filters.includeMED])

  // Helper to get X value from a point
  const getXValue = useCallback((point: StateDataPoint): number => {
    const field = config.xAxis.field as keyof StateDataPoint
    return point[field] as number
  }, [config.xAxis.field])

  // Filter data by year, state, and valid metric value
  const filteredData = useMemo(() => {
    return data.points.filter(point => {
      const yearMatch = point.year >= filters.yearStart && point.year <= filters.yearEnd
      const stateMatch = filters.selectedStates.length === 0 ||
        filters.selectedStates.includes(point.stateCode)
      const yValue = getYValue(point)
      const hasMetric = yValue !== null
      return yearMatch && stateMatch && hasMetric
    })
  }, [data.points, filters.yearStart, filters.yearEnd, filters.selectedStates, getYValue])

  // Get swap axes setting
  const swapAxes = filters.swapAxes

  // Calculate regression statistics
  const regression = useMemo((): RegressionResult | null => {
    if (!config.features.trendLine) return null
    const points = swapAxes
      ? filteredData.map(p => ({ x: getYValue(p)!, y: getXValue(p) }))
      : filteredData.map(p => ({ x: getXValue(p), y: getYValue(p)! }))
    return calculateRegression(points)
  }, [filteredData, swapAxes, getXValue, getYValue, config.features.trendLine])

  // Calculate average metric value for reference line
  const avgMetricValue = useMemo(() => {
    if (filteredData.length === 0) return 0
    return filteredData.reduce((sum, p) => sum + getYValue(p)!, 0) / filteredData.length
  }, [filteredData, getYValue])

  // Compute rankings and enriched data for tooltips
  const enrichedData = useMemo(() => {
    if (filteredData.length === 0) return []

    // Sort by metric (lower is better for reliability metrics)
    const sortedByMetric = [...filteredData].sort((a, b) => getYValue(a)! - getYValue(b)!)
    const metricRankMap = new Map<string, number>()
    sortedByMetric.forEach((p, i) => {
      metricRankMap.set(`${p.stateCode}-${p.year}`, i + 1)
    })

    const sortedByX = [...filteredData].sort((a, b) => getXValue(b) - getXValue(a))
    const xRankMap = new Map<string, number>()
    sortedByX.forEach((p, i) => {
      xRankMap.set(`${p.stateCode}-${p.year}`, i + 1)
    })

    const total = filteredData.length
    const avgX = filteredData.reduce((s, p) => s + getXValue(p), 0) / filteredData.length

    return filteredData.map(p => {
      const key = `${p.stateCode}-${p.year}`
      const metricRank = metricRankMap.get(key) || 0
      const xRank = xRankMap.get(key) || 0
      const metricValue = getYValue(p)!
      const xValue = getXValue(p)

      return {
        ...p,
        metricValue,
        xValue,
        metricRank,
        xRank,
        total,
        metricRankStr: formatRank(metricRank, total, 'most reliable'),
        xDeltaStr: formatPercentDelta(xValue, avgX),
        metricDeltaStr: formatPercentDelta(metricValue, avgMetricValue)
      }
    })
  }, [filteredData, avgMetricValue, getXValue, getYValue])

  // Generate plain-language summary
  const summary = useMemo(() => {
    if (!regression) return null

    const strength = Math.abs(regression.r) < 0.1 ? 'no' :
                     Math.abs(regression.r) < 0.3 ? 'a weak' :
                     Math.abs(regression.r) < 0.5 ? 'a moderate' : 'a strong'

    const direction = regression.r > 0 ? 'positive' : 'negative'

    const formatDecimals = metricInfo.format === '.2f' ? 2 : 1
    const slopeText = regression.slope > 0
      ? `each 1% increase in renewable share is associated with ${Math.abs(regression.slope).toFixed(formatDecimals)} more ${metricInfo.unit}`
      : `each 1% increase in renewable share is associated with ${Math.abs(regression.slope).toFixed(formatDecimals)} fewer ${metricInfo.unit}`

    return {
      strength,
      direction,
      slopeText,
      r: regression.r,
      n: regression.n
    }
  }, [regression, metricInfo])

  // Load utility data when needed
  const [utilityData, setUtilityData] = useState<UtilityData | null>(null)

  useEffect(() => {
    if (!config.features.utilityView && !config.features.aggregation) return

    const needsUtilityData = filters.viewMode === 'utilities' ||
      (filters.groupLevel === 'utility' && filters.groupBy)
    if (needsUtilityData && !utilityData) {
      fetch('/data/utilities.json')
        .then(res => res.json())
        .then(data => setUtilityData(data))
        .catch(err => console.error('Failed to load utility data:', err))
    }
  }, [filters.viewMode, filters.groupLevel, filters.groupBy, utilityData, config.features.utilityView, config.features.aggregation])

  // Filter utility data
  const filteredUtilities = useMemo(() => {
    if (!utilityData || filters.viewMode !== 'utilities') return []
    return utilityData.utilities.filter(u => {
      const yearMatch = u.year >= filters.yearStart && u.year <= filters.yearEnd
      const stateMatch = filters.selectedStates.length === 0 ||
        filters.selectedStates.includes(u.stateCode)
      const hasMetric = u[metricKey as keyof typeof u] !== null
      return yearMatch && stateMatch && hasMetric
    })
  }, [utilityData, filters.viewMode, filters.yearStart, filters.yearEnd, filters.selectedStates, metricKey])

  // Build state generation lookup for utility view (stateCode+year -> generation data)
  const stateGenerationLookup = useMemo(() => {
    const lookup = new Map<string, {
      gas: number
      coal: number
      nuclear: number
      hydro: number
      wind: number
      solar: number
      other: number
      total: number
    }>()

    data.points.forEach(p => {
      const key = `${p.stateCode}-${p.year}`
      const total = p.generationGas + p.generationCoal + p.generationNuclear +
                   p.generationHydro + p.generationWind + p.generationSolar + p.generationOther
      lookup.set(key, {
        gas: total > 0 ? (p.generationGas / total) * 100 : 0,
        coal: total > 0 ? (p.generationCoal / total) * 100 : 0,
        nuclear: total > 0 ? (p.generationNuclear / total) * 100 : 0,
        hydro: total > 0 ? (p.generationHydro / total) * 100 : 0,
        wind: total > 0 ? (p.generationWind / total) * 100 : 0,
        solar: total > 0 ? (p.generationSolar / total) * 100 : 0,
        other: total > 0 ? (p.generationOther / total) * 100 : 0,
        total
      })
    })

    return lookup
  }, [data.points])

  // Calculate aggregated data when groupBy is set
  const aggregatedData = useMemo((): AggregatedDataPoint[] => {
    if (!filters.groupBy || !config.features.aggregation) return []

    const years = [...new Set(data.points.map(p => p.year))]
      .filter(y => y >= filters.yearStart && y <= filters.yearEnd)

    if (filters.groupLevel === 'state') {
      const category = STATE_GROUP_CATEGORIES.find(c => c.id === filters.groupBy)
      if (!category) return []
      return aggregateCategoryOverTime(data.points, category, years)
        .filter(agg => agg[metricKey as keyof AggregatedDataPoint] !== null)
    }

    if (filters.groupLevel === 'utility' && utilityData) {
      const category = UTILITY_GROUP_CATEGORIES.find(c => c.id === filters.groupBy)
      if (!category) return []

      const results: AggregatedDataPoint[] = []
      for (const year of years) {
        for (const group of category.groups) {
          for (const fieldValue of group.values) {
            const agg = aggregateUtilitiesByField(
              utilityData.utilities,
              category.field,
              fieldValue,
              group.id,
              group.name,
              year
            )
            if (agg && agg[metricKey as keyof AggregatedDataPoint] !== null) {
              const existing = results.find(r => r.groupId === group.id && r.year === year)
              if (!existing) {
                results.push(agg)
              }
            }
          }
        }
      }
      return results
    }

    return []
  }, [data.points, filters.groupBy, filters.groupLevel, filters.yearStart, filters.yearEnd, metricKey, utilityData, config.features.aggregation])

  // Group selection state
  const groupSelection: GroupSelection = {
    categoryId: filters.groupBy,
    level: filters.groupLevel,
    showMembers: filters.showGroupMembers
  }

  const handleGroupChange = useCallback((selection: GroupSelection) => {
    onFilterChange({
      groupBy: selection.categoryId,
      groupLevel: selection.level,
      showGroupMembers: selection.showMembers
    })
  }, [onFilterChange])

  // Handle plot click
  const handlePlotClick = useCallback((event: unknown) => {
    const e = event as { points?: Array<{ customdata?: { stateCode?: string; year?: number } }> }
    if (!e.points || e.points.length === 0) return

    const point = e.points[0]
    const customdata = point.customdata
    const stateCode = customdata?.stateCode
    const year = customdata?.year

    if (stateCode) {
      // Toggle state filter
      const isSelected = filters.selectedStates.includes(stateCode)
      if (isSelected) {
        onFilterChange({ selectedStates: filters.selectedStates.filter(s => s !== stateCode) })
      } else {
        onFilterChange({ selectedStates: [...filters.selectedStates, stateCode] })
      }

      // Call custom click handler
      if (onPointClick && year) {
        const dataPoint = filteredData.find(p => p.stateCode === stateCode && p.year === year)
        if (dataPoint) {
          onPointClick(stateCode, year, dataPoint)
        }
      }
    }
  }, [filters.selectedStates, onFilterChange, onPointClick, filteredData])

  // Build plot traces
  const plotData = useMemo(() => {
    const traces: Array<Record<string, unknown>> = []
    const metricFormat = metricInfo.format

    // Build hover template
    const hoverTemplate =
      '<b>%{customdata.state}</b> (%{customdata.year})<br>' +
      `<span style="color:${COLORS.inkMuted}">%{customdata.region}</span><br><br>` +
      `${metricInfo.label}: %{customdata.metricValue:${metricFormat}} ${metricInfo.unit} (%{customdata.metricDeltaStr})<br>` +
      `<span style="color:${COLORS.inkMuted}">%{customdata.metricRankStr}</span><br><br>` +
      `${config.xAxis.label}: %{customdata.xValue:.1f}${config.xAxis.suffix || ''}` +
      '<extra></extra>'

    const utilityHoverTemplate =
      '<b>%{customdata.utilityName}</b><br>' +
      `<span style="color:${COLORS.inkMuted}">%{customdata.state} · %{customdata.ownership}</span><br><br>` +
      `${metricInfo.label}: %{customdata.metricValue:${metricFormat}} ${metricInfo.unit}<br>` +
      `State ${config.xAxis.label}: %{customdata.xValue:.1f}${config.xAxis.suffix || ''}<br>` +
      `<span style="color:${COLORS.inkMuted}">%{customdata.customers:,.0f} customers</span><br><br>` +
      `<b>State Generation Mix</b><br>` +
      `<span style="color:#eb6b6b">Gas: %{customdata.genGas:.0f}%</span> · ` +
      `<span style="color:#4d4d4d">Coal: %{customdata.genCoal:.0f}%</span><br>` +
      `<span style="color:#f18e5b">Nuclear: %{customdata.genNuclear:.0f}%</span> · ` +
      `<span style="color:#65c295">Wind: %{customdata.genWind:.0f}%</span> · ` +
      `<span style="color:#f9d057">Solar: %{customdata.genSolar:.0f}%</span>` +
      '<extra></extra>'

    const groupHoverTemplate =
      '<b>%{customdata.groupName}</b> (%{customdata.year})<br>' +
      `<span style="color:${COLORS.inkMuted}">%{customdata.memberCount} members</span><br><br>` +
      `${metricInfo.label}: %{customdata.metricValue:${metricFormat}} ${metricInfo.unit} (%{customdata.metricDeltaStr})<br>` +
      `<span style="color:${COLORS.inkMuted}">Avg: %{customdata.avgMetric:${metricFormat}} ${metricInfo.unit}</span><br><br>` +
      `${config.xAxis.label}: %{customdata.xValue:.1f}${config.xAxis.suffix || ''}` +
      '<extra></extra>'

    // Utilities view mode
    if (filters.viewMode === 'utilities' && filteredUtilities.length > 0) {
      const useWebGL = filteredUtilities.length > WEBGL_THRESHOLD
      const chartType = useWebGL ? 'scattergl' : 'scatter'

      const ownershipTypes = [...new Set(filteredUtilities.map(u => u.ownership))]
      const ownershipColors: Record<string, string> = {
        'Investor Owned': '#e41a1c',
        'Cooperative': '#377eb8',
        'Municipal': '#4daf4a',
        'Political Subdivision': '#984ea3',
        'State': '#ff7f00',
        'Federal': '#a65628'
      }

      ownershipTypes.forEach(ownership => {
        const ownershipUtilities = filteredUtilities.filter(u => u.ownership === ownership)
        const color = ownershipColors[ownership] || COLORS.inkMuted

        traces.push({
          x: swapAxes
            ? ownershipUtilities.map(u => u[metricKey as keyof typeof u] as number)
            : ownershipUtilities.map(u => u.stateVrePenetration),
          y: swapAxes
            ? ownershipUtilities.map(u => u.stateVrePenetration)
            : ownershipUtilities.map(u => u[metricKey as keyof typeof u] as number),
          customdata: ownershipUtilities.map(u => {
            const gen = stateGenerationLookup.get(`${u.stateCode}-${u.year}`)
            return {
              utilityName: u.utilityName,
              utilityId: u.utilityId,
              state: u.state,
              stateCode: u.stateCode,
              ownership: u.ownership,
              metricValue: u[metricKey as keyof typeof u],
              xValue: u.stateVrePenetration,
              customers: u.customers || 0,
              genGas: gen?.gas || 0,
              genCoal: gen?.coal || 0,
              genNuclear: gen?.nuclear || 0,
              genHydro: gen?.hydro || 0,
              genWind: gen?.wind || 0,
              genSolar: gen?.solar || 0
            }
          }),
          mode: 'markers' as const,
          type: chartType as 'scatter',
          name: ownership,
          marker: {
            color: color,
            size: useWebGL ? 5 : 7,
            opacity: 0.7,
            line: useWebGL ? undefined : { color: COLORS.ink, width: 0.5 }
          },
          hovertemplate: utilityHoverTemplate
        })
      })

      return traces
    }

    // Aggregated view
    if (filters.groupBy && aggregatedData.length > 0) {
      if (filters.showGroupMembers) {
        traces.push({
          x: swapAxes ? enrichedData.map(p => p.metricValue) : enrichedData.map(p => p.xValue),
          y: swapAxes ? enrichedData.map(p => p.xValue) : enrichedData.map(p => p.metricValue),
          text: enrichedData.map(p => p.stateCode),
          customdata: enrichedData.map(p => ({
            state: p.state,
            stateCode: p.stateCode,
            year: p.year,
            region: p.region,
            metricValue: p.metricValue,
            xValue: p.xValue,
            metricRankStr: p.metricRankStr,
            metricDeltaStr: p.metricDeltaStr
          })),
          mode: 'markers' as const,
          type: 'scatter' as const,
          name: 'Individual States',
          marker: {
            color: COLORS.inkMuted,
            size: 6,
            opacity: 0.25,
            line: { color: COLORS.ink, width: 0.5 }
          },
          hovertemplate: hoverTemplate,
          showlegend: true
        })
      }

      const groups = [...new Set(aggregatedData.map(p => p.groupId))]
      const groupColors = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#a65628', '#f781bf', '#999999']

      groups.forEach((groupId, i) => {
        const groupPoints = aggregatedData.filter(p => p.groupId === groupId)
        if (groupPoints.length === 0) return

        const groupName = groupPoints[0].groupName
        const color = groupColors[i % groupColors.length]

        traces.push({
          x: swapAxes
            ? groupPoints.map(p => p[metricKey as keyof AggregatedDataPoint] as number)
            : groupPoints.map(p => p.vrePenetration),
          y: swapAxes
            ? groupPoints.map(p => p.vrePenetration)
            : groupPoints.map(p => p[metricKey as keyof AggregatedDataPoint] as number),
          text: groupPoints.map(p => `${groupName} (${p.year})`),
          customdata: groupPoints.map(p => {
            const metricValue = p[metricKey as keyof AggregatedDataPoint] as number
            return {
              groupName: p.groupName,
              groupId: p.groupId,
              year: p.year,
              metricValue,
              xValue: p.vrePenetration,
              memberCount: p.memberCount,
              members: p.members.join(', '),
              avgMetric: avgMetricValue,
              metricDeltaStr: formatPercentDelta(metricValue, avgMetricValue)
            }
          }),
          mode: 'markers+text' as const,
          type: 'scatter' as const,
          name: groupName,
          marker: {
            color: color,
            size: 14,
            opacity: 0.9,
            symbol: 'diamond',
            line: { color: COLORS.ink, width: 2 }
          },
          textposition: 'top center',
          textfont: { size: 10, color: COLORS.ink },
          hovertemplate: groupHoverTemplate
        })
      })
    } else {
      // Individual state points
      if (filters.colorBy === 'region') {
        const regions = [...new Set(enrichedData.map(p => p.region))]
        regions.forEach(region => {
          const regionPoints = enrichedData.filter(p => p.region === region)
          traces.push({
            x: swapAxes ? regionPoints.map(p => p.metricValue) : regionPoints.map(p => p.xValue),
            y: swapAxes ? regionPoints.map(p => p.xValue) : regionPoints.map(p => p.metricValue),
            text: regionPoints.map(p => `${p.state} (${p.year})`),
            customdata: regionPoints.map(p => ({
              state: p.state,
              stateCode: p.stateCode,
              year: p.year,
              region: p.region,
              metricValue: p.metricValue,
              xValue: p.xValue,
              metricRankStr: p.metricRankStr,
              metricDeltaStr: p.metricDeltaStr
            })),
            mode: 'markers' as const,
            type: 'scatter' as const,
            name: region,
            marker: {
              color: REGION_COLORS[region] || COLORS.inkMuted,
              size: filters.showTrendLine ? 9 : 11,
              opacity: filters.showTrendLine ? 0.5 : 0.85,
              line: { color: COLORS.ink, width: filters.showTrendLine ? 0.5 : 1 }
            },
            hovertemplate: hoverTemplate
          })
        })
      } else {
        const years = [...new Set(enrichedData.map(p => p.year))].sort()
        years.forEach((year, i) => {
          const yearPoints = enrichedData.filter(p => p.year === year)
          const colorIndex = i % RETRO_COLORS.length
          traces.push({
            x: swapAxes ? yearPoints.map(p => p.metricValue) : yearPoints.map(p => p.xValue),
            y: swapAxes ? yearPoints.map(p => p.xValue) : yearPoints.map(p => p.metricValue),
            text: yearPoints.map(p => p.state),
            customdata: yearPoints.map(p => ({
              state: p.state,
              stateCode: p.stateCode,
              year: p.year,
              region: p.region,
              metricValue: p.metricValue,
              xValue: p.xValue,
              metricRankStr: p.metricRankStr,
              metricDeltaStr: p.metricDeltaStr
            })),
            mode: 'markers' as const,
            type: 'scatter' as const,
            name: year.toString(),
            marker: {
              color: RETRO_COLORS[colorIndex],
              size: filters.showTrendLine ? 9 : 11,
              opacity: filters.showTrendLine ? 0.5 : 0.85,
              line: { color: COLORS.ink, width: filters.showTrendLine ? 0.5 : 1 }
            },
            hovertemplate: hoverTemplate
          })
        })
      }
    }

    // Add trend line if enabled
    if (filters.showTrendLine && regression) {
      const xRangeData = filteredData.length > 0
        ? [Math.min(...filteredData.map(p => getXValue(p))), Math.max(...filteredData.map(p => getXValue(p)))]
        : [0, 50]

      const avgLabel = `Avg ${metricInfo.shortLabel} (${avgMetricValue.toFixed(metricInfo.format === '.2f' ? 2 : 0)} ${metricInfo.unit})`

      // Average reference line
      traces.push({
        x: swapAxes ? [avgMetricValue, avgMetricValue] : xRangeData,
        y: swapAxes ? xRangeData : [avgMetricValue, avgMetricValue],
        mode: 'lines' as const,
        type: 'scatter' as const,
        name: avgLabel,
        line: { color: COLORS.inkMuted, width: 1, dash: 'dot' },
        hoverinfo: 'skip' as const
      })

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
        showlegend: true
      })

      // Trend line
      traces.push({
        x: regression.lineX,
        y: regression.lineY,
        mode: 'lines' as const,
        type: 'scatter' as const,
        name: regression.isSignificant ? 'Trend (p<0.05)' : 'Trend (n.s.)',
        line: { color: COLORS.ink, width: 3 },
        hoverinfo: 'skip' as const
      })
    }

    return traces
  }, [enrichedData, filteredData, filteredUtilities, filters.viewMode, filters.colorBy, filters.showTrendLine, filters.groupBy, filters.showGroupMembers, aggregatedData, regression, avgMetricValue, metricKey, metricInfo, swapAxes, config.xAxis, getXValue])

  // Dynamic X-axis label - prefix with "State" in utility view to clarify data granularity
  const xAxisLabel = filters.viewMode === 'utilities'
    ? `State ${config.xAxis.label}`
    : config.xAxis.label

  const layout = useMemo(() => ({
    ...baseLayout,
    title: { text: '' },
    xaxis: {
      ...axisStyle,
      title: { text: swapAxes ? metricInfo.yAxisLabel : `${xAxisLabel}${config.xAxis.suffix ? ` (${config.xAxis.suffix})` : ''}`, ...axisTitleStyle },
      ticksuffix: swapAxes ? undefined : config.xAxis.suffix,
      range: filters.xAxisRange || undefined,
      autorange: filters.xAxisRange ? false : true
    },
    yaxis: {
      ...axisStyle,
      title: { text: swapAxes ? `${xAxisLabel}${config.xAxis.suffix ? ` (${config.xAxis.suffix})` : ''}` : metricInfo.yAxisLabel, ...axisTitleStyle },
      ticksuffix: swapAxes ? config.xAxis.suffix : undefined,
      range: filters.yAxisRange || undefined,
      autorange: filters.yAxisRange ? false : true
    }
  }), [filters.xAxisRange, filters.yAxisRange, metricInfo.yAxisLabel, swapAxes, config.xAxis, xAxisLabel, filters.viewMode])

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
    <div
      className="chart-container"
      role="figure"
      aria-label={`Scatter plot showing ${metricInfo.label} versus ${config.xAxis.label} for ${filteredData.length} observations. ${summary ? `Shows ${summary.strength} ${summary.direction} correlation.` : ''}`}
    >
      <div className="chart-header">
        <h2>{config.title}</h2>
        {filters.viewMode === 'utilities' ? (
          <p>Showing utility-level reliability metrics plotted against state-level renewable energy shares.</p>
        ) : (
          config.subtitle && <p>{config.subtitle}</p>
        )}
      </div>

      {/* Description section */}
      {(descriptionContent || config.description) && (
        <details className="chart-description" open>
          <summary>About this chart</summary>
          {descriptionContent || (
            <div className="chart-description-content">
              {config.description?.whatMeasuring && (
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
              {config.description?.whyCompare && (
                <div className="description-section">
                  <h3>Why compare them?</h3>
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
                    in Advanced settings to see the full customer experience including extreme events.
                  </p>
                </div>
              )}
            </div>
          )}
        </details>
      )}

      {/* Controls */}
      <ChartControlsWrapper
        advancedContent={
          (config.features.utilityView || config.features.aggregation || config.features.swapAxes) && (
            <>
              {config.features.utilityView && (
                <div className="control-group">
                  <label>Data Level</label>
                  <select
                    value={filters.viewMode}
                    onChange={(e) => onFilterChange({
                      viewMode: e.target.value as 'states' | 'utilities',
                      groupBy: e.target.value === 'utilities' ? null : filters.groupBy
                    })}
                  >
                    <option value="states">States ({filteredData.length})</option>
                    <option value="utilities">Utilities {utilityData ? `(${filteredUtilities.length})` : '(...)'}</option>
                  </select>
                </div>
              )}

              {config.features.aggregation && (
                <GroupSelector
                  selection={groupSelection}
                  onChange={handleGroupChange}
                />
              )}

              {config.features.swapAxes && (
                <div className="control-group">
                  <label>&nbsp;</label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.swapAxes}
                      onChange={(e) => onFilterChange({ swapAxes: e.target.checked })}
                    />
                    Swap Axes
                  </label>
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
            </>
          )
        }
        advancedLabel="Advanced"
      >
        <YearRangeSelector
          yearStart={filters.yearStart}
          yearEnd={filters.yearEnd}
          yearsAvailable={data.metadata.yearsAvailable}
          onChange={onFilterChange}
        />

        <StateFilter
          selectedStates={filters.selectedStates}
          availableStates={data.metadata.states}
          onChange={(states) => onFilterChange({ selectedStates: states })}
        />

        {config.colorByOptions && (
          <div className="control-group">
            <label>Color</label>
            <select
              value={filters.colorBy}
              onChange={(e) => onFilterChange({ colorBy: e.target.value as 'year' | 'region' })}
              disabled={!!filters.groupBy || filters.viewMode === 'utilities'}
            >
              {config.colorByOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        {config.metrics && config.metrics.length > 1 && (
          <div className="control-group">
            <label>Measure</label>
            <select
              value={metricKey}
              onChange={(e) => onFilterChange({ reliabilityMetric: e.target.value as 'saidi' | 'saifi' })}
              title={metricInfo.description}
            >
              {config.metrics.map((m: MetricOption) => (
                <option key={m.value} value={m.value}>{m.shortLabel || m.label}</option>
              ))}
            </select>
          </div>
        )}

        {config.features.trendLine && (
          <div className="control-group">
            <label>Analysis</label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filters.showTrendLine}
                onChange={(e) => onFilterChange({ showTrendLine: e.target.checked })}
              />
              Trend Line
            </label>
          </div>
        )}

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

        <ExportButtons
          data={data.points}
          filename={`${config.exportFilename || config.id}-${filters.yearStart}-${filters.yearEnd}`}
        />
      </ChartControlsWrapper>

      {/* Stats panel */}
      {filters.showTrendLine && regression && summary && (
        <div className="stats-panel">
          <div className="stats-summary">
            <p className="summary-main">
              The data shows <strong>{summary.strength} {summary.direction} correlation</strong> between {config.xAxis.label.toLowerCase()} and {metricInfo.label.toLowerCase()}.
            </p>
            <p className="summary-detail">
              Based on {summary.n} observations across {filters.yearEnd - filters.yearStart + 1} years, {summary.slopeText}.
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
                <span className="stat-label">Slope <span className="stat-hint">({metricInfo.unit} per 1%)</span></span>
                <span className="stat-value">{regression.slope.toFixed(metricInfo.format === '.2f' ? 3 : 2)} ± {(regression.seSlope * getTCritical(regression.n - 2)).toFixed(metricInfo.format === '.2f' ? 3 : 2)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Std. Error</span>
                <span className="stat-value">{regression.se.toFixed(metricInfo.format === '.2f' ? 2 : 1)} {metricInfo.unit}</span>
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
        <p className="chart-interaction-hint">
          Click any point to filter by that state · Drag to zoom · Double-click to reset
        </p>
        <div className="chart-plot-wrapper">
          <Plot
            data={plotData}
            layout={layout}
            config={plotConfig}
            style={{ width: '100%', height: '100%' }}
            onClick={handlePlotClick}
            onInitialized={handleInitialized}
            onUpdate={handleInitialized}
          />
        </div>
      </div>

      {renderAfterChart && renderAfterChart({ filteredData })}
    </div>
  )
}

import { useMemo, useCallback, useRef, useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import { ChartData, ChartFilters, REGION_COLORS, AggregatedDataPoint, UtilityData } from '../types'
import { downloadCSV, downloadJSON } from '../utils/export'
import { COLORS, RETRO_COLORS, formatRank, formatPercentDelta, baseLayout, axisStyle, axisTitleStyle, baseConfig } from '../utils/plotly'
import { STATE_GROUP_CATEGORIES } from '../data/groups/stateGroups'
import { UTILITY_GROUP_CATEGORIES } from '../data/groups/utilityGroups'
import { aggregateCategoryOverTime, aggregateUtilitiesByField } from '../utils/aggregation'
import GroupSelector, { GroupSelection } from './filters/GroupSelector'
import StateFilter from './filters/StateFilter'

// WebGL threshold - use scattergl for better performance with many points
const WEBGL_THRESHOLD = 1000

// Export dropdown component
function ExportDropdown({ onExportCSV, onExportJSON }: { onExportCSV: () => void; onExportJSON: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="export-dropdown" ref={dropdownRef}>
      <button
        className="export-dropdown-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        Export
      </button>
      {isOpen && (
        <div className="export-dropdown-menu" role="menu">
          <button
            role="menuitem"
            onClick={() => { onExportCSV(); setIsOpen(false) }}
          >
            Download CSV
          </button>
          <button
            role="menuitem"
            onClick={() => { onExportJSON(); setIsOpen(false) }}
          >
            Download JSON
          </button>
        </div>
      )}
    </div>
  )
}

interface Props {
  data: ChartData
  filters: ChartFilters
  onFilterChange: (filters: Partial<ChartFilters>) => void
  onResetViewport?: () => void
}

// T-distribution critical values for 95% CI (two-tailed)
function getTCritical(df: number): number {
  if (df >= 120) return 1.96
  if (df >= 60) return 2.00
  if (df >= 40) return 2.02
  if (df >= 30) return 2.04
  if (df >= 20) return 2.09
  if (df >= 15) return 2.13
  if (df >= 10) return 2.23
  if (df >= 5) return 2.57
  if (df >= 3) return 3.18
  return 4.30
}

// Calculate p-value from t-statistic (approximation)
function calculatePValue(t: number, df: number): number {
  const absT = Math.abs(t)
  const p = Math.exp(
    -0.5 * absT * absT * (1 + 0.5 / df + 0.375 / (df * df))
  ) * Math.sqrt(2 / Math.PI)
  return Math.min(1, p * 2)
}

// Calculate linear regression and correlation with full statistics
function calculateRegression(points: { x: number; y: number }[]) {
  const n = points.length
  if (n < 3) return null

  const sumX = points.reduce((acc, p) => acc + p.x, 0)
  const sumY = points.reduce((acc, p) => acc + p.y, 0)
  const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0)
  const sumX2 = points.reduce((acc, p) => acc + p.x * p.x, 0)
  const sumY2 = points.reduce((acc, p) => acc + p.y * p.y, 0)

  const meanX = sumX / n

  const denominator = n * sumX2 - sumX * sumX
  if (denominator === 0) return null

  const slope = (n * sumXY - sumX * sumY) / denominator
  const intercept = (sumY - slope * sumX) / n

  const numerator = n * sumXY - sumX * sumY
  const denominatorR = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  const r = denominatorR === 0 ? 0 : numerator / denominatorR
  const r2 = r * r

  const df = n - 2
  const tStat = r * Math.sqrt(df / (1 - r * r + 0.0001))
  const pValue = calculatePValue(tStat, df)

  const predictions = points.map(p => slope * p.x + intercept)
  const residuals = points.map((p, i) => p.y - predictions[i])
  const sse = residuals.reduce((acc, r) => acc + r * r, 0)
  const mse = sse / df
  const se = Math.sqrt(mse)

  const sxx = points.reduce((acc, p) => acc + (p.x - meanX) ** 2, 0)
  const seSlope = se / Math.sqrt(sxx)

  const minX = Math.min(...points.map(p => p.x))
  const maxX = Math.max(...points.map(p => p.x))

  const tCrit = getTCritical(df)
  const xRange = Array.from({ length: 50 }, (_, i) => minX + (maxX - minX) * i / 49)
  const ciUpper: number[] = []
  const ciLower: number[] = []

  xRange.forEach(x => {
    const yHat = slope * x + intercept
    const sePred = se * Math.sqrt(1/n + (x - meanX) ** 2 / sxx)
    const margin = tCrit * sePred
    ciUpper.push(yHat + margin)
    ciLower.push(yHat - margin)
  })

  return {
    slope,
    intercept,
    r,
    r2,
    pValue,
    tStat,
    se,
    seSlope,
    n,
    isSignificant: pValue < 0.05,
    lineX: [minX, maxX],
    lineY: [slope * minX + intercept, slope * maxX + intercept],
    xRange,
    yLine: xRange.map(x => slope * x + intercept),
    ciUpper,
    ciLower,
    meanX
  }
}

export default function RateVreChart({ data, filters, onFilterChange, onResetViewport }: Props) {
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
          xAxisRange: xRange,
          yAxisRange: yRange
        })
      }

      if (e['xaxis.autorange'] === true || e['yaxis.autorange'] === true) {
        onFilterChangeRef.current({ xAxisRange: null, yAxisRange: null })
      }
    })
  }, [])

  // Get residential rate (primary display)
  const getRate = (point: typeof data.points[0]): number | null => {
    return point.rateResidential
  }

  // Filter data by year, state, and valid rate
  const filteredData = useMemo(() => {
    return data.points.filter(point => {
      const yearMatch = point.year >= filters.yearStart && point.year <= filters.yearEnd
      const stateMatch = filters.selectedStates.length === 0 ||
        filters.selectedStates.includes(point.stateCode)
      const hasRate = getRate(point) !== null
      return yearMatch && stateMatch && hasRate
    })
  }, [data.points, filters.yearStart, filters.yearEnd, filters.selectedStates])

  // Get swap axes setting
  const swapAxes = filters.swapAxes

  // Calculate regression statistics (always, for summary availability)
  const regression = useMemo(() => {
    const points = swapAxes
      ? filteredData.map(p => ({ x: getRate(p) ?? 0, y: p.vrePenetration }))
      : filteredData.map(p => ({ x: p.vrePenetration, y: getRate(p) ?? 0 }))
    return calculateRegression(points)
  }, [filteredData, swapAxes])

  // Calculate average rate for reference
  const avgRate = useMemo(() => {
    if (filteredData.length === 0) return 0
    const rates = filteredData.map(p => getRate(p)).filter((r): r is number => r !== null)
    return rates.reduce((sum, r) => sum + r, 0) / rates.length
  }, [filteredData])

  // Enrich data with rankings and comparisons
  const enrichedData = useMemo(() => {
    if (filteredData.length === 0) return []

    // Rank by rate (lower = more affordable)
    const sortedByRate = [...filteredData].sort((a, b) => {
      const rateA = getRate(a) ?? 0
      const rateB = getRate(b) ?? 0
      return rateA - rateB
    })
    const rateRankMap = new Map<string, number>()
    sortedByRate.forEach((p, i) => {
      rateRankMap.set(`${p.stateCode}-${p.year}`, i + 1)
    })

    // Rank by VRE (higher = more renewable)
    const sortedByVre = [...filteredData].sort((a, b) => b.vrePenetration - a.vrePenetration)
    const vreRankMap = new Map<string, number>()
    sortedByVre.forEach((p, i) => {
      vreRankMap.set(`${p.stateCode}-${p.year}`, i + 1)
    })

    const total = filteredData.length
    const avgVre = filteredData.reduce((sum, p) => sum + p.vrePenetration, 0) / filteredData.length

    return filteredData.map(p => {
      const key = `${p.stateCode}-${p.year}`
      const rateRank = rateRankMap.get(key) || 0
      const vreRank = vreRankMap.get(key) || 0
      const rate = getRate(p) ?? 0

      return {
        ...p,
        rate,
        rateRank,
        vreRank,
        total,
        rateRankStr: formatRank(rateRank, total, 'most affordable'),
        rateDeltaStr: formatPercentDelta(rate, avgRate),
        vreDeltaStr: formatPercentDelta(p.vrePenetration, avgVre)
      }
    })
  }, [filteredData, avgRate])

  // Generate plain-language summary
  const summary = useMemo(() => {
    if (!regression) return null

    const strength = Math.abs(regression.r) < 0.1 ? 'no' :
                     Math.abs(regression.r) < 0.3 ? 'a weak' :
                     Math.abs(regression.r) < 0.5 ? 'a moderate' : 'a strong'

    const direction = regression.r > 0 ? 'positive' : 'negative'

    const slopeText = regression.slope > 0
      ? `each 1% increase in renewable share is associated with ${Math.abs(regression.slope).toFixed(2)}¢ higher electricity rates`
      : `each 1% increase in renewable share is associated with ${Math.abs(regression.slope).toFixed(2)}¢ lower electricity rates`

    return {
      strength,
      direction,
      slopeText,
      r: regression.r,
      n: regression.n
    }
  }, [regression])

  // Load utility data when needed for utility-level aggregation or utility view mode
  const [utilityData, setUtilityData] = useState<UtilityData | null>(null)

  useEffect(() => {
    const needsUtilityData = filters.viewMode === 'utilities' ||
      (filters.groupLevel === 'utility' && filters.groupBy)
    if (needsUtilityData && !utilityData) {
      fetch('/data/utilities.json')
        .then(res => res.json())
        .then(data => setUtilityData(data))
        .catch(err => console.error('Failed to load utility data:', err))
    }
  }, [filters.viewMode, filters.groupLevel, filters.groupBy, utilityData])

  // Filter utility data by year range and selected states
  const filteredUtilities = useMemo(() => {
    if (!utilityData || filters.viewMode !== 'utilities') return []
    return utilityData.utilities.filter(u => {
      const yearMatch = u.year >= filters.yearStart && u.year <= filters.yearEnd
      const stateMatch = filters.selectedStates.length === 0 ||
        filters.selectedStates.includes(u.stateCode)
      // Note: utilities don't have rate data, so we just filter by SAIDI availability
      const hasData = u.saidi !== null
      return yearMatch && stateMatch && hasData
    })
  }, [utilityData, filters.viewMode, filters.yearStart, filters.yearEnd, filters.selectedStates])

  // Calculate aggregated data when groupBy is set
  // Note: aggregated points need a rate value - we use simple average of available residential rates
  const aggregatedData = useMemo((): (AggregatedDataPoint & { avgRate: number })[] => {
    if (!filters.groupBy) return []

    const years = [...new Set(data.points.map(p => p.year))]
      .filter(y => y >= filters.yearStart && y <= filters.yearEnd)

    // State-level aggregation
    if (filters.groupLevel === 'state') {
      const category = STATE_GROUP_CATEGORIES.find(c => c.id === filters.groupBy)
      if (!category) return []

      const baseAggregated = aggregateCategoryOverTime(data.points, category, years)

      // Add average rate for each aggregated point
      return baseAggregated.map(agg => {
        const memberStates = category.groups.find(g => g.id === agg.groupId)?.states || []
        const memberPoints = data.points.filter(
          p => memberStates.includes(p.stateCode) && p.year === agg.year && p.rateResidential !== null
        )
        const avgRate = memberPoints.length > 0
          ? memberPoints.reduce((sum, p) => sum + (p.rateResidential || 0), 0) / memberPoints.length
          : 0

        return { ...agg, avgRate }
      }).filter(p => p.avgRate > 0)
    }

    // Utility-level aggregation
    // Note: utility data doesn't have rate info, so we use state-level VRE with utility SAIDI
    // For rates chart, utility aggregation shows VRE vs reliability, not rates
    if (filters.groupLevel === 'utility' && utilityData) {
      const category = UTILITY_GROUP_CATEGORIES.find(c => c.id === filters.groupBy)
      if (!category) return []

      const results: (AggregatedDataPoint & { avgRate: number })[] = []
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
            if (agg) {
              const existing = results.find(r => r.groupId === group.id && r.year === year)
              if (!existing) {
                // Use state-level rates as approximation (average of member utility states)
                const memberUtilities = utilityData.utilities.filter(
                  u => u.year === year && u[category.field] === fieldValue
                )
                const memberStateCodes = [...new Set(memberUtilities.map(u => u.stateCode))]
                const stateRates = data.points.filter(
                  p => memberStateCodes.includes(p.stateCode) && p.year === year && p.rateResidential !== null
                )
                const avgRate = stateRates.length > 0
                  ? stateRates.reduce((sum, p) => sum + (p.rateResidential || 0), 0) / stateRates.length
                  : 0

                if (avgRate > 0) {
                  results.push({ ...agg, avgRate })
                }
              }
            }
          }
        }
      }
      return results
    }

    return []
  }, [data.points, filters.groupBy, filters.groupLevel, filters.yearStart, filters.yearEnd, utilityData])

  // Get group selection state for the GroupSelector component
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

  // Handle click on chart points to toggle state filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePlotClick = useCallback((event: any) => {
    if (!event.points || event.points.length === 0) return

    const point = event.points[0]
    const customdata = point.customdata as { stateCode?: string } | undefined
    const stateCode = customdata?.stateCode

    // Toggle state filter on click
    if (stateCode) {
      const isSelected = filters.selectedStates.includes(stateCode)
      if (isSelected) {
        onFilterChange({ selectedStates: filters.selectedStates.filter(s => s !== stateCode) })
      } else {
        onFilterChange({ selectedStates: [...filters.selectedStates, stateCode] })
      }
    }
  }, [filters.selectedStates, onFilterChange])

  // Build plot traces
  const plotData = useMemo(() => {
    const traces: Array<Record<string, unknown>> = []

    // Shared hover template (data in customdata, so same regardless of axis swap)
    const hoverTemplate =
      '<b>%{customdata.state}</b> (%{customdata.year})<br>' +
      `<span style="color:${COLORS.inkMuted}">%{customdata.region}</span><br><br>` +
      'Rate: %{customdata.rate:.1f} ¢/kWh (%{customdata.rateDeltaStr})<br>' +
      `<span style="color:${COLORS.inkMuted}">%{customdata.rateRankStr}</span><br><br>` +
      'Renewables: %{customdata.vrePenetration:.1f}%<br>' +
      '  ├ Wind: %{customdata.windPenetration:.1f}%<br>' +
      '  └ Solar: %{customdata.solarPenetration:.1f}%' +
      '<extra></extra>'

    // Hover template for aggregated group points
    const groupHoverTemplate =
      '<b>%{customdata.groupName}</b> (%{customdata.year})<br>' +
      `<span style="color:${COLORS.inkMuted}">%{customdata.memberCount} states</span><br><br>` +
      'Rate: %{customdata.avgRate:.1f} ¢/kWh<br>' +
      'Renewables: %{customdata.vrePenetration:.1f}%<br>' +
      '  ├ Wind: %{customdata.windPenetration:.1f}%<br>' +
      '  └ Solar: %{customdata.solarPenetration:.1f}%' +
      '<extra></extra>'

    // Hover template for utility points (note: shows outage duration vs state renewables since utilities don't have rate data)
    const utilityHoverTemplate =
      '<b>%{customdata.utilityName}</b><br>' +
      `<span style="color:${COLORS.inkMuted}">%{customdata.state} · %{customdata.ownership}</span><br><br>` +
      'Outage Duration: %{customdata.saidi:.1f} minutes<br>' +
      'State Renewables: %{customdata.vrePenetration:.1f}%<br>' +
      `<span style="color:${COLORS.inkMuted}">%{customdata.customers:,.0f} customers</span>` +
      '<extra></extra>'

    // Utilities view mode - show individual utilities with WebGL for performance
    // Note: utilities don't have rate data, so we show SAIDI vs state VRE instead
    if (filters.viewMode === 'utilities' && filteredUtilities.length > 0) {
      const useWebGL = filteredUtilities.length > WEBGL_THRESHOLD
      const chartType = useWebGL ? 'scattergl' : 'scatter'

      // Group by ownership type for coloring
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
            ? ownershipUtilities.map(u => u.saidi!)
            : ownershipUtilities.map(u => u.stateVrePenetration),
          y: swapAxes
            ? ownershipUtilities.map(u => u.stateVrePenetration)
            : ownershipUtilities.map(u => u.saidi!),
          customdata: ownershipUtilities.map(u => ({
            utilityName: u.utilityName,
            utilityId: u.utilityId,
            state: u.state,
            stateCode: u.stateCode,
            ownership: u.ownership,
            saidi: u.saidi,
            vrePenetration: u.stateVrePenetration,
            customers: u.customers || 0
          })),
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

    // If groupBy is set, show aggregated data
    if (filters.groupBy && aggregatedData.length > 0) {
      // First, optionally add member states as background points (faded)
      if (filters.showGroupMembers) {
        traces.push({
          x: swapAxes ? enrichedData.map(p => p.rate) : enrichedData.map(p => p.vrePenetration),
          y: swapAxes ? enrichedData.map(p => p.vrePenetration) : enrichedData.map(p => p.rate),
          text: enrichedData.map(p => `${p.stateCode}`),
          customdata: enrichedData.map(p => ({
            state: p.state,
            stateCode: p.stateCode,
            year: p.year,
            region: p.region,
            rate: p.rate,
            vrePenetration: p.vrePenetration,
            windPenetration: p.windPenetration,
            solarPenetration: p.solarPenetration,
            rateRankStr: p.rateRankStr,
            rateDeltaStr: p.rateDeltaStr
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

      // Add aggregated group points (by group, across years)
      const groups = [...new Set(aggregatedData.map(p => p.groupId))]
      const groupColors = [
        '#e41a1c', '#377eb8', '#4daf4a', '#984ea3',
        '#ff7f00', '#a65628', '#f781bf', '#999999'
      ]

      groups.forEach((groupId, i) => {
        const groupPoints = aggregatedData.filter(p => p.groupId === groupId)
        if (groupPoints.length === 0) return

        const groupName = groupPoints[0].groupName
        const color = groupColors[i % groupColors.length]

        traces.push({
          x: swapAxes
            ? groupPoints.map(p => p.avgRate)
            : groupPoints.map(p => p.vrePenetration),
          y: swapAxes
            ? groupPoints.map(p => p.vrePenetration)
            : groupPoints.map(p => p.avgRate),
          text: groupPoints.map(p => `${groupName} (${p.year})`),
          customdata: groupPoints.map(p => ({
            groupName: p.groupName,
            groupId: p.groupId,
            year: p.year,
            avgRate: p.avgRate,
            vrePenetration: p.vrePenetration,
            windPenetration: p.windPenetration,
            solarPenetration: p.solarPenetration,
            memberCount: p.memberCount,
            members: p.members.join(', ')
          })),
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
      // No grouping - show individual state points (original behavior)
      if (filters.colorBy === 'region') {
        const regions = [...new Set(enrichedData.map(p => p.region))]
        regions.forEach(region => {
          const regionPoints = enrichedData.filter(p => p.region === region)
          traces.push({
            x: swapAxes ? regionPoints.map(p => p.rate) : regionPoints.map(p => p.vrePenetration),
            y: swapAxes ? regionPoints.map(p => p.vrePenetration) : regionPoints.map(p => p.rate),
            text: regionPoints.map(p => `${p.state} (${p.year})`),
            customdata: regionPoints.map(p => ({
              state: p.state,
              stateCode: p.stateCode,
              year: p.year,
              region: p.region,
              rate: p.rate,
              vrePenetration: p.vrePenetration,
              windPenetration: p.windPenetration,
              solarPenetration: p.solarPenetration,
              rateRankStr: p.rateRankStr,
              rateDeltaStr: p.rateDeltaStr
            })),
            mode: 'markers' as const,
            type: 'scatter' as const,
            name: region,
            marker: {
              color: REGION_COLORS[region] || COLORS.inkMuted,
              size: filters.showTrendLine ? 9 : 11,
              opacity: filters.showTrendLine ? 0.5 : 0.85,
              line: {
                color: COLORS.ink,
                width: filters.showTrendLine ? 0.5 : 1
              }
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
            x: swapAxes ? yearPoints.map(p => p.rate) : yearPoints.map(p => p.vrePenetration),
            y: swapAxes ? yearPoints.map(p => p.vrePenetration) : yearPoints.map(p => p.rate),
            text: yearPoints.map(p => p.state),
            customdata: yearPoints.map(p => ({
              state: p.state,
              stateCode: p.stateCode,
              year: p.year,
              region: p.region,
              rate: p.rate,
              vrePenetration: p.vrePenetration,
              windPenetration: p.windPenetration,
              solarPenetration: p.solarPenetration,
              rateRankStr: p.rateRankStr,
              rateDeltaStr: p.rateDeltaStr
            })),
            mode: 'markers' as const,
            type: 'scatter' as const,
            name: year.toString(),
            marker: {
              color: RETRO_COLORS[colorIndex],
              size: filters.showTrendLine ? 9 : 11,
              opacity: filters.showTrendLine ? 0.5 : 0.85,
              line: {
                color: COLORS.ink,
                width: filters.showTrendLine ? 0.5 : 1
              }
            },
            hovertemplate: hoverTemplate
          })
        })
      }
    }

    // Add trend line and average reference
    if (regression && filters.showTrendLine) {
      const xRangeVre = filteredData.length > 0
        ? [Math.min(...filteredData.map(p => p.vrePenetration)), Math.max(...filteredData.map(p => p.vrePenetration))]
        : [0, 50]

      // Average rate reference line (horizontal normally, vertical when swapped)
      traces.push({
        x: swapAxes ? [avgRate, avgRate] : xRangeVre,
        y: swapAxes ? xRangeVre : [avgRate, avgRate],
        mode: 'lines' as const,
        type: 'scatter' as const,
        name: `Avg Rate (${avgRate.toFixed(1)}¢)`,
        line: {
          color: COLORS.inkMuted,
          width: 1,
          dash: 'dot'
        },
        hoverinfo: 'skip' as const
      })

      // Confidence interval band
      traces.push({
        x: [...regression.xRange, ...regression.xRange.slice().reverse()],
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
        line: {
          color: COLORS.ink,
          width: 3
        },
        hoverinfo: 'skip' as const
      })
    }

    return traces
  }, [enrichedData, filteredData, filteredUtilities, filters.viewMode, filters.colorBy, filters.showTrendLine, filters.groupBy, filters.showGroupMembers, aggregatedData, regression, avgRate, swapAxes])

  const layout = useMemo(() => ({
    ...baseLayout,
    title: { text: '' },
    xaxis: {
      ...axisStyle,
      title: { text: swapAxes ? 'Electricity Rate (¢/kWh)' : 'Renewable Energy Share (%)', ...axisTitleStyle },
      ticksuffix: swapAxes ? '¢' : '%',
      range: filters.xAxisRange || undefined,
      autorange: filters.xAxisRange ? false : true
    },
    yaxis: {
      ...axisStyle,
      title: { text: swapAxes ? 'Renewable Energy Share (%)' : 'Electricity Rate (¢/kWh)', ...axisTitleStyle },
      ticksuffix: swapAxes ? '%' : '¢',
      range: filters.yAxisRange || undefined,
      autorange: filters.yAxisRange ? false : true
    }
  }), [filters.xAxisRange, filters.yAxisRange, swapAxes])

  const config = {
    ...baseConfig,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: 'rate-vre-chart',
      height: 700,
      width: 1200,
      scale: 2
    }
  }

  return (
    <div
      className="chart-container"
      role="figure"
      aria-label={`Scatter plot showing electricity rates versus VRE penetration for ${filteredData.length} state-year observations`}
    >
      <div className="chart-header">
        <h2>Electricity Rates vs. Renewable Energy</h2>
        <p className="chart-subtitle">
          {filteredData.length} observations from {filters.yearStart}–{filters.yearEnd}
          {regression && ` · Correlation: ${regression.r >= 0 ? '+' : ''}${regression.r.toFixed(2)}`}
        </p>
      </div>

      {/* Quick view presets */}
      <div className="quick-views">
        <span className="quick-views-label">Quick views:</span>
        <button
          className={filters.colorBy === 'region' && !filters.groupBy ? 'active' : ''}
          onClick={() => onFilterChange({ colorBy: 'region', groupBy: null })}
        >
          By Region
        </button>
        <button
          className={filters.yearStart === 2020 && filters.yearEnd === 2023 ? 'active' : ''}
          onClick={() => onFilterChange({ yearStart: 2020, yearEnd: 2023 })}
        >
          Recent (2020–23)
        </button>
        <button
          className={filters.selectedStates.includes('IA') && filters.selectedStates.includes('KS') ? 'active' : ''}
          onClick={() => onFilterChange({
            selectedStates: ['IA', 'KS', 'OK', 'SD', 'ND', 'NE', 'MN', 'TX', 'CO', 'NM'],
            colorBy: 'year'
          })}
        >
          High Renewables
        </button>
        <button
          className={filters.yearStart === filters.yearEnd && filters.yearEnd === 2023 ? 'active' : ''}
          onClick={() => onFilterChange({ yearStart: 2023, yearEnd: 2023 })}
        >
          Latest Year
        </button>
      </div>

      <details className="chart-description" open>
        <summary>About this chart</summary>
        <div className="chart-description-content">
          <div className="description-section">
            <h3>What are we measuring?</h3>
            <dl>
              <dt>Electricity Rate (¢/kWh)</dt>
              <dd>Average retail price of electricity in cents per kilowatt-hour. This chart shows residential rates by default—the price households pay for electricity. Rates vary significantly by state due to differences in fuel mix, infrastructure costs, and regulatory policies.</dd>

              <dt>VRE Penetration (Variable Renewable Energy)</dt>
              <dd>The percentage of a state's electricity generation from wind and solar sources. States like Iowa and Kansas exceed 40% VRE, while others remain below 5%.</dd>
            </dl>
          </div>

          <div className="description-section">
            <h3>Why compare them?</h3>
            <p>A common question is whether renewable energy is related to electricity costs. This visualization allows you to explore the relationship between renewable penetration and retail electricity rates across U.S. states.</p>
            <p className="description-caveat">Note: Electricity rates are influenced by many factors including fuel costs, infrastructure age, market structure, labor costs, weather patterns, and state regulatory policies. Correlation does not imply causation.</p>
          </div>
        </div>
      </details>

      <div className="controls-unified">
        {/* Main controls row */}
        <div className="control-row">
          <div className="control-group">
            <label>Years</label>
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
            <label>&nbsp;</label>
            <select
              value={filters.yearEnd}
              onChange={(e) => onFilterChange({ yearEnd: parseInt(e.target.value) })}
            >
              {data.metadata.yearsAvailable.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <StateFilter
            selectedStates={filters.selectedStates}
            availableStates={data.metadata.states}
            onChange={(states) => onFilterChange({ selectedStates: states })}
          />

          <div className="control-group">
            <label>Color</label>
            <select
              value={filters.colorBy}
              onChange={(e) => onFilterChange({ colorBy: e.target.value as 'year' | 'region' })}
              disabled={!!filters.groupBy || filters.viewMode === 'utilities'}
              title={filters.viewMode === 'utilities' ? 'Utilities are colored by ownership type' : filters.groupBy ? 'Disabled when grouping is active' : undefined}
            >
              <option value="region">Region</option>
              <option value="year">Year</option>
            </select>
          </div>

          <div className="control-group">
            <label>&nbsp;</label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filters.showTrendLine}
                onChange={(e) => onFilterChange({ showTrendLine: e.target.checked })}
              />
              Trend Line
            </label>
          </div>
        </div>

        {/* Advanced Options (collapsible) */}
        <details>
          <summary className="control-advanced-toggle">Advanced</summary>
          <div className="control-row">
            <div className="control-group">
              <label>Data Level</label>
              <select
                value={filters.viewMode}
                onChange={(e) => onFilterChange({
                  viewMode: e.target.value as 'states' | 'utilities',
                  groupBy: e.target.value === 'utilities' ? null : filters.groupBy
                })}
              >
                <option value="states">States ({filteredData.length} state-years)</option>
                <option value="utilities">Utilities {utilityData ? `(${filteredUtilities.length})` : '(loading...)'}</option>
              </select>
              {filters.viewMode === 'utilities' && filteredUtilities.length > WEBGL_THRESHOLD && (
                <span className="control-hint">WebGL enabled</span>
              )}
              {filters.viewMode === 'utilities' && (
                <span className="control-hint">Shows SAIDI vs VRE (no rate data)</span>
              )}
            </div>

            <GroupSelector
              selection={groupSelection}
              onChange={handleGroupChange}
            />

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
          </div>
        </details>

        {/* Actions Row */}
        <div className="control-actions">
          <div className="control-actions-left">
            <button
              onClick={() => {
                onFilterChange({
                  yearStart: 2013,
                  yearEnd: 2023,
                  selectedStates: [],
                  colorBy: 'region',
                  showTrendLine: false,
                  swapAxes: false,
                  viewMode: 'states',
                  groupBy: null,
                  xAxisRange: null,
                  yAxisRange: null
                })
              }}
              disabled={
                filters.selectedStates.length === 0 &&
                !filters.showTrendLine &&
                !filters.groupBy &&
                !filters.xAxisRange &&
                filters.viewMode === 'states' &&
                filters.colorBy === 'region' &&
                !filters.swapAxes
              }
              title="Reset all filters to defaults"
            >
              Reset All
            </button>
            <button
              onClick={onResetViewport}
              disabled={!filters.xAxisRange && !filters.yAxisRange}
              title="Reset to default zoom level"
            >
              Reset Zoom
            </button>
          </div>
          <div className="control-actions-right">
            <ExportDropdown
              onExportCSV={() => downloadCSV(filteredData, `rate-vre-${filters.yearStart}-${filters.yearEnd}`)}
              onExportJSON={() => downloadJSON(filteredData, `rate-vre-${filters.yearStart}-${filters.yearEnd}`)}
            />
          </div>
        </div>
      </div>

      {/* Stats panel - above chart when trend line is shown */}
      {filters.showTrendLine && regression && summary && (
        <div className="stats-panel">
          <div className="stats-summary">
            <p className="summary-main">
              The data shows <strong>{summary.strength} {summary.direction} correlation</strong> between
              renewable energy share and electricity rates.
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
                <span className="stat-label">Slope <span className="stat-hint">(¢/kWh per 1% renewables)</span></span>
                <span className="stat-value">{regression.slope.toFixed(3)} ± {(regression.seSlope * getTCritical(regression.n - 2)).toFixed(3)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Std. Error</span>
                <span className="stat-value">{regression.se.toFixed(2)}¢</span>
              </div>
              <div className="stat">
                <span className="stat-label">Sample size</span>
                <span className="stat-value">{regression.n}</span>
              </div>
            </div>
          </details>
        </div>
      )}

      <p className="chart-interaction-hint">
        Click any point to filter by that state · Drag to zoom · Double-click to reset
      </p>
      <Plot
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '480px' }}
        onClick={handlePlotClick}
        onInitialized={handleInitialized}
        onUpdate={handleInitialized}
      />
    </div>
  )
}

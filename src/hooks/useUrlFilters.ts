import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChartFilters } from '../types'

const DEFAULT_FILTERS: ChartFilters = {
  yearStart: 2013,
  yearEnd: 2023,
  selectedStates: [],
  colorBy: 'year',
  showTrendLine: false,
  xAxisRange: null,
  yAxisRange: null,
  timeXRange: null,
  timeYRange: null
}

// Parse axis range from URL param (e.g., "0,50" -> [0, 50])
function parseAxisRange(param: string | null): [number, number] | null {
  if (!param) return null
  const parts = param.split(',').map(Number)
  if (parts.length === 2 && parts.every(n => !isNaN(n))) {
    return [parts[0], parts[1]]
  }
  return null
}

export function useUrlFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  const debounceRef = useRef<number | null>(null)

  // Initialize filters from URL params
  const [filters, setFilters] = useState<ChartFilters>(() => ({
    yearStart: parseInt(searchParams.get('yearStart') || String(DEFAULT_FILTERS.yearStart)),
    yearEnd: parseInt(searchParams.get('yearEnd') || String(DEFAULT_FILTERS.yearEnd)),
    selectedStates: searchParams.get('states')?.split(',').filter(Boolean) || [],
    colorBy: (searchParams.get('colorBy') as 'year' | 'region') || DEFAULT_FILTERS.colorBy,
    showTrendLine: searchParams.get('trend') === 'true',
    xAxisRange: parseAxisRange(searchParams.get('xRange')),
    yAxisRange: parseAxisRange(searchParams.get('yRange')),
    timeXRange: parseAxisRange(searchParams.get('timeXRange')),
    timeYRange: parseAxisRange(searchParams.get('timeYRange'))
  }))

  // Sync filters to URL (debounced for viewport changes)
  useEffect(() => {
    const updateUrl = () => {
      const params = new URLSearchParams()
      params.set('yearStart', filters.yearStart.toString())
      params.set('yearEnd', filters.yearEnd.toString())
      if (filters.selectedStates.length > 0) {
        params.set('states', filters.selectedStates.join(','))
      }
      params.set('colorBy', filters.colorBy)
      if (filters.showTrendLine) {
        params.set('trend', 'true')
      }
      // Only include viewport state if set (keeps URLs cleaner)
      if (filters.xAxisRange) {
        params.set('xRange', filters.xAxisRange.map(n => n.toFixed(2)).join(','))
      }
      if (filters.yAxisRange) {
        params.set('yRange', filters.yAxisRange.map(n => n.toFixed(2)).join(','))
      }
      if (filters.timeXRange) {
        params.set('timeXRange', filters.timeXRange.map(n => n.toFixed(2)).join(','))
      }
      if (filters.timeYRange) {
        params.set('timeYRange', filters.timeYRange.map(n => n.toFixed(2)).join(','))
      }

      setSearchParams(params, { replace: true })
    }

    // Debounce viewport updates to avoid URL spam during pan/zoom
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = window.setTimeout(updateUrl, 150)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [filters, setSearchParams])

  const handleFilterChange = useCallback((newFilters: Partial<ChartFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  // Reset scatter chart viewport (for Reset Zoom button)
  const resetViewport = useCallback(() => {
    setFilters(prev => ({ ...prev, xAxisRange: null, yAxisRange: null }))
  }, [])

  // Reset time chart viewport (for Reset Zoom button)
  const resetTimeViewport = useCallback(() => {
    setFilters(prev => ({ ...prev, timeXRange: null, timeYRange: null }))
  }, [])

  return { filters, handleFilterChange, resetViewport, resetTimeViewport }
}

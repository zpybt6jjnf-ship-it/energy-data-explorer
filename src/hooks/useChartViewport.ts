import { useCallback, useRef } from 'react'

type AxisRange = [number, number] | null

interface ViewportState {
  xAxisRange: AxisRange
  yAxisRange: AxisRange
}

interface UseChartViewportOptions {
  /** Current X axis range from filters */
  xAxisRange: AxisRange
  /** Current Y axis range from filters */
  yAxisRange: AxisRange
  /** Callback to update filter state */
  onFilterChange: (updates: Partial<ViewportState>) => void
}

interface UseChartViewportResult {
  /** Callback to attach to Plotly's onInitialized and onUpdate */
  handlePlotlyInit: (figure: unknown, graphDiv: HTMLElement) => void
  /** Reset viewport to auto-range */
  resetViewport: () => void
  /** Whether the viewport has been manually adjusted */
  hasCustomViewport: boolean
}

/**
 * Hook for managing Plotly chart viewport (zoom/pan) state with URL persistence.
 * Attaches relayout listener to capture zoom/pan events and sync to filter state.
 */
export function useChartViewport(options: UseChartViewportOptions): UseChartViewportResult {
  const { xAxisRange, yAxisRange, onFilterChange } = options

  // Use ref to avoid stale closures in event handler
  const onFilterChangeRef = useRef(onFilterChange)
  onFilterChangeRef.current = onFilterChange

  const handlePlotlyInit = useCallback((_figure: unknown, graphDiv: HTMLElement) => {
    const plotlyDiv = graphDiv as HTMLElement & {
      on: (event: string, callback: (event: unknown) => void) => void
    }

    plotlyDiv.on('plotly_relayout', (event: unknown) => {
      const e = event as Record<string, unknown>

      // Handle both array and individual property formats
      const newXRange = e['xaxis.range'] as [number, number] | undefined ||
        (e['xaxis.range[0]'] !== undefined
          ? [e['xaxis.range[0]'], e['xaxis.range[1]']] as [number, number]
          : null)
      const newYRange = e['yaxis.range'] as [number, number] | undefined ||
        (e['yaxis.range[0]'] !== undefined
          ? [e['yaxis.range[0]'], e['yaxis.range[1]']] as [number, number]
          : null)

      // Update if we got new ranges
      if (newXRange && newYRange) {
        onFilterChangeRef.current({
          xAxisRange: newXRange,
          yAxisRange: newYRange
        })
      }

      // Reset if autorange was triggered (double-click)
      if (e['xaxis.autorange'] === true || e['yaxis.autorange'] === true) {
        onFilterChangeRef.current({ xAxisRange: null, yAxisRange: null })
      }
    })
  }, [])

  const resetViewport = useCallback(() => {
    onFilterChange({ xAxisRange: null, yAxisRange: null })
  }, [onFilterChange])

  return {
    handlePlotlyInit,
    resetViewport,
    hasCustomViewport: xAxisRange !== null || yAxisRange !== null
  }
}

/**
 * Variant for time series charts with separate viewport state.
 */
export function useTimeChartViewport(options: {
  timeXRange: AxisRange
  timeYRange: AxisRange
  onFilterChange: (updates: { timeXRange?: AxisRange; timeYRange?: AxisRange }) => void
}) {
  const { timeXRange, timeYRange, onFilterChange } = options

  const onFilterChangeRef = useRef(onFilterChange)
  onFilterChangeRef.current = onFilterChange

  const handlePlotlyInit = useCallback((_figure: unknown, graphDiv: HTMLElement) => {
    const plotlyDiv = graphDiv as HTMLElement & {
      on: (event: string, callback: (event: unknown) => void) => void
    }

    plotlyDiv.on('plotly_relayout', (event: unknown) => {
      const e = event as Record<string, unknown>

      const newXRange = e['xaxis.range'] as [number, number] | undefined ||
        (e['xaxis.range[0]'] !== undefined
          ? [e['xaxis.range[0]'], e['xaxis.range[1]']] as [number, number]
          : null)
      const newYRange = e['yaxis.range'] as [number, number] | undefined ||
        (e['yaxis.range[0]'] !== undefined
          ? [e['yaxis.range[0]'], e['yaxis.range[1]']] as [number, number]
          : null)

      if (newXRange && newYRange) {
        onFilterChangeRef.current({
          timeXRange: newXRange,
          timeYRange: newYRange
        })
      }

      if (e['xaxis.autorange'] === true || e['yaxis.autorange'] === true) {
        onFilterChangeRef.current({ timeXRange: null, timeYRange: null })
      }
    })
  }, [])

  const resetViewport = useCallback(() => {
    onFilterChange({ timeXRange: null, timeYRange: null })
  }, [onFilterChange])

  return {
    handlePlotlyInit,
    resetViewport,
    hasCustomViewport: timeXRange !== null || timeYRange !== null
  }
}

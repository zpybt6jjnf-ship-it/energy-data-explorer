import { useCallback, useRef } from 'react'
import { ChartFilters } from '../types'

type FilterChangeHandler = (filters: Partial<ChartFilters>) => void

interface ViewportFilterKeys {
  xRange: keyof ChartFilters
  yRange: keyof ChartFilters
}

/**
 * Hook for handling Plotly viewport (zoom/pan) persistence.
 * Extracts common relayout event handling from chart components.
 *
 * @param onFilterChange - Function to update filter state
 * @param filterKeys - Which filter keys to use for x/y range persistence
 * @returns handleInitialized callback to pass to Plot's onInitialized prop
 */
export function usePlotlyViewport(
  onFilterChange: FilterChangeHandler,
  filterKeys: ViewportFilterKeys = { xRange: 'xAxisRange', yRange: 'yAxisRange' }
) {
  // Keep a stable ref to the callback to avoid recreating the handler
  const onFilterChangeRef = useRef(onFilterChange)
  onFilterChangeRef.current = onFilterChange

  const handleInitialized = useCallback((_figure: unknown, graphDiv: HTMLElement) => {
    const plotlyDiv = graphDiv as HTMLElement & {
      on: (event: string, callback: (event: unknown) => void) => void
    }

    plotlyDiv.on('plotly_relayout', (event: unknown) => {
      const e = event as Record<string, unknown>

      // Parse x and y ranges from the event (handles both array and indexed formats)
      const xRange = e['xaxis.range'] as [number, number] | undefined ||
        (e['xaxis.range[0]'] !== undefined ? [e['xaxis.range[0]'], e['xaxis.range[1]']] as [number, number] : null)
      const yRange = e['yaxis.range'] as [number, number] | undefined ||
        (e['yaxis.range[0]'] !== undefined ? [e['yaxis.range[0]'], e['yaxis.range[1]']] as [number, number] : null)

      // Update filter state with new viewport ranges
      if (xRange && yRange) {
        onFilterChangeRef.current({
          [filterKeys.xRange]: xRange,
          [filterKeys.yRange]: yRange
        } as Partial<ChartFilters>)
      }

      // Clear ranges when autorange is triggered (double-click reset)
      if (e['xaxis.autorange'] === true || e['yaxis.autorange'] === true) {
        onFilterChangeRef.current({
          [filterKeys.xRange]: null,
          [filterKeys.yRange]: null
        } as Partial<ChartFilters>)
      }
    })
  }, [filterKeys.xRange, filterKeys.yRange])

  return { handleInitialized, onFilterChangeRef }
}

/**
 * Preset filter keys for scatter charts (xAxisRange, yAxisRange)
 */
export const SCATTER_VIEWPORT_KEYS: ViewportFilterKeys = {
  xRange: 'xAxisRange',
  yRange: 'yAxisRange'
}

/**
 * Preset filter keys for time series charts (timeXRange, timeYRange)
 */
export const TIME_VIEWPORT_KEYS: ViewportFilterKeys = {
  xRange: 'timeXRange',
  yRange: 'timeYRange'
}

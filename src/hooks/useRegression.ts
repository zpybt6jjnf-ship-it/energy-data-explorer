import { useMemo } from 'react'
import { calculateRegression, RegressionResult, getTCritical } from '../utils/statistics'

export type { RegressionResult }
export { getTCritical }

interface UseRegressionOptions {
  /** Array of data points with x and y values */
  points: { x: number; y: number }[]
  /** Whether regression is enabled (for conditional computation) */
  enabled?: boolean
}

interface UseRegressionResult {
  regression: RegressionResult | null
  /** Plain-language summary of the correlation */
  summary: {
    strength: string
    direction: string
    slopeText: string
    r: number
    n: number
  } | null
}

/**
 * Hook for computing linear regression with memoization.
 * Returns regression statistics and a plain-language summary.
 */
export function useRegression(
  options: UseRegressionOptions,
  unitLabel: string = 'units',
  metricDecimals: number = 1
): UseRegressionResult {
  const { points, enabled = true } = options

  const regression = useMemo(() => {
    if (!enabled || points.length < 3) return null
    return calculateRegression(points)
  }, [points, enabled])

  const summary = useMemo(() => {
    if (!regression) return null

    const strength = Math.abs(regression.r) < 0.1 ? 'no' :
                     Math.abs(regression.r) < 0.3 ? 'a weak' :
                     Math.abs(regression.r) < 0.5 ? 'a moderate' : 'a strong'

    const direction = regression.r > 0 ? 'positive' : 'negative'

    const slopeFormatted = Math.abs(regression.slope).toFixed(metricDecimals)
    const slopeText = regression.slope > 0
      ? `each 1% increase in renewable share is associated with ${slopeFormatted} more ${unitLabel}`
      : `each 1% increase in renewable share is associated with ${slopeFormatted} fewer ${unitLabel}`

    return {
      strength,
      direction,
      slopeText,
      r: regression.r,
      n: regression.n
    }
  }, [regression, unitLabel, metricDecimals])

  return { regression, summary }
}

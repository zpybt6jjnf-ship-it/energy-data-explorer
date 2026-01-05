// T-distribution critical values for 95% CI (two-tailed)
export function getTCritical(df: number): number {
  if (df >= 120) return 1.96
  if (df >= 60) return 2.00
  if (df >= 40) return 2.02
  if (df >= 30) return 2.04
  if (df >= 20) return 2.09
  if (df >= 15) return 2.13
  if (df >= 10) return 2.23
  if (df >= 5) return 2.57
  if (df >= 3) return 3.18
  return 4.30 // df = 2
}

// Calculate p-value from t-statistic (approximation)
export function calculatePValue(t: number, df: number): number {
  const absT = Math.abs(t)
  const p = Math.exp(
    -0.5 * absT * absT * (1 + 0.5 / df + 0.375 / (df * df))
  ) * Math.sqrt(2 / Math.PI)
  return Math.min(1, p * 2) // two-tailed
}

export interface RegressionResult {
  slope: number
  intercept: number
  r: number
  r2: number
  n: number
  pValue: number
  tStat: number
  se: number
  seSlope: number
  isSignificant: boolean
  lineX: number[]
  lineY: number[]
  ciX: number[]
  ciUpper: number[]
  ciLower: number[]
  meanX: number
  meanY: number
}

// Calculate linear regression and correlation with full statistics
export function calculateRegression(points: { x: number; y: number }[]): RegressionResult | null {
  const n = points.length
  if (n < 3) return null // Need at least 3 points for meaningful regression

  const sumX = points.reduce((acc, p) => acc + p.x, 0)
  const sumY = points.reduce((acc, p) => acc + p.y, 0)
  const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0)
  const sumX2 = points.reduce((acc, p) => acc + p.x * p.x, 0)
  const sumY2 = points.reduce((acc, p) => acc + p.y * p.y, 0)

  const meanX = sumX / n
  const meanY = sumY / n

  // Linear regression: y = mx + b
  const denominator = n * sumX2 - sumX * sumX
  if (denominator === 0) return null

  const slope = (n * sumXY - sumX * sumY) / denominator
  const intercept = (sumY - slope * sumX) / n

  // Pearson correlation coefficient
  const numerator = n * sumXY - sumX * sumY
  const denominatorR = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  const r = denominatorR === 0 ? 0 : numerator / denominatorR
  const r2 = r * r

  // Calculate t-statistic and p-value for correlation
  const df = n - 2
  const tStat = r * Math.sqrt(df / (1 - r * r + 0.0001)) // small epsilon to avoid division by zero
  const pValue = calculatePValue(tStat, df)

  // Standard error of regression (residual standard error)
  const predictions = points.map(p => slope * p.x + intercept)
  const residuals = points.map((p, i) => p.y - predictions[i])
  const sse = residuals.reduce((acc, r) => acc + r * r, 0)
  const mse = sse / df
  const se = Math.sqrt(mse)

  // Standard error of slope
  const sxx = points.reduce((acc, p) => acc + (p.x - meanX) ** 2, 0)
  const seSlope = se / Math.sqrt(sxx)

  // Get x range for trend line
  const minX = Math.min(...points.map(p => p.x))
  const maxX = Math.max(...points.map(p => p.x))

  // Calculate confidence interval for regression line
  const tCrit = getTCritical(df)
  const xRange = Array.from({ length: 50 }, (_, i) => minX + (maxX - minX) * i / 49)
  const ciUpper: number[] = []
  const ciLower: number[] = []

  xRange.forEach(x => {
    const yHat = slope * x + intercept
    // Standard error of prediction at x
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
    n,
    pValue,
    tStat,
    se,
    seSlope,
    isSignificant: pValue < 0.05,
    lineX: [minX, maxX],
    lineY: [slope * minX + intercept, slope * maxX + intercept],
    ciX: xRange,
    ciUpper,
    ciLower,
    meanX,
    meanY
  }
}

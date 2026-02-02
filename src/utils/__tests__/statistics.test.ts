import { describe, it, expect } from 'vitest'
import { getTCritical, calculatePValue, calculateRegression } from '../statistics'

describe('getTCritical', () => {
  it('returns correct t-critical values for different degrees of freedom', () => {
    expect(getTCritical(2)).toBe(4.30)
    expect(getTCritical(3)).toBe(3.18)
    expect(getTCritical(5)).toBe(2.57)
    expect(getTCritical(10)).toBe(2.23)
    expect(getTCritical(15)).toBe(2.13)
    expect(getTCritical(20)).toBe(2.09)
    expect(getTCritical(30)).toBe(2.04)
    expect(getTCritical(40)).toBe(2.02)
    expect(getTCritical(60)).toBe(2.00)
    expect(getTCritical(120)).toBe(1.96)
  })

  it('returns 1.96 for very large degrees of freedom', () => {
    expect(getTCritical(500)).toBe(1.96)
    expect(getTCritical(1000)).toBe(1.96)
  })
})

describe('calculatePValue', () => {
  it('returns p-value close to 1 for t-statistic near 0', () => {
    const p = calculatePValue(0, 10)
    expect(p).toBeGreaterThan(0.9)
  })

  it('returns small p-value for large t-statistic', () => {
    const p = calculatePValue(5, 10)
    expect(p).toBeLessThan(0.01)
  })

  it('handles negative t-statistics', () => {
    const pPositive = calculatePValue(2, 10)
    const pNegative = calculatePValue(-2, 10)
    expect(pPositive).toBeCloseTo(pNegative, 4)
  })

  it('returns value between 0 and 1', () => {
    const p = calculatePValue(3, 20)
    expect(p).toBeGreaterThanOrEqual(0)
    expect(p).toBeLessThanOrEqual(1)
  })
})

describe('calculateRegression', () => {
  it('returns null for fewer than 3 points', () => {
    expect(calculateRegression([])).toBeNull()
    expect(calculateRegression([{ x: 1, y: 1 }])).toBeNull()
    expect(calculateRegression([{ x: 1, y: 1 }, { x: 2, y: 2 }])).toBeNull()
  })

  it('calculates perfect positive correlation', () => {
    const points = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
      { x: 4, y: 4 },
      { x: 5, y: 5 }
    ]
    const result = calculateRegression(points)

    expect(result).not.toBeNull()
    expect(result!.slope).toBeCloseTo(1, 5)
    expect(result!.intercept).toBeCloseTo(0, 5)
    expect(result!.r).toBeCloseTo(1, 5)
    expect(result!.r2).toBeCloseTo(1, 5)
  })

  it('calculates perfect negative correlation', () => {
    const points = [
      { x: 1, y: 5 },
      { x: 2, y: 4 },
      { x: 3, y: 3 },
      { x: 4, y: 2 },
      { x: 5, y: 1 }
    ]
    const result = calculateRegression(points)

    expect(result).not.toBeNull()
    expect(result!.slope).toBeCloseTo(-1, 5)
    expect(result!.r).toBeCloseTo(-1, 5)
  })

  it('calculates no correlation for horizontal line with noise', () => {
    const points = [
      { x: 1, y: 5 },
      { x: 2, y: 5 },
      { x: 3, y: 5 },
      { x: 4, y: 5 },
      { x: 5, y: 5 }
    ]
    const result = calculateRegression(points)

    expect(result).not.toBeNull()
    expect(result!.slope).toBeCloseTo(0, 5)
    expect(result!.r).toBeCloseTo(0, 5)
  })

  it('returns correct number of points in result', () => {
    const points = [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 5 },
      { x: 4, y: 7 },
      { x: 5, y: 9 }
    ]
    const result = calculateRegression(points)

    expect(result).not.toBeNull()
    expect(result!.n).toBe(5)
  })

  it('calculates trend line endpoints', () => {
    const points = [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 6 },
      { x: 4, y: 8 },
      { x: 5, y: 10 }
    ]
    const result = calculateRegression(points)

    expect(result).not.toBeNull()
    expect(result!.lineX).toEqual([1, 5])
    expect(result!.lineY[0]).toBeCloseTo(2, 2)
    expect(result!.lineY[1]).toBeCloseTo(10, 2)
  })

  it('generates confidence interval arrays', () => {
    const points = [
      { x: 1, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 8 }
    ]
    const result = calculateRegression(points)

    expect(result).not.toBeNull()
    expect(result!.ciX).toHaveLength(50)
    expect(result!.ciUpper).toHaveLength(50)
    expect(result!.ciLower).toHaveLength(50)

    // CI upper should be above CI lower
    result!.ciX.forEach((_, i) => {
      expect(result!.ciUpper[i]).toBeGreaterThanOrEqual(result!.ciLower[i])
    })
  })

  it('marks significance correctly', () => {
    // Strong correlation should be significant
    const strongCorr = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
      { x: 6, y: 6 },
      { x: 7, y: 7 },
      { x: 8, y: 8 },
      { x: 9, y: 9 },
      { x: 10, y: 10 }
    ]
    const result = calculateRegression(strongCorr)

    expect(result).not.toBeNull()
    expect(result!.isSignificant).toBe(true)
    expect(result!.pValue).toBeLessThan(0.05)
  })

  it('calculates mean values', () => {
    const points = [
      { x: 2, y: 4 },
      { x: 4, y: 8 },
      { x: 6, y: 12 }
    ]
    const result = calculateRegression(points)

    expect(result).not.toBeNull()
    expect(result!.meanX).toBe(4)
    expect(result!.meanY).toBe(8)
  })

  it('returns null when denominator is zero', () => {
    // All same x values - undefined slope
    const points = [
      { x: 5, y: 1 },
      { x: 5, y: 2 },
      { x: 5, y: 3 }
    ]
    const result = calculateRegression(points)

    expect(result).toBeNull()
  })
})

import { describe, it, expect } from 'vitest'
import { getTCritical, calculatePValue, calculateRegression } from './statistics'

describe('getTCritical', () => {
  it('returns correct critical values for various degrees of freedom', () => {
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

  it('returns 1.96 for large degrees of freedom', () => {
    expect(getTCritical(500)).toBe(1.96)
    expect(getTCritical(1000)).toBe(1.96)
  })
})

describe('calculatePValue', () => {
  it('returns p-value close to 1 for t=0', () => {
    const pValue = calculatePValue(0, 10)
    expect(pValue).toBeGreaterThan(0.7)
  })

  it('returns small p-value for large t-statistic', () => {
    const pValue = calculatePValue(5, 10)
    expect(pValue).toBeLessThan(0.01)
  })

  it('is symmetric for positive and negative t', () => {
    const pPos = calculatePValue(2, 10)
    const pNeg = calculatePValue(-2, 10)
    expect(pPos).toBeCloseTo(pNeg, 5)
  })

  it('never exceeds 1', () => {
    const pValue = calculatePValue(0.001, 100)
    expect(pValue).toBeLessThanOrEqual(1)
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
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 6 },
      { x: 4, y: 8 },
      { x: 5, y: 10 }
    ]
    const result = calculateRegression(points)

    expect(result).not.toBeNull()
    expect(result!.r).toBeCloseTo(1, 5)
    expect(result!.r2).toBeCloseTo(1, 5)
    expect(result!.slope).toBeCloseTo(2, 5)
    expect(result!.intercept).toBeCloseTo(0, 5)
    expect(result!.isSignificant).toBe(true)
  })

  it('calculates perfect negative correlation', () => {
    const points = [
      { x: 1, y: 10 },
      { x: 2, y: 8 },
      { x: 3, y: 6 },
      { x: 4, y: 4 },
      { x: 5, y: 2 }
    ]
    const result = calculateRegression(points)

    expect(result).not.toBeNull()
    expect(result!.r).toBeCloseTo(-1, 5)
    expect(result!.r2).toBeCloseTo(1, 5)
    expect(result!.slope).toBeCloseTo(-2, 5)
    expect(result!.isSignificant).toBe(true)
  })

  it('calculates zero correlation for horizontal line with noise', () => {
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

  it('returns correct sample size', () => {
    const points = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
      { x: 4, y: 4 },
      { x: 5, y: 5 }
    ]
    const result = calculateRegression(points)

    expect(result!.n).toBe(5)
  })

  it('calculates confidence intervals', () => {
    const points = [
      { x: 1, y: 2.1 },
      { x: 2, y: 3.9 },
      { x: 3, y: 6.2 },
      { x: 4, y: 7.8 },
      { x: 5, y: 10.1 }
    ]
    const result = calculateRegression(points)

    expect(result).not.toBeNull()
    expect(result!.ciX.length).toBe(50)
    expect(result!.ciUpper.length).toBe(50)
    expect(result!.ciLower.length).toBe(50)

    // CI upper should be above CI lower at all points
    for (let i = 0; i < result!.ciX.length; i++) {
      expect(result!.ciUpper[i]).toBeGreaterThan(result!.ciLower[i])
    }
  })

  it('generates line coordinates spanning data range', () => {
    const points = [
      { x: 10, y: 20 },
      { x: 20, y: 40 },
      { x: 30, y: 60 }
    ]
    const result = calculateRegression(points)

    expect(result).not.toBeNull()
    expect(result!.lineX[0]).toBe(10)
    expect(result!.lineX[1]).toBe(30)
  })

  it('calculates means correctly', () => {
    const points = [
      { x: 2, y: 4 },
      { x: 4, y: 8 },
      { x: 6, y: 12 }
    ]
    const result = calculateRegression(points)

    expect(result).not.toBeNull()
    expect(result!.meanX).toBeCloseTo(4, 5)
    expect(result!.meanY).toBeCloseTo(8, 5)
  })

  it('returns null for points with zero variance in x', () => {
    const points = [
      { x: 5, y: 1 },
      { x: 5, y: 2 },
      { x: 5, y: 3 }
    ]
    const result = calculateRegression(points)

    expect(result).toBeNull()
  })

  it('handles real-world noisy data', () => {
    // Simulated VRE vs SAIDI relationship with noise
    const points = [
      { x: 5, y: 120 },
      { x: 8, y: 115 },
      { x: 12, y: 118 },
      { x: 15, y: 110 },
      { x: 20, y: 105 },
      { x: 25, y: 108 },
      { x: 30, y: 95 },
      { x: 35, y: 100 }
    ]
    const result = calculateRegression(points)

    expect(result).not.toBeNull()
    expect(result!.slope).toBeLessThan(0) // Negative trend
    expect(result!.r).toBeLessThan(0) // Negative correlation
    expect(result!.se).toBeGreaterThan(0) // Has some error
    expect(result!.seSlope).toBeGreaterThan(0)
  })
})

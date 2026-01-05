import { ReactNode } from 'react'
import { RegressionResult, getTCritical } from '../utils/statistics'

interface StatsPanelProps {
  regression: RegressionResult
  summary: {
    strength: string
    direction: string
    slopeText: string
    n: number
  }
  children?: ReactNode
}

export default function StatsPanel({ regression, summary, children }: StatsPanelProps) {
  return (
    <div className="stats-panel">
      <div className="stats-summary">
        <p className="summary-main">
          The data shows <strong>{summary.strength} {summary.direction} correlation</strong> between
          renewable energy penetration and grid outage duration.
        </p>
        <p className="summary-detail">
          Based on {summary.n} state-year observations, {summary.slopeText}.
        </p>
        {children}
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
            <span className="stat-label">Slope <span className="stat-hint">(min per 1% VRE)</span></span>
            <span className="stat-value">{regression.slope.toFixed(2)} ± {(regression.seSlope * getTCritical(regression.n - 2)).toFixed(2)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Std. Error</span>
            <span className="stat-value">{regression.se.toFixed(1)} min</span>
          </div>
          <div className="stat">
            <span className="stat-label">Sample size</span>
            <span className="stat-value">{regression.n}</span>
          </div>
        </div>
      </details>
    </div>
  )
}

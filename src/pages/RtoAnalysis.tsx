import { useState, useEffect } from 'react'
import RtoDashboard from '../components/charts/RtoDashboard'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { ChartData } from '../types'

export default function RtoAnalysis() {
  const { filters, handleFilterChange } = useUrlFilters()

  const [data, setData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/data/saidi-vre.json')
        if (!response.ok) {
          throw new Error('Failed to load data')
        }
        const jsonData = await response.json()
        setData(jsonData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  return (
    <>
      <section className="page-hero">
        <p className="hero-eyebrow">Data Explorer</p>
        <h1 className="hero-title">
          <span className="hero-topic">RTO Region Analysis</span>
        </h1>
        <p className="hero-subtitle">
          Compare grid reliability across Regional Transmission Organizations
        </p>
      </section>

      <main className="container">
        {loading && (
          <div className="loading">
            <span className="loading-text">Loading visualization...</span>
          </div>
        )}

        {error && (
          <div className="error">
            <strong>Unable to load data</strong>
            <p>Please run the data pipeline: <code>npm run data:update</code></p>
          </div>
        )}

        {data && (
          <>
            <RtoDashboard
              yearStart={filters.yearStart}
              yearEnd={filters.yearEnd}
              reliabilityMetric={filters.reliabilityMetric as 'saidi' | 'saifi'}
              includeMED={filters.includeMED}
              yearsAvailable={data.metadata.yearsAvailable}
              onYearStartChange={(year) => handleFilterChange({ yearStart: year })}
              onYearEndChange={(year) => handleFilterChange({ yearEnd: year })}
              onMetricChange={(metric) => handleFilterChange({ reliabilityMetric: metric })}
              onIncludeMEDChange={(include) => handleFilterChange({ includeMED: include })}
            />

            <div className="share-url">
              <strong>Shareable link:</strong>
              <a href={window.location.href} className="share-link-url">{window.location.href}</a>
            </div>

            <div className="source-info">
              <strong>Data Sources</strong>
              <ul>
                <li>
                  Utility reliability and RTO membership —{' '}
                  <a href="https://www.eia.gov/electricity/data/eia861/" target="_blank" rel="noopener noreferrer">
                    EIA Form 861
                  </a>
                </li>
              </ul>
              <p>
                Last updated: {data?.metadata?.lastUpdated?.split('T')[0] || 'Unknown'}
              </p>
            </div>
          </>
        )}
      </main>
    </>
  )
}

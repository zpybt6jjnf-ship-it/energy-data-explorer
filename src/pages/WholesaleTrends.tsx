import { useState, useEffect } from 'react'
import WholesaleTrendsChart from '../components/charts/WholesaleTrendsChart'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { ChartData } from '../types'

export default function WholesaleTrends() {
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
        <p className="hero-eyebrow">Markets</p>
        <h1 className="hero-title">
          <span className="hero-topic">Wholesale Price Trends</span>
        </h1>
        <p className="hero-subtitle">
          Track wholesale electricity prices at major trading hubs over time
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
            <WholesaleTrendsChart
              yearStart={filters.yearStart}
              yearEnd={filters.yearEnd}
              yearsAvailable={data.metadata.yearsAvailable}
              onYearStartChange={(year) => handleFilterChange({ yearStart: year })}
              onYearEndChange={(year) => handleFilterChange({ yearEnd: year })}
            />

            <div className="source-info">
              <strong>Data Sources</strong>
              <ul>
                <li>
                  Wholesale Electricity Prices —{' '}
                  <a href="https://www.eia.gov/electricity/wholesalemarkets/" target="_blank" rel="noopener noreferrer">
                    EIA Wholesale Electricity Markets (ICE data)
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

import { useState, useEffect } from 'react'
import RateVreChart from '../components/RateVreChart'
import RatesOverTimeChart from '../components/charts/RatesOverTimeChart'
import RateVolatilityChart from '../components/charts/RateVolatilityChart'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { ChartData } from '../types'

export default function Affordability() {
  const { filters, handleFilterChange, resetViewport } = useUrlFilters()

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
          <span className="hero-topic">U.S. Electricity Affordability</span>
        </h1>
        <p className="hero-subtitle">
          Exploring electricity prices across states and their relationship to energy sources
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
            <RateVreChart
              data={data}
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetViewport={resetViewport}
            />

            <RatesOverTimeChart
              data={data}
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetViewport={resetViewport}
            />

            <RateVolatilityChart
              data={data}
              yearStart={filters.yearStart}
              yearEnd={filters.yearEnd}
              onYearStartChange={(year) => handleFilterChange({ yearStart: year })}
              onYearEndChange={(year) => handleFilterChange({ yearEnd: year })}
            />

            <div className="share-url">
              <strong>Shareable link:</strong>
              <a href={window.location.href} className="share-link-url">{window.location.href}</a>
            </div>

            <div className="source-info">
              <strong>Data Sources</strong>
              <ul>
                <li>
                  Retail Electricity Rates —{' '}
                  <a href="https://www.eia.gov/electricity/sales_revenue_price/" target="_blank" rel="noopener noreferrer">
                    EIA Electric Sales, Revenue, and Price
                  </a>
                </li>
                <li>
                  VRE Penetration (Wind + Solar generation share) —{' '}
                  <a href="https://www.eia.gov/electricity/data/state/" target="_blank" rel="noopener noreferrer">
                    EIA State Electricity Profiles
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

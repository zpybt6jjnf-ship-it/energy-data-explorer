import { useState, useEffect } from 'react'
import RatesOverTimeChart from '../components/charts/RatesOverTimeChart'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { ChartData } from '../types'

export default function AffordabilityTrends() {
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
        <p className="hero-eyebrow">Affordability</p>
        <h1 className="hero-title">
          <span className="hero-topic">Rate Trends</span>
        </h1>
        <p className="hero-subtitle">
          Track electricity rate changes over time by state and sector
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
            <RatesOverTimeChart
              data={data}
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetViewport={resetViewport}
            />

            <div className="source-info">
              <strong>Data Sources</strong>
              <ul>
                <li>
                  Retail Electricity Rates —{' '}
                  <a href="https://www.eia.gov/electricity/sales_revenue_price/" target="_blank" rel="noopener noreferrer">
                    EIA Electric Sales, Revenue, and Price
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

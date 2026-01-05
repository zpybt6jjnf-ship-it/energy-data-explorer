import { useState, useEffect } from 'react'
import SaidiVreChart from '../components/SaidiVreChart'
import SaidiOverTimeChart from '../components/SaidiOverTimeChart'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { ChartData } from '../types'

export default function SaidiVre() {
  const { filters, handleFilterChange, resetViewport, resetTimeViewport } = useUrlFilters()

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
          <span className="hero-topic">U.S. Grid Reliability</span>
        </h1>
        <p className="hero-subtitle">
          Exploring power outage patterns across states, over time, and in relation to energy sources
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
            <SaidiVreChart
              data={data}
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetViewport={resetViewport}
            />

            <SaidiOverTimeChart
              data={data}
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetViewport={resetTimeViewport}
            />

            <div className="share-url">
              <strong>Shareable link:</strong>
              <code>{window.location.href}</code>
            </div>

            <div className="source-info">
              <strong>Data Sources</strong>
              <ul>
                <li>
                  SAIDI (System Average Interruption Duration Index) —{' '}
                  <a href="https://www.eia.gov/electricity/data/eia861/" target="_blank" rel="noopener noreferrer">
                    EIA Form 861
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

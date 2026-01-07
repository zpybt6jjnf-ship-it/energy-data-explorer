import { useState, useEffect } from 'react'
import ReliabilityChart from '../components/ReliabilityChart'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { ChartData } from '../types'

export default function ReliabilityVre() {
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
        <p className="hero-eyebrow">Reliability</p>
        <h1 className="hero-title">
          <span className="hero-topic">Reliability vs. Renewables</span>
        </h1>
        <p className="hero-subtitle">
          Exploring the relationship between grid reliability and renewable energy adoption
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
            <ReliabilityChart
              data={data}
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetViewport={resetViewport}
            />

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

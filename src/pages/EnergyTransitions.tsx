import { useState, useEffect } from 'react'
import GenerationSankeyChart from '../components/charts/GenerationSankeyChart'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { ChartData } from '../types'

export default function EnergyTransitions() {
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
          <span className="hero-topic">Energy Transition Flows</span>
        </h1>
        <p className="hero-subtitle">
          Visualize how electricity generation sources have shifted over time
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
            <GenerationSankeyChart
              data={data}
              yearStart={filters.yearStart}
              yearEnd={filters.yearEnd}
              yearsAvailable={data.metadata.yearsAvailable}
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
                  State Electricity Generation by Fuel Type —{' '}
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

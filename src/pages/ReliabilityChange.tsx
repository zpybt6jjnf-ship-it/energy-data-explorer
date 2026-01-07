import { useState, useEffect } from 'react'
import ReliabilityChangeScatter from '../components/charts/ReliabilityChangeScatter'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { ChartData } from '../types'

export default function ReliabilityChange() {
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
        <p className="hero-eyebrow">Reliability</p>
        <h1 className="hero-title">
          <span className="hero-topic">Reliability Change</span>
        </h1>
        <p className="hero-subtitle">
          Compare change in reliability vs change in renewables between any two years
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
            <ReliabilityChangeScatter
              data={data}
              yearStart={filters.changeYearStart}
              yearEnd={filters.changeYearEnd}
              reliabilityMetric={filters.reliabilityMetric as 'saidi' | 'saifi'}
              includeMED={filters.includeMED}
              onYearStartChange={(year) => handleFilterChange({ changeYearStart: year })}
              onYearEndChange={(year) => handleFilterChange({ changeYearEnd: year })}
              onMetricChange={(metric) => handleFilterChange({ reliabilityMetric: metric })}
              onIncludeMEDChange={(include) => handleFilterChange({ includeMED: include })}
            />

            <div className="source-info">
              <strong>Data Sources</strong>
              <ul>
                <li>
                  SAIDI/SAIFI (Reliability metrics) —{' '}
                  <a href="https://www.eia.gov/electricity/data/eia861/" target="_blank" rel="noopener noreferrer">
                    EIA Form 861
                  </a>
                </li>
                <li>
                  VRE Penetration —{' '}
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

import { useState, useEffect } from 'react'
import ReliabilityOverTimeChart from '../components/ReliabilityOverTimeChart'
import SourceInfo from '../components/SourceInfo'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { ChartData } from '../types'

export default function ReliabilityTrends() {
  const { filters, handleFilterChange, resetTimeViewport } = useUrlFilters()

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
          <span className="hero-topic">Reliability Trends</span>
        </h1>
        <p className="hero-subtitle">
          Track how grid reliability has changed over time for states and regions
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
            <ReliabilityOverTimeChart
              data={data}
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetViewport={resetTimeViewport}
            />

            <SourceInfo
              sources={[
                {
                  label: 'SAIDI/SAIFI',
                  description: 'Reliability metrics',
                  url: 'https://www.eia.gov/electricity/data/eia861/'
                }
              ]}
              yearsAvailable={data?.metadata?.yearsAvailable}
              lastUpdated={data?.metadata?.lastUpdated}
            />
          </>
        )}
      </main>
    </>
  )
}

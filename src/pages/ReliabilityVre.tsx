import ReliabilityChart from '../components/ReliabilityChart'
import SourceInfo from '../components/SourceInfo'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { useAsyncData } from '../hooks/useAsyncData'
import { ChartData } from '../types'

export default function ReliabilityVre() {
  const { filters, handleFilterChange, resetViewport } = useUrlFilters()
  const { data, loading, error } = useAsyncData<ChartData>('/data/saidi-vre.json')

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

            <SourceInfo
              sources={[
                {
                  label: 'SAIDI/SAIFI',
                  description: 'System Average Interruption Duration/Frequency Index',
                  url: 'https://www.eia.gov/electricity/data/eia861/'
                },
                {
                  label: 'VRE Penetration',
                  description: 'Wind + Solar generation share',
                  url: 'https://www.eia.gov/electricity/data/state/'
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

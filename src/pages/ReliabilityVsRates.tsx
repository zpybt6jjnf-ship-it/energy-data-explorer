import ReliabilityRatesChart from '../components/charts/ReliabilityRatesChart'
import SourceInfo from '../components/SourceInfo'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { useAsyncData } from '../hooks/useAsyncData'
import { ChartData } from '../types'

export default function ReliabilityVsRates() {
  const { filters, handleFilterChange, resetViewport } = useUrlFilters()
  const { data, loading, error } = useAsyncData<ChartData>('/data/saidi-vre.json')

  return (
    <>
      <section className="page-hero">
        <p className="hero-eyebrow">Reliability</p>
        <h1 className="hero-title">
          <span className="hero-topic">Reliability vs. Electricity Prices</span>
        </h1>
        <p className="hero-subtitle">
          Exploring whether higher electricity rates correlate with better grid reliability
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
            <ReliabilityRatesChart
              data={data}
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetViewport={resetViewport}
            />

            <div className="share-url">
              <strong>Shareable link:</strong>
              <a href={window.location.href} className="share-link-url">{window.location.href}</a>
            </div>

            <SourceInfo
              sources={[
                {
                  label: 'SAIDI/SAIFI',
                  description: 'Reliability metrics',
                  url: 'https://www.eia.gov/electricity/data/eia861/'
                },
                {
                  label: 'Retail Rates',
                  description: 'State Electricity Profiles',
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

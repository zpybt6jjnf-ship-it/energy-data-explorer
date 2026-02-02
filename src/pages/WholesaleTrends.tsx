import WholesaleTrendsChart from '../components/charts/WholesaleTrendsChart'
import SourceInfo from '../components/SourceInfo'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { useAsyncData } from '../hooks/useAsyncData'
import { ChartData } from '../types'

export default function WholesaleTrends() {
  const { filters, handleFilterChange } = useUrlFilters()
  const { data, loading, error } = useAsyncData<ChartData>('/data/saidi-vre.json')

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

            <SourceInfo
              sources={[
                {
                  label: 'Wholesale Prices',
                  description: 'Wholesale Electricity Markets (ICE data)',
                  url: 'https://www.eia.gov/electricity/wholesalemarkets/'
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

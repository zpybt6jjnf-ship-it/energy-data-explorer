import RateVolatilityChart from '../components/charts/RateVolatilityChart'
import SourceInfo from '../components/SourceInfo'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { useAsyncData } from '../hooks/useAsyncData'
import { ChartData } from '../types'

export default function AffordabilityVolatility() {
  const { filters, handleFilterChange } = useUrlFilters()
  const { data, loading, error } = useAsyncData<ChartData>('/data/saidi-vre.json')

  return (
    <>
      <section className="page-hero">
        <p className="hero-eyebrow">Affordability</p>
        <h1 className="hero-title">
          <span className="hero-topic">Rate Volatility</span>
        </h1>
        <p className="hero-subtitle">
          How does fuel mix exposure affect electricity rate stability?
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
            <RateVolatilityChart
              data={data}
              yearStart={filters.yearStart}
              yearEnd={filters.yearEnd}
              onYearStartChange={(year) => handleFilterChange({ yearStart: year })}
              onYearEndChange={(year) => handleFilterChange({ yearEnd: year })}
            />

            <SourceInfo
              sources={[
                {
                  label: 'Retail Rates',
                  description: 'Electric Sales, Revenue, and Price',
                  url: 'https://www.eia.gov/electricity/sales_revenue_price/'
                },
                {
                  label: 'Generation Mix',
                  description: 'Natural Gas Generation Share',
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

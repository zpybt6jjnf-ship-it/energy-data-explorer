import RatesOverTimeChart from '../components/charts/RatesOverTimeChart'
import SourceInfo from '../components/SourceInfo'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { useAsyncData } from '../hooks/useAsyncData'
import { ChartData } from '../types'

export default function AffordabilityTrends() {
  const { filters, handleFilterChange, resetViewport } = useUrlFilters()
  const { data, loading, error } = useAsyncData<ChartData>('/data/saidi-vre.json')

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

            <SourceInfo
              sources={[
                {
                  label: 'Retail Rates',
                  description: 'Electric Sales, Revenue, and Price',
                  url: 'https://www.eia.gov/electricity/sales_revenue_price/'
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

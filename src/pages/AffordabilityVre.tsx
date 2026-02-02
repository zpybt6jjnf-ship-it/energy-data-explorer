import RateVreChart from '../components/RateVreChart'
import SourceInfo from '../components/SourceInfo'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { useAsyncData } from '../hooks/useAsyncData'
import { ChartData } from '../types'

export default function AffordabilityVre() {
  const { filters, handleFilterChange, resetViewport } = useUrlFilters()
  const { data, loading, error } = useAsyncData<ChartData>('/data/saidi-vre.json')

  return (
    <>
      <section className="page-hero">
        <p className="hero-eyebrow">Affordability</p>
        <h1 className="hero-title">
          <span className="hero-topic">Rates vs. Renewables</span>
        </h1>
        <p className="hero-subtitle">
          Explore how retail electricity rates relate to renewable energy adoption
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
            <RateVreChart
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

import EnergyMixChart from '../components/charts/EnergyMixChart'
import SourceInfo from '../components/SourceInfo'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { useAsyncData } from '../hooks/useAsyncData'
import { ChartData } from '../types'

export default function EnergyMix() {
  const { filters, handleFilterChange, resetTimeViewport } = useUrlFilters()
  const { data, loading, error } = useAsyncData<ChartData>('/data/saidi-vre.json')

  return (
    <>
      <section className="page-hero">
        <p className="hero-eyebrow">Generation</p>
        <h1 className="hero-title">
          <span className="hero-topic">Generation Mix</span>
        </h1>
        <p className="hero-subtitle">
          Exploring how states generate electricity and how the mix is changing over time
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
            <EnergyMixChart
              data={data}
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetViewport={resetTimeViewport}
            />

            <div className="share-url">
              <strong>Shareable link:</strong>
              <a href={window.location.href} className="share-link-url">{window.location.href}</a>
            </div>

            <SourceInfo
              sources={[
                {
                  label: 'Generation',
                  description: 'Generation by Fuel Type',
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

import ReliabilityChangeMap from '../components/charts/ReliabilityChangeMap'
import SourceInfo from '../components/SourceInfo'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { useAsyncData } from '../hooks/useAsyncData'
import { ChartData } from '../types'

export default function ReliabilityMapPage() {
  const { filters, handleFilterChange } = useUrlFilters()
  const { data, loading, error } = useAsyncData<ChartData>('/data/saidi-vre.json')

  return (
    <>
      <section className="page-hero">
        <p className="hero-eyebrow">Reliability</p>
        <h1 className="hero-title">
          <span className="hero-topic">Reliability Change Map</span>
        </h1>
        <p className="hero-subtitle">
          See which states improved or degraded in grid reliability between any two years
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
            <ReliabilityChangeMap
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

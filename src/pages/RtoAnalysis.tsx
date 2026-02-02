import RtoDashboard from '../components/charts/RtoDashboard'
import SourceInfo from '../components/SourceInfo'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { useAsyncData } from '../hooks/useAsyncData'
import { ChartData } from '../types'

export default function RtoAnalysis() {
  const { filters, handleFilterChange } = useUrlFilters()
  const { data, loading, error } = useAsyncData<ChartData>('/data/saidi-vre.json')

  return (
    <>
      <section className="page-hero">
        <p className="hero-eyebrow">Reliability</p>
        <h1 className="hero-title">
          <span className="hero-topic">RTO Region Analysis</span>
        </h1>
        <p className="hero-subtitle">
          Compare grid reliability across Regional Transmission Organizations
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
            <RtoDashboard
              yearStart={filters.yearStart}
              yearEnd={filters.yearEnd}
              reliabilityMetric={filters.reliabilityMetric as 'saidi' | 'saifi'}
              includeMED={filters.includeMED}
              yearsAvailable={data.metadata.yearsAvailable}
              onYearStartChange={(year) => handleFilterChange({ yearStart: year })}
              onYearEndChange={(year) => handleFilterChange({ yearEnd: year })}
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
                  label: 'RTO Membership',
                  description: 'Utility reliability and RTO membership',
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

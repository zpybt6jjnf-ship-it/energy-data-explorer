import OutageCausesChart from '../components/charts/OutageCausesChart'
import SourceInfo from '../components/SourceInfo'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { useAsyncData } from '../hooks/useAsyncData'
import { OutageEventData } from '../types'

export default function OutageCauses() {
  const { filters, handleFilterChange } = useUrlFilters()
  const { data: outageData, loading, error } = useAsyncData<OutageEventData>('/data/outage-events.json')

  const yearsAvailable = outageData?.metadata?.yearsAvailable || [2014, 2023]

  return (
    <>
      <section className="page-hero">
        <p className="hero-eyebrow">Outages</p>
        <h1 className="hero-title">
          <span className="hero-topic">Outage Causes</span>
        </h1>
        <p className="hero-subtitle">
          What causes major power outages? Explore patterns by cause category
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

        {outageData && (
          <>
            <OutageCausesChart
              yearStart={Math.max(filters.yearStart, yearsAvailable[0])}
              yearEnd={Math.min(filters.yearEnd, yearsAvailable[yearsAvailable.length - 1])}
              yearsAvailable={yearsAvailable}
              onYearStartChange={(year) => handleFilterChange({ yearStart: year })}
              onYearEndChange={(year) => handleFilterChange({ yearEnd: year })}
            />

            <SourceInfo
              sources={[
                {
                  label: 'Outage Events',
                  description: 'DOE Event-Correlated Outage Dataset',
                  url: 'https://data.openei.org/submissions/6458'
                },
                {
                  label: 'DOE-417',
                  description: 'Electric Emergency Incident Reports',
                  url: 'https://www.oe.netl.doe.gov/oe417.aspx'
                }
              ]}
              yearsAvailable={outageData?.metadata?.yearsAvailable}
              lastUpdated={outageData?.metadata?.lastUpdated}
            />
          </>
        )}
      </main>
    </>
  )
}

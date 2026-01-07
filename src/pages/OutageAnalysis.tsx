import { useState, useEffect } from 'react'
import OutageCausesChart from '../components/charts/OutageCausesChart'
import WeatherVulnerabilityMap from '../components/charts/WeatherVulnerabilityMap'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { OutageEventData } from '../types'

export default function OutageAnalysis() {
  const { filters, handleFilterChange } = useUrlFilters()

  const [outageData, setOutageData] = useState<OutageEventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/data/outage-events.json')
        if (!response.ok) {
          throw new Error('Failed to load data')
        }
        const jsonData = await response.json()
        setOutageData(jsonData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const yearsAvailable = outageData?.metadata?.yearsAvailable || [2014, 2023]

  return (
    <>
      <section className="page-hero">
        <p className="hero-eyebrow">Data Explorer</p>
        <h1 className="hero-title">
          <span className="hero-topic">Power Outage Analysis</span>
        </h1>
        <p className="hero-subtitle">
          Understand what causes major power outages and which states are most vulnerable
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

            <WeatherVulnerabilityMap
              yearStart={Math.max(filters.yearStart, yearsAvailable[0])}
              yearEnd={Math.min(filters.yearEnd, yearsAvailable[yearsAvailable.length - 1])}
              yearsAvailable={yearsAvailable}
              onYearStartChange={(year) => handleFilterChange({ yearStart: year })}
              onYearEndChange={(year) => handleFilterChange({ yearEnd: year })}
            />

            <div className="share-url">
              <strong>Shareable link:</strong>
              <a href={window.location.href} className="share-link-url">{window.location.href}</a>
            </div>

            <div className="source-info">
              <strong>Data Sources</strong>
              <ul>
                <li>
                  Power Outage Events —{' '}
                  <a href="https://data.openei.org/submissions/6458" target="_blank" rel="noopener noreferrer">
                    DOE Event-Correlated Outage Dataset
                  </a>
                </li>
                <li>
                  Major Disturbance Reports —{' '}
                  <a href="https://www.oe.netl.doe.gov/oe417.aspx" target="_blank" rel="noopener noreferrer">
                    DOE-417 Electric Emergency Incident Reports
                  </a>
                </li>
              </ul>
              <p>
                Last updated: {outageData?.metadata?.lastUpdated?.split('T')[0] || 'Unknown'}
              </p>
            </div>
          </>
        )}
      </main>
    </>
  )
}

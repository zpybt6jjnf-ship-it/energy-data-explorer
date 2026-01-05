import ChartCard from '../components/ChartCard'

const AVAILABLE_CHARTS = [
  {
    id: 'saidi-vre',
    title: 'Grid Reliability Explorer',
    description: 'Explore U.S. power grid reliability data. Compare SAIDI against renewable energy penetration, or track reliability trends over time by state.',
    href: '/explore/saidi-vre',
    thumbnail: '/thumbnails/saidi-vre.svg',
    tags: ['SAIDI', 'VRE', 'Trends', 'Reliability']
  },
  {
    id: 'affordability',
    title: 'Electricity Affordability Explorer',
    description: 'Explore retail electricity prices across U.S. states. Compare rates against renewable energy penetration to see how clean energy affects costs.',
    href: '/explore/affordability',
    thumbnail: '/thumbnails/saidi-vre.svg',
    tags: ['Rates', 'VRE', 'Affordability', 'Prices']
  }
]

export default function Home() {
  return (
    <>
      <section className="home-hero">
        <h1 className="home-title">Energy Data Explorer</h1>
        <p className="home-subtitle">
          Interactive visualizations exploring the U.S. electricity sector
        </p>
      </section>

      <main className="container">
        <section className="chart-gallery">
          <h2 className="gallery-title">Explore the Data</h2>
          <div className="chart-grid">
            {AVAILABLE_CHARTS.map(chart => (
              <ChartCard
                key={chart.id}
                title={chart.title}
                description={chart.description}
                href={chart.href}
                thumbnail={chart.thumbnail}
                tags={chart.tags}
              />
            ))}
          </div>
        </section>

        <section className="about-section">
          <h2>About This Project</h2>
          <p>
            Energy Data Explorer is a collection of interactive visualizations that make U.S. electricity
            sector data accessible and explorable. All data comes from the U.S. Energy Information
            Administration (EIA).
          </p>
          <p className="about-disclaimer">
            This is a demo project for portfolio purposes. The visualizations are exploratory in nature
            and should not be used for policy or investment decisions.
          </p>
        </section>
      </main>
    </>
  )
}

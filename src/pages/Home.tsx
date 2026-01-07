import ChartCard from '../components/ChartCard'

const AVAILABLE_CHARTS = [
  {
    id: 'reliability',
    title: 'Grid Reliability Explorer',
    description: 'Explore U.S. power grid reliability data. Compare outages against renewable energy mix, or track reliability trends over time.',
    href: '/explore/reliability',
    thumbnail: '/thumbnails/reliability.svg',
    tags: ['SAIDI', 'VRE', 'Trends', 'Reliability']
  },
  {
    id: 'affordability',
    title: 'Electricity Affordability Explorer',
    description: 'Explore retail electricity prices across U.S. Compare rates against renewable mix to see how clean energy affects costs.',
    href: '/explore/affordability',
    thumbnail: '/thumbnails/affordability.svg',
    tags: ['Rates', 'VRE', 'Affordability', 'Prices']
  },
  {
    id: 'energy-mix',
    title: 'Energy Mix Explorer',
    description: 'Visualize how the U.S. generates electricity.',
    href: '/explore/energy-mix',
    thumbnail: '/thumbnails/energy-mix.svg',
    tags: ['Generation', 'Fuel Mix', 'Trends', 'Decarbonization']
  },
  {
    id: 'reliability-rates',
    title: 'Reliability vs. Prices',
    description: 'Do higher electricity rates lead to better grid reliability? Explore the relationship between what customers pay and service quality.',
    href: '/explore/reliability-rates',
    thumbnail: '/thumbnails/reliability.svg',
    tags: ['SAIDI', 'Rates', 'Reliability', 'Prices']
  },
  {
    id: 'reliability-map',
    title: 'Reliability Change Map',
    description: 'Interactive U.S. map showing which states improved or degraded in grid reliability between any two years.',
    href: '/explore/reliability-map',
    thumbnail: '/thumbnails/reliability.svg',
    tags: ['Map', 'SAIDI', 'YoY Change', 'States']
  },
  {
    id: 'rto-analysis',
    title: 'RTO Region Analysis',
    description: 'Compare grid reliability across Regional Transmission Organizations (RTOs). See how PJM, MISO, ERCOT, and other regions perform over time.',
    href: '/explore/rto-analysis',
    thumbnail: '/thumbnails/reliability.svg',
    tags: ['RTO', 'SAIDI', 'Regions', 'Comparison']
  },
  {
    id: 'energy-transitions',
    title: 'Energy Transition Flows',
    description: 'Sankey diagram showing how electricity generation sources have shifted over time. See the rise of renewables and decline of coal.',
    href: '/explore/energy-transitions',
    thumbnail: '/thumbnails/energy-mix.svg',
    tags: ['Sankey', 'Generation', 'Transition', 'Fuel Mix']
  },
  {
    id: 'wholesale',
    title: 'Wholesale Markets',
    description: 'Explore wholesale electricity prices at major trading hubs and compare to retail rates. See how much markup customers pay.',
    href: '/explore/wholesale',
    thumbnail: '/thumbnails/affordability.svg',
    tags: ['Wholesale', 'Prices', 'Markets', 'Trading Hubs']
  },
  {
    id: 'outage-analysis',
    title: 'Power Outage Analysis',
    description: 'What causes major power outages? Explore weather vulnerability and outage patterns across U.S. states.',
    href: '/explore/outage-analysis',
    thumbnail: '/thumbnails/reliability.svg',
    tags: ['Outages', 'Weather', 'DOE-417', 'Vulnerability']
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

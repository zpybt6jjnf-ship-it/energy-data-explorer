import ChartCard from '../components/ChartCard'

type ChartType = 'scatter' | 'line' | 'area' | 'bar' | 'map' | 'box' | 'sankey'

interface ChartConfig {
  id: string
  title: string
  description: string
  href: string
  chartType: ChartType
  tags: string[]
  category: 'reliability' | 'affordability' | 'generation' | 'markets' | 'outages'
  status: 'ready' | 'demo'
}

// All available charts organized by status and category
const CHARTS: ChartConfig[] = [
  // === READY CHARTS (tested with real data) ===

  // Reliability category
  {
    id: 'reliability-vre',
    title: 'Reliability vs. Renewables',
    description: 'Compare grid reliability metrics (SAIDI outage duration, SAIFI outage frequency) against renewable energy penetration by state.',
    href: '/explore/reliability/vre',
    chartType: 'scatter',
    tags: ['SAIDI', 'SAIFI', 'VRE'],
    category: 'reliability',
    status: 'ready'
  },
  {
    id: 'reliability-trends',
    title: 'Reliability Trends',
    description: 'Track how grid reliability has changed over time for states and regions.',
    href: '/explore/reliability/trends',
    chartType: 'line',
    tags: ['SAIDI', 'SAIFI', 'Trends'],
    category: 'reliability',
    status: 'ready'
  },

  // Affordability category
  {
    id: 'rates-vre',
    title: 'Rates vs. Renewables',
    description: 'Explore how retail electricity rates relate to renewable energy adoption.',
    href: '/explore/affordability/vre',
    chartType: 'scatter',
    tags: ['Rates', 'VRE'],
    category: 'affordability',
    status: 'ready'
  },
  {
    id: 'rates-trends',
    title: 'Rate Trends',
    description: 'Track electricity rate changes over time by state and sector.',
    href: '/explore/affordability/trends',
    chartType: 'line',
    tags: ['Rates', 'Trends'],
    category: 'affordability',
    status: 'ready'
  },

  // Generation category
  {
    id: 'energy-mix',
    title: 'Generation Mix',
    description: 'Stacked area chart showing electricity generation by fuel source over time.',
    href: '/explore/generation/mix',
    chartType: 'area',
    tags: ['Fuel Mix'],
    category: 'generation',
    status: 'ready'
  },

  // === DEMO CHARTS (sample data, work in progress) ===

  // Reliability demos
  {
    id: 'reliability-change',
    title: 'Reliability Change',
    description: 'Compare change in reliability vs change in renewables between any two years.',
    href: '/explore/reliability/change',
    chartType: 'scatter',
    tags: ['SAIDI', 'SAIFI', 'VRE'],
    category: 'reliability',
    status: 'demo'
  },
  {
    id: 'reliability-map',
    title: 'Reliability Change Map',
    description: 'Choropleth map showing which states improved or degraded in reliability.',
    href: '/explore/reliability/map',
    chartType: 'map',
    tags: ['SAIDI', 'SAIFI', 'Map'],
    category: 'reliability',
    status: 'demo'
  },
  {
    id: 'reliability-rates',
    title: 'Reliability vs. Rates',
    description: 'Do higher rates buy better reliability? Explore the relationship.',
    href: '/explore/reliability/rates',
    chartType: 'scatter',
    tags: ['SAIDI', 'SAIFI', 'Rates'],
    category: 'reliability',
    status: 'demo'
  },
  {
    id: 'reliability-ownership',
    title: 'Reliability by Ownership',
    description: 'Compare reliability across IOUs, co-ops, and municipal utilities.',
    href: '/explore/reliability/ownership',
    chartType: 'box',
    tags: ['SAIDI', 'SAIFI', 'Ownership'],
    category: 'reliability',
    status: 'demo'
  },
  {
    id: 'rto-analysis',
    title: 'RTO Region Comparison',
    description: 'Compare reliability trends across Regional Transmission Organizations.',
    href: '/explore/reliability/rto',
    chartType: 'line',
    tags: ['RTO', 'SAIDI', 'SAIFI'],
    category: 'reliability',
    status: 'demo'
  },

  // Affordability demos
  {
    id: 'rate-volatility',
    title: 'Rate Volatility',
    description: 'How does fuel mix exposure affect electricity rate stability?',
    href: '/explore/affordability/volatility',
    chartType: 'scatter',
    tags: ['Rates', 'Volatility'],
    category: 'affordability',
    status: 'demo'
  },

  // Generation demos
  {
    id: 'energy-transitions',
    title: 'Energy Transition Flows',
    description: 'Sankey diagram showing how generation sources have shifted between years.',
    href: '/explore/generation/transitions',
    chartType: 'sankey',
    tags: ['Transition', 'Fuel Mix'],
    category: 'generation',
    status: 'demo'
  },

  // Markets demos
  {
    id: 'wholesale-retail',
    title: 'Wholesale vs. Retail Prices',
    description: 'Compare wholesale hub prices to retail rates. See the markup by region.',
    href: '/explore/markets/wholesale-retail',
    chartType: 'scatter',
    tags: ['Wholesale', 'Retail'],
    category: 'markets',
    status: 'demo'
  },
  {
    id: 'wholesale-trends',
    title: 'Wholesale Price Trends',
    description: 'Track wholesale electricity prices at major trading hubs over time.',
    href: '/explore/markets/trends',
    chartType: 'line',
    tags: ['Wholesale', 'Trends'],
    category: 'markets',
    status: 'demo'
  },

  // Outages demos
  {
    id: 'outage-causes',
    title: 'Outage Causes',
    description: 'What causes major power outages? Breakdown by cause category over time.',
    href: '/explore/outages/causes',
    chartType: 'bar',
    tags: ['Causes', 'Weather'],
    category: 'outages',
    status: 'demo'
  },
  {
    id: 'weather-vulnerability',
    title: 'Weather Vulnerability Map',
    description: 'Which states are most vulnerable to weather-driven outages?',
    href: '/explore/outages/weather-map',
    chartType: 'map',
    tags: ['Weather', 'Vulnerability'],
    category: 'outages',
    status: 'demo'
  }
]

const CATEGORY_LABELS: Record<string, string> = {
  reliability: 'Grid Reliability',
  affordability: 'Electricity Prices',
  generation: 'Generation Mix',
  markets: 'Wholesale Markets',
  outages: 'Power Outages'
}

const CATEGORY_ICONS: Record<string, string> = {
  reliability: '⚡',
  affordability: '$',
  generation: '🔋',
  markets: '📊',
  outages: '⚠'
}

const CATEGORY_ORDER = ['reliability', 'affordability', 'generation', 'markets', 'outages']

export default function Home() {
  const readyCharts = CHARTS.filter(c => c.status === 'ready')
  const demoCharts = CHARTS.filter(c => c.status === 'demo')

  // Group ready charts by category
  const readyByCategory = CATEGORY_ORDER.map(cat => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    icon: CATEGORY_ICONS[cat],
    charts: readyCharts.filter(c => c.category === cat)
  })).filter(g => g.charts.length > 0)

  return (
    <>
      <section className="home-hero">
        <h1 className="home-title">
          <span className="title-highlight">Energy Data Explorer</span>
        </h1>
        <p className="home-subtitle">
          Interactive visualizations exploring <strong>reliability</strong>, <strong>affordability</strong>, and <strong>generation</strong> across the U.S. electricity sector
        </p>
        <p className="home-stats">
          {readyCharts.length} production charts &bull; {demoCharts.length} in development &bull; 10+ years of EIA data
        </p>
      </section>

      <main className="container">
        {/* Ready Charts Section - grouped by category */}
        <section className="chart-gallery">
          <div className="gallery-header">
            <h2 className="gallery-title">Explore the Data</h2>
            <p className="gallery-subtitle">
              Production-ready visualizations built with real data from the U.S. Energy Information Administration
            </p>
          </div>

          {readyByCategory.map(group => (
            <div key={group.category} className="category-group">
              <h3 className="category-title">
                <span className="category-icon">{group.icon}</span>
                <span className="category-name">{group.label}</span>
                <span className="category-count">{group.charts.length}</span>
              </h3>
              <div className="chart-grid">
                {group.charts.map(chart => (
                  <ChartCard
                    key={chart.id}
                    title={chart.title}
                    description={chart.description}
                    href={chart.href}
                    chartType={chart.chartType}
                    tags={chart.tags}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Demo Charts Section */}
        <section className="chart-gallery demo-gallery">
          <div className="gallery-header">
            <h2 className="gallery-title">
              <span className="demo-badge">Preview</span>
              In Development
            </h2>
            <p className="gallery-subtitle">
              Experimental visualizations using sample data. Real data integration coming soon.
            </p>
          </div>

          <div className="chart-grid">
            {demoCharts.map(chart => (
              <ChartCard
                key={chart.id}
                title={chart.title}
                description={chart.description}
                href={chart.href}
                chartType={chart.chartType}
                tags={chart.tags}
                isDemo
              />
            ))}
          </div>
        </section>

        <section className="about-section">
          <h2>About This Project</h2>
          <p>
            Energy Data Explorer is a collection of interactive visualizations that make U.S. electricity
            sector data accessible and explorable. Primary data comes from the U.S. Energy Information
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

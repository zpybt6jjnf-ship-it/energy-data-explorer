import { Link } from 'react-router-dom'

type ChartType = 'scatter' | 'line' | 'area' | 'bar' | 'map' | 'box' | 'sankey'

interface ChartCardProps {
  title: string
  description: string
  href: string
  chartType?: ChartType
  tags?: string[]
  isDemo?: boolean
}

// SVG icons for each chart type
const ChartTypeIcon = ({ type }: { type: ChartType }) => {
  const icons: Record<ChartType, JSX.Element> = {
    scatter: (
      <svg viewBox="0 0 100 60" className="chart-type-icon">
        <circle cx="20" cy="40" r="6" fill="currentColor" opacity="0.8" />
        <circle cx="35" cy="25" r="6" fill="currentColor" opacity="0.8" />
        <circle cx="50" cy="35" r="6" fill="currentColor" opacity="0.8" />
        <circle cx="65" cy="15" r="6" fill="currentColor" opacity="0.8" />
        <circle cx="80" cy="28" r="6" fill="currentColor" opacity="0.8" />
      </svg>
    ),
    line: (
      <svg viewBox="0 0 100 60" className="chart-type-icon">
        <polyline
          points="10,45 30,30 50,35 70,15 90,25"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="45" r="4" fill="currentColor" />
        <circle cx="30" cy="30" r="4" fill="currentColor" />
        <circle cx="50" cy="35" r="4" fill="currentColor" />
        <circle cx="70" cy="15" r="4" fill="currentColor" />
        <circle cx="90" cy="25" r="4" fill="currentColor" />
      </svg>
    ),
    area: (
      <svg viewBox="0 0 100 60" className="chart-type-icon">
        <path
          d="M10,50 L10,40 L30,30 L50,35 L70,20 L90,25 L90,50 Z"
          fill="currentColor"
          opacity="0.3"
        />
        <polyline
          points="10,40 30,30 50,35 70,20 90,25"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    bar: (
      <svg viewBox="0 0 100 60" className="chart-type-icon">
        <rect x="10" y="30" width="15" height="25" fill="currentColor" opacity="0.8" rx="2" />
        <rect x="30" y="15" width="15" height="40" fill="currentColor" opacity="0.8" rx="2" />
        <rect x="50" y="25" width="15" height="30" fill="currentColor" opacity="0.8" rx="2" />
        <rect x="70" y="10" width="15" height="45" fill="currentColor" opacity="0.8" rx="2" />
      </svg>
    ),
    map: (
      <svg viewBox="0 0 100 60" className="chart-type-icon">
        <path
          d="M20,15 L35,10 L50,18 L65,12 L80,20 L85,35 L75,45 L60,50 L45,45 L30,48 L15,40 L20,25 Z"
          fill="currentColor"
          opacity="0.3"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="40" cy="28" r="4" fill="currentColor" />
        <circle cx="60" cy="32" r="4" fill="currentColor" />
        <circle cx="55" cy="22" r="3" fill="currentColor" opacity="0.6" />
      </svg>
    ),
    box: (
      <svg viewBox="0 0 100 60" className="chart-type-icon">
        {/* Box plot representation */}
        <line x1="25" y1="10" x2="25" y2="50" stroke="currentColor" strokeWidth="2" />
        <rect x="15" y="20" width="20" height="20" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />
        <line x1="15" y1="30" x2="35" y2="30" stroke="currentColor" strokeWidth="3" />

        <line x1="65" y1="15" x2="65" y2="45" stroke="currentColor" strokeWidth="2" />
        <rect x="55" y="22" width="20" height="16" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />
        <line x1="55" y1="28" x2="75" y2="28" stroke="currentColor" strokeWidth="3" />
      </svg>
    ),
    sankey: (
      <svg viewBox="0 0 100 60" className="chart-type-icon">
        {/* Sankey flow representation */}
        <path
          d="M10,10 C40,10 40,15 70,15 L70,25 C40,25 40,20 10,20 Z"
          fill="currentColor"
          opacity="0.6"
        />
        <path
          d="M10,25 C40,25 40,35 70,30 L70,40 C40,45 40,35 10,35 Z"
          fill="currentColor"
          opacity="0.4"
        />
        <path
          d="M10,40 C40,40 40,50 70,45 L70,55 C40,60 40,50 10,50 Z"
          fill="currentColor"
          opacity="0.3"
        />
      </svg>
    )
  }

  return icons[type] || icons.scatter
}

const CHART_TYPE_LABELS: Record<ChartType, string> = {
  scatter: 'Scatter Plot',
  line: 'Line Chart',
  area: 'Area Chart',
  bar: 'Bar Chart',
  map: 'Map',
  box: 'Box Plot',
  sankey: 'Sankey Diagram'
}

export default function ChartCard({
  title,
  description,
  href,
  chartType = 'scatter',
  tags,
  isDemo = false
}: ChartCardProps) {
  return (
    <Link to={href} className={`chart-card ${isDemo ? 'chart-card-demo' : ''}`}>
      <div className="chart-card-thumbnail">
        <ChartTypeIcon type={chartType} />
        <span className="chart-type-label">{CHART_TYPE_LABELS[chartType]}</span>
      </div>
      <div className="chart-card-content">
        <h3 className="chart-card-title">{title}</h3>
        <p className="chart-card-description">{description}</p>
        {tags && tags.length > 0 && (
          <div className="chart-card-tags">
            {tags.map(tag => (
              <span key={tag} className="chart-card-tag">{tag}</span>
            ))}
          </div>
        )}
        <span className="chart-card-cta">
          Explore <span className="cta-arrow">→</span>
        </span>
      </div>
    </Link>
  )
}

import { Link } from 'react-router-dom'

interface ChartCardProps {
  title: string
  description: string
  href: string
  thumbnail?: string
  tags?: string[]
}

export default function ChartCard({ title, description, href, thumbnail, tags }: ChartCardProps) {
  return (
    <Link to={href} className="chart-card">
      <div className="chart-card-thumbnail">
        {thumbnail ? (
          <img src={thumbnail} alt="" />
        ) : (
          <div className="chart-card-placeholder">
            <svg viewBox="0 0 100 60" className="placeholder-icon">
              <polyline
                points="10,45 25,30 40,40 60,20 75,35 90,25"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="25" cy="30" r="4" fill="currentColor" />
              <circle cx="40" cy="40" r="4" fill="currentColor" />
              <circle cx="60" cy="20" r="4" fill="currentColor" />
              <circle cx="75" cy="35" r="4" fill="currentColor" />
            </svg>
          </div>
        )}
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
      </div>
    </Link>
  )
}

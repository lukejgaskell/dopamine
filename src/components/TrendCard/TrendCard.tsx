import type { Trend } from '../../types/trend'
import './TrendCard.css'

interface TrendCardProps {
  trend: Trend
  onClick: () => void
}

export function TrendCard({ trend, onClick }: TrendCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="trend-card">
      <div className="trend-header">
        <h3 className="trend-name">{trend.name}</h3>
        <span className="trend-id">#{String(trend.id).slice(0, 8)}</span>
      </div>
      <div className="trend-info">
        <div className="trend-info-item">
          <span className="trend-label">Modules:</span>
          <span className="trend-module-count">{trend.modules.length}</span>
        </div>
        <div className="trend-info-item">
          <span className="trend-label">Created:</span>
          <span className="trend-date">{formatDate(trend.created_at)}</span>
        </div>
      </div>

      <div className="trend-actions">
        <button
          onClick={onClick}
          className="trend-action-button edit-button"
        >
          Edit
        </button>
      </div>
    </div>
  )
}

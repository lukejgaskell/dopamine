import type { Dataset } from '../../types/dataset'
import './DatasetCard.css'

interface DatasetCardProps {
  dataset: Dataset
  onClick: () => void
}

export function DatasetCard({ dataset, onClick }: DatasetCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="dataset-card">
      <div className="dataset-header">
        <h3 className="dataset-name">{dataset.name}</h3>
        <span className="dataset-id">#{String(dataset.id).slice(0, 8)}</span>
      </div>
      <div className="dataset-info">
        <div className="dataset-info-item">
          <span className="dataset-label">Items:</span>
          <span className="dataset-item-count">{dataset.data.length}</span>
        </div>
        <div className="dataset-info-item">
          <span className="dataset-label">Created:</span>
          <span className="dataset-date">{formatDate(dataset.created_at)}</span>
        </div>
      </div>

      <div className="dataset-actions">
        <button
          onClick={onClick}
          className="dataset-action-button edit-button"
        >
          Edit
        </button>
      </div>
    </div>
  )
}

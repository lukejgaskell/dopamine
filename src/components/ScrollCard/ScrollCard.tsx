import { useNavigate } from 'react-router-dom'
import type { Scroll } from '../../types/scroll'
import './ScrollCard.css'

interface ScrollCardProps {
  scroll: Scroll
  onClick: () => void
}

export function ScrollCard({ scroll, onClick }: ScrollCardProps) {
  const navigate = useNavigate()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getShareableLink = () => {
    if (!scroll.key) return null
    const baseUrl = window.location.origin
    return `${baseUrl}/scroll/${scroll.id}?key=${scroll.key}`
  }

  const handleViewResults = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/results/${scroll.id}`)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick()
  }

  const handleGoTo = (e: React.MouseEvent) => {
    e.stopPropagation()
    const link = getShareableLink()
    if (link) {
      window.open(link, '_blank')
    }
  }

  const shareableLink = (scroll.status === 'active' || scroll.status === 'draft') ? getShareableLink() : null

  return (
    <div className="scroll-card">
      <div className="scroll-header">
        <h3 className="scroll-name">{scroll.name}</h3>
        <span className="scroll-id">#{scroll.id.slice(0, 8)}</span>
      </div>
      <div className="scroll-info">
        <div className="scroll-info-item">
          <span className="scroll-label">Status:</span>
          <span className={`scroll-status status-${scroll.status.toLowerCase()}`}>
            {scroll.status}
          </span>
        </div>
        <div className="scroll-info-item">
          <span className="scroll-label">Created:</span>
          <span className="scroll-date">{formatDate(scroll.created_at)}</span>
        </div>
      </div>

      <div className="scroll-actions">
        {scroll.status === 'draft' && (
          <button
            onClick={handleEdit}
            className="scroll-action-button edit-button"
          >
            Edit
          </button>
        )}
        {(scroll.status === 'draft' || scroll.status === 'active') && shareableLink && (
          <button
            onClick={handleGoTo}
            className="scroll-action-button goto-button"
          >
            Go to
          </button>
        )}
        {scroll.status === 'completed' && (
          <button
            onClick={handleViewResults}
            className="scroll-action-button results-button"
          >
            Results
          </button>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Scroll } from '../types/scroll'
import './ScrollCard.css'

interface ScrollCardProps {
  scroll: Scroll
  onClick: () => void
}

export default function ScrollCard({ scroll, onClick }: ScrollCardProps) {
  const [copied, setCopied] = useState(false)
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

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    const link = getShareableLink()
    if (link) {
      navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleViewResults = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/results/${scroll.id}`)
  }

  const shareableLink = scroll.status === 'active' ? getShareableLink() : null

  return (
    <div className="scroll-card" onClick={onClick}>
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

      {shareableLink && (
        <div className="scroll-share-section">
          <div className="scroll-share-label">Public Link:</div>
          <div className="scroll-share-link-container">
            <input
              type="text"
              value={shareableLink}
              readOnly
              className="scroll-share-input"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={handleCopyLink}
              className="scroll-copy-button"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {scroll.status === 'completed' && (
        <div className="scroll-results-section">
          <button
            onClick={handleViewResults}
            className="view-results-button"
          >
            View Results
          </button>
        </div>
      )}
    </div>
  )
}

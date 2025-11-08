import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Scroll } from '../types/scroll'
import './NewScrollForm.css'

interface EditScrollFormProps {
  scroll: Scroll
  onClose: () => void
  onUpdated: () => void
}

export default function EditScrollForm({ scroll, onClose, onUpdated }: EditScrollFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState({
    name: scroll.name,
    type: scroll.type,
    status: scroll.status,
  })

  const getShareableLink = () => {
    if (!scroll.key) return null
    const baseUrl = window.location.origin
    return `${baseUrl}/scroll/${scroll.id}?key=${scroll.key}`
  }

  const handleCopyLink = () => {
    const link = getShareableLink()
    if (link) {
      navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('scrolls')
        .update({
          name: formData.name,
          type: formData.type,
          status: formData.status,
        })
        .eq('id', scroll.id)

      if (error) throw error
      onUpdated()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this scroll?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('scrolls')
        .delete()
        .eq('id', scroll.id)

      if (error) throw error
      onUpdated()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Scroll</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              placeholder="Enter scroll name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="type">Type</label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              disabled={loading}
            >
              <option value="survey">Survey</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              disabled={loading}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="form-group">
            <label>ID</label>
            <div className="readonly-field">{scroll.id}</div>
          </div>

          <div className="form-group">
            <label>Key</label>
            <div className="readonly-field">{scroll.key || 'Not generated yet'}</div>
          </div>

          {formData.status === 'active' && scroll.key && (
            <div className="form-group">
              <label>Public Link</label>
              <div className="share-link-container">
                <input
                  type="text"
                  value={getShareableLink() || ''}
                  readOnly
                  className="share-link-input"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="copy-link-button"
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button
              type="button"
              onClick={handleDelete}
              className="delete-button"
              disabled={loading}
            >
              Delete
            </button>
            <div style={{ flex: 1 }}></div>
            <button
              type="button"
              onClick={onClose}
              className="cancel-button"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

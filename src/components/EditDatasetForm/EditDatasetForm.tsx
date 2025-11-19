import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Dataset } from '../../types/dataset'
import '../NewScrollForm/NewScrollForm.css'
import '../NewDatasetForm/DatasetForm.css'

interface EditDatasetFormProps {
  dataset: Dataset
  onClose: () => void
  onUpdated: () => void
}

export function EditDatasetForm({ dataset, onClose, onUpdated }: EditDatasetFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: dataset.name,
    data: [...dataset.data],
  })
  const [newItem, setNewItem] = useState('')

  const handleAddItem = () => {
    if (newItem.trim()) {
      setFormData(prev => ({
        ...prev,
        data: [...prev.data, newItem.trim()]
      }))
      setNewItem('')
    }
  }

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      data: prev.data.filter((_, i) => i !== index)
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddItem()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (formData.data.length === 0) {
      setError('Please add at least one item to the dataset')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase
        .from('datasets')
        .update({
          name: formData.name,
          data: formData.data,
        })
        .eq('id', dataset.id)

      if (error) throw error
      onUpdated()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this dataset?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('datasets')
        .delete()
        .eq('id', dataset.id)

      if (error) throw error
      onUpdated()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fullscreen-modal-overlay">
      <div className="fullscreen-modal-content">
        <div className="fullscreen-modal-header">
          <h2>Edit Dataset</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="fullscreen-form">
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                placeholder="Enter dataset name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Items</h3>
            <p className="section-description">Add items to your dataset. Press Enter or click Add to save each item.</p>
            <div className="dataset-input-group">
              <input
                type="text"
                placeholder="Enter an item..."
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="dataset-item-input"
              />
              <button
                type="button"
                onClick={handleAddItem}
                disabled={!newItem.trim() || loading}
                className="dataset-add-button"
              >
                Add
              </button>
            </div>

            {formData.data.length === 0 ? (
              <div className="dataset-items-empty">
                <p>No items added yet. Add items to build your dataset.</p>
              </div>
            ) : (
              <div className="dataset-items-list">
                {formData.data.map((item, index) => (
                  <div key={index} className="dataset-item">
                    <span className="dataset-item-number">#{index + 1}</span>
                    <span className="dataset-item-text">{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      disabled={loading}
                      className="dataset-item-remove"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="fullscreen-form-actions">
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

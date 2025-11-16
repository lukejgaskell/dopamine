import { useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import type { Scroll } from '../types/scroll'
import { MODULE_DEFINITIONS, type ModuleConfig, type ModuleType } from '../types/module'
import ModuleConfigEditor from './ModuleConfigEditor'
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
  const [qrCopied, setQrCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState({
    name: scroll.name,
    type: scroll.type,
    status: scroll.status,
    modules: (scroll.modules || []) as ModuleConfig[],
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

  const handleCopyQR = async () => {
    if (!qrRef.current) return

    const svg = qrRef.current.querySelector('svg')
    if (!svg) return

    try {
      const svgData = new XMLSerializer().serializeToString(svg)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = async () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)

        canvas.toBlob(async (blob) => {
          if (blob) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ])
            setQrCopied(true)
            setTimeout(() => setQrCopied(false), 2000)
          }
        }, 'image/png')
      }

      img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
    } catch (err) {
      console.error('Failed to copy QR code:', err)
    }
  }

  const handleDownloadQR = () => {
    if (!qrRef.current) return

    const svg = qrRef.current.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)

      const link = document.createElement('a')
      link.download = `${scroll.name.replace(/\s+/g, '-')}-qr.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  const isModuleSelected = (moduleType: ModuleType) => {
    return formData.modules.some(m => m.type === moduleType)
  }

  const handleModuleToggle = (moduleType: ModuleType) => {
    setFormData(prev => {
      const isSelected = prev.modules.some(m => m.type === moduleType)
      if (isSelected) {
        return {
          ...prev,
          modules: prev.modules.filter(m => m.type !== moduleType)
        }
      } else {
        const definition = MODULE_DEFINITIONS[moduleType]
        return {
          ...prev,
          modules: [...prev.modules, { ...definition.defaultConfig }]
        }
      }
    })
  }

  const handleModuleConfigChange = (moduleType: ModuleType, newConfig: ModuleConfig) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.map(m =>
        m.type === moduleType ? newConfig : m
      )
    }))
  }

  const getModuleConfig = (moduleType: ModuleType) => {
    return formData.modules.find(m => m.type === moduleType)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (formData.modules.length === 0) {
      setError('Please select at least one module')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase
        .from('scrolls')
        .update({
          name: formData.name,
          type: formData.type,
          status: formData.status,
          modules: formData.modules,
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
    <div className="fullscreen-modal-overlay">
      <div className="fullscreen-modal-content">
        <div className="fullscreen-modal-header">
          <h2>Edit Scroll</h2>
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
                placeholder="Enter scroll name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="form-row">
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
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>ID</label>
                <div className="readonly-field">{scroll.id}</div>
              </div>

              <div className="form-group">
                <label>Key</label>
                <div className="readonly-field">{scroll.key || 'Not generated yet'}</div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Modules</h3>
            <p className="section-description">Select and configure the modules you want to include in your scroll</p>
            <div className="modules-list">
              {Object.values(MODULE_DEFINITIONS).map(module => {
                const isSelected = isModuleSelected(module.id as ModuleType)
                const config = getModuleConfig(module.id as ModuleType)

                return (
                  <div key={module.id} className="module-item">
                    <div
                      className={`module-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleModuleToggle(module.id as ModuleType)}
                    >
                      <div className="module-checkbox">
                        {isSelected && <span>✓</span>}
                      </div>
                      <div className="module-info">
                        <h4>{module.name}</h4>
                        <p>{module.description}</p>
                      </div>
                    </div>
                    {isSelected && config && (
                      <ModuleConfigEditor
                        config={config}
                        onChange={(newConfig) => handleModuleConfigChange(module.id as ModuleType, newConfig)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {formData.status === 'active' && scroll.key && (
            <div className="form-section">
              <h3>Share</h3>
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
                <div className="qr-code-wrapper">
                  <div className="qr-code-container" ref={qrRef}>
                    <QRCodeSVG
                      value={getShareableLink() || ''}
                      size={160}
                      level="M"
                      includeMargin={true}
                    />
                  </div>
                  <div className="qr-code-actions">
                    <button
                      type="button"
                      onClick={handleCopyQR}
                      className="qr-action-button"
                    >
                      {qrCopied ? 'Copied!' : 'Copy QR'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadQR}
                      className="qr-action-button"
                    >
                      Download PNG
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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

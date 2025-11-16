import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { MODULE_DEFINITIONS, type ModuleConfig, type ModuleType } from '../types/module'
import ModuleConfigEditor from './ModuleConfigEditor'
import './NewScrollForm.css'

interface NewScrollFormProps {
  onClose: () => void
  onCreated: () => void
}

export default function NewScrollForm({ onClose, onCreated }: NewScrollFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'survey',
    status: 'draft',
    modules: [] as ModuleConfig[],
  })

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
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase.from('scrolls').insert([
        {
          name: formData.name,
          type: formData.type,
          status: formData.status,
          user_id: user.id,
          modules: formData.modules,
        },
      ])

      if (error) throw error
      onCreated()
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
          <h2>Create New Scroll</h2>
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

          {error && <div className="error-message">{error}</div>}

          <div className="fullscreen-form-actions">
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
              {loading ? 'Creating...' : 'Create Scroll'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

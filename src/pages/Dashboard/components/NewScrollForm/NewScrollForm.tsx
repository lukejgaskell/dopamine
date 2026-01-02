import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import type { Trend } from '../../../../types/trend'
import type { Dataset } from '../../../../types/dataset'
import { MODULE_DEFINITIONS, type ModuleConfig, type ModuleType } from '../../../../types/module'
import { ModuleConfigEditor } from '../ModuleConfigEditor'
import './NewScrollForm.css'
import '../EditTrendForm/TrendForm.css'

type NewScrollFormProps = {
  onClose: () => void
  onCreated: () => void
}

export function NewScrollForm({ onClose, onCreated }: NewScrollFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trends, setTrends] = useState<Trend[]>([])
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [selectedTrendId, setSelectedTrendId] = useState<string>('')
  const [formData, setFormData] = useState({
    name: '',
    modules: [] as ModuleConfig[],
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const [trendsResult, datasetsResult] = await Promise.all([
          supabase.from('trends').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('datasets').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        ])

        if (trendsResult.error) throw trendsResult.error
        if (datasetsResult.error) throw datasetsResult.error

        setTrends(trendsResult.data || [])
        setDatasets(datasetsResult.data || [])
      } catch (error: any) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
  }, [])

  const handleTrendSelect = (trendId: string) => {
    setSelectedTrendId(trendId)
    if (!trendId) {
      setFormData(prev => ({ ...prev, modules: [] }))
      return
    }

    const selectedTrend = trends.find(t => t.id === trendId)
    if (selectedTrend) {
      // Ensure all modules from trends have IDs
      const modulesWithIds = (selectedTrend.modules || []).map(m => ({
        ...m,
        id: m.id || crypto.randomUUID()
      }))
      setFormData(prev => ({
        ...prev,
        modules: modulesWithIds
      }))
    }
  }

  const hasDatasetBuilder = () => {
    return formData.modules.some(m =>
      m.type === 'dataset' || MODULE_DEFINITIONS[m.type]?.category === 'datasetBuilder'
    )
  }

  const handleAddModule = (moduleType: ModuleType) => {
    if (moduleType === 'dataset') return
    const definition = MODULE_DEFINITIONS[moduleType]
    if (!definition) return
    setFormData(prev => ({
      ...prev,
      modules: [...prev.modules, { ...definition.defaultConfig, id: crypto.randomUUID() }]
    }))
  }

  const handleAddDataset = (dataset: Dataset) => {
    setFormData(prev => ({
      ...prev,
      modules: [...prev.modules, {
        id: crypto.randomUUID(),
        type: 'dataset' as const,
        datasetId: dataset.id,
        datasetName: dataset.name,
      }]
    }))
  }

  const handleRemoveModule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.filter((_, i) => i !== index)
    }))
  }

  const handleMoveModuleUp = (index: number) => {
    if (index === 0) return

    const movingModule = formData.modules[index]
    const isMovingDatasetBuilder = movingModule.type === 'dataset' || MODULE_DEFINITIONS[movingModule.type]?.category === 'datasetBuilder'
    if (index === 1 && !isMovingDatasetBuilder) {
      return
    }

    setFormData(prev => {
      const newModules = [...prev.modules]
      const temp = newModules[index]
      newModules[index] = newModules[index - 1]
      newModules[index - 1] = temp
      return { ...prev, modules: newModules }
    })
  }

  const handleMoveModuleDown = (index: number) => {
    if (index === formData.modules.length - 1) return

    if (index === 0) {
      const currentModule = formData.modules[0]
      const isCurrentDatasetBuilder = currentModule.type === 'dataset' || MODULE_DEFINITIONS[currentModule.type]?.category === 'datasetBuilder'
      if (isCurrentDatasetBuilder) {
        return
      }
    }

    setFormData(prev => {
      const newModules = [...prev.modules]
      const temp = newModules[index]
      newModules[index] = newModules[index + 1]
      newModules[index + 1] = temp
      return { ...prev, modules: newModules }
    })
  }

  const handleModuleConfigChange = (index: number, newConfig: ModuleConfig) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.map((m, i) =>
        i === index ? newConfig : m
      )
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (formData.modules.length === 0) {
      setError('Please select a trend or add at least one module')
      setLoading(false)
      return
    }

    // Validate that first module is a dataset builder
    const firstModule = formData.modules[0]
    const isDatasetBuilder = firstModule.type === 'dataset' || MODULE_DEFINITIONS[firstModule.type]?.category === 'datasetBuilder'
    if (!isDatasetBuilder) {
      setError('The first module must be a dataset builder (e.g., Brainstorm or Dataset)')
      setLoading(false)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not authenticated')
      }

      // Ensure all modules have IDs and add dataset_id to dataset builder modules
      const modulesWithIdsAndDatasetId = formData.modules.map(module => {
        const moduleWithId = { ...module, id: module.id || crypto.randomUUID() }
        if (moduleWithId.type === 'dataset' || moduleWithId.type === 'brainstorm') {
          return { ...moduleWithId, dataset_id: crypto.randomUUID() }
        } else {
          return moduleWithId
        }
      })

      const { error } = await supabase.from('scrolls').insert([
        {
          name: formData.name,
          status: 'draft',
          user_id: user.id,
          modules: modulesWithIdsAndDatasetId,
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
          </div>

          <div className="form-section">
            <h3>Select Trend</h3>
            <p className="section-description">Choose a trend to pre-populate modules, or start from scratch</p>
            <div className="trend-cards">
              <div
                className={`trend-selection-card ${selectedTrendId === '' ? 'selected' : ''}`}
                onClick={() => handleTrendSelect('')}
              >
                <div className="trend-selection-header">
                  <h4>From Scratch</h4>
                  <div className="trend-selection-check">
                    {selectedTrendId === '' && <span>✓</span>}
                  </div>
                </div>
                <p className="trend-selection-description">Start with an empty module flow and build your own</p>
              </div>
              {trends.map(trend => (
                <div
                  key={trend.id}
                  className={`trend-selection-card ${selectedTrendId === trend.id ? 'selected' : ''}`}
                  onClick={() => handleTrendSelect(trend.id)}
                >
                  <div className="trend-selection-header">
                    <h4>{trend.name}</h4>
                    <div className="trend-selection-check">
                      {selectedTrendId === trend.id && <span>✓</span>}
                    </div>
                  </div>
                  <p className="trend-selection-description">{trend.modules.length} module{trend.modules.length !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h3>Dataset Builders</h3>
            <p className="section-description">Build your dataset. Every flow must start with a dataset builder.</p>
            <div className="modules-available">
              {Object.values(MODULE_DEFINITIONS)
                .filter(module => module.category === 'datasetBuilder')
                .map(module => (
                  <button
                    key={module.id}
                    type="button"
                    className="module-add-button dataset-builder"
                    onClick={() => handleAddModule(module.id as ModuleType)}
                    disabled={loading}
                  >
                    <span className="module-add-icon">+</span>
                    <span className="module-add-name">{module.name}</span>
                  </button>
                ))}
              {datasets.map(dataset => (
                <button
                  key={dataset.id}
                  type="button"
                  className="module-add-button dataset-builder"
                  onClick={() => handleAddDataset(dataset)}
                  disabled={loading}
                >
                  <span className="module-add-icon">+</span>
                  <span className="module-add-name">{dataset.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h3>Analysis Modules</h3>
            <p className="section-description">
              {hasDatasetBuilder()
                ? 'Analyze and work with your dataset. Add these after a dataset builder.'
                : 'Add a dataset builder first to unlock analysis modules.'}
            </p>
            <div className="modules-available">
              {Object.values(MODULE_DEFINITIONS)
                .filter(module => module.category === 'analysis')
                .map(module => (
                  <button
                    key={module.id}
                    type="button"
                    className="module-add-button"
                    onClick={() => handleAddModule(module.id as ModuleType)}
                    disabled={loading || !hasDatasetBuilder()}
                  >
                    <span className="module-add-icon">+</span>
                    <span className="module-add-name">{module.name}</span>
                  </button>
                ))}
            </div>
          </div>

          <div className="form-section">
            <h3>Module Flow</h3>
            <p className="section-description">Configure your modules in order. Use arrows to reorder.</p>
            {formData.modules.length === 0 ? (
              <div className="modules-empty">
                <p>No modules added yet. Select a trend or add modules from above to get started.</p>
              </div>
            ) : (
              <div className="modules-flow">
                {formData.modules.map((moduleConfig, index) => {
                  const definition = moduleConfig.type === 'dataset' ? null : MODULE_DEFINITIONS[moduleConfig.type]
                  const isDatasetBuilder = moduleConfig.type === 'dataset' || definition?.category === 'datasetBuilder'
                  const moduleName = moduleConfig.type === 'dataset'
                    ? (moduleConfig.datasetName || 'Dataset')
                    : definition?.name || 'Unknown'
                  return (
                    <div key={index} className={`module-flow-item ${isDatasetBuilder ? 'dataset-builder' : ''}`}>
                      <div className="module-flow-header">
                        <div className="module-flow-info">
                          <span className="module-flow-number">#{index + 1}</span>
                          <span className="module-flow-name">{moduleName}</span>
                        </div>
                        <div className="module-flow-actions">
                          <button
                            type="button"
                            className="module-flow-btn"
                            onClick={() => handleMoveModuleUp(index)}
                            disabled={
                              index === 0 ||
                              loading ||
                              (index === 1 && !isDatasetBuilder)
                            }
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="module-flow-btn"
                            onClick={() => handleMoveModuleDown(index)}
                            disabled={
                              index === formData.modules.length - 1 ||
                              loading ||
                              (index === 0 && isDatasetBuilder)
                            }
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="module-flow-btn delete"
                            onClick={() => handleRemoveModule(index)}
                            disabled={loading}
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      <ModuleConfigEditor
                        config={moduleConfig}
                        onChange={(newConfig) => handleModuleConfigChange(index, newConfig)}
                      />
                    </div>
                  )
                })}
              </div>
            )}
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

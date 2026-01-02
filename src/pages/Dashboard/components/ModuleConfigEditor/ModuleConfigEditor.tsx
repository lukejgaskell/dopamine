import type { ModuleConfig } from '../../../../types/module'
import './ModuleConfigEditor.css'

type ModuleConfigEditorProps = {
  config: ModuleConfig
  onChange: (config: ModuleConfig) => void
}

export function ModuleConfigEditor({ config, onChange }: ModuleConfigEditorProps) {
  const handleChange = (field: string, value: any) => {
    onChange({ ...config, [field]: value })
  }

  const renderFields = () => {
    switch (config.type) {
      case 'brainstorm':
        return (
          <>
            <div className="config-field">
              <label>Time Limit (minutes)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={config.timeLimit || 10}
                onChange={(e) => handleChange('timeLimit', parseInt(e.target.value))}
              />
            </div>
            <div className="config-field">
              <label>
                <input
                  type="checkbox"
                  checked={config.allowAnonymous || false}
                  onChange={(e) => handleChange('allowAnonymous', e.target.checked)}
                />
                Allow Anonymous Submissions
              </label>
            </div>
          </>
        )

      case 'vote':
        return (
          <div className="config-field">
            <label>Max Votes Per User</label>
            <input
              type="number"
              min="1"
              max="100"
              value={config.maxVotesPerUser || 3}
              onChange={(e) => handleChange('maxVotesPerUser', parseInt(e.target.value))}
            />
          </div>
        )

      case 'weighted_vote':
        return (
          <>
            <div className="config-field">
              <label>Total Points Per User</label>
              <input
                type="number"
                min="1"
                max="100"
                value={config.totalPoints || 10}
                onChange={(e) => handleChange('totalPoints', parseInt(e.target.value))}
              />
            </div>
            <div className="config-field">
              <label>Max Points Per Item</label>
              <input
                type="number"
                min="1"
                max="100"
                value={config.maxPointsPerItem || 5}
                onChange={(e) => handleChange('maxPointsPerItem', parseInt(e.target.value))}
              />
            </div>
          </>
        )

      case 'likert_vote':
        return (
          <>
            <div className="config-field">
              <label>Scale (1 to N)</label>
              <input
                type="number"
                min="3"
                max="10"
                value={config.scale || 5}
                onChange={(e) => handleChange('scale', parseInt(e.target.value))}
              />
            </div>
            <div className="config-field">
              <label>Low Label</label>
              <input
                type="text"
                value={config.lowLabel || 'Low'}
                onChange={(e) => handleChange('lowLabel', e.target.value)}
                placeholder="e.g., Strongly Disagree"
              />
            </div>
            <div className="config-field">
              <label>High Label</label>
              <input
                type="text"
                value={config.highLabel || 'High'}
                onChange={(e) => handleChange('highLabel', e.target.value)}
                placeholder="e.g., Strongly Agree"
              />
            </div>
          </>
        )

      case 'rank_order':
        return (
          <div className="config-field">
            <label>Max Items to Rank</label>
            <input
              type="number"
              min="2"
              max="20"
              value={config.maxItems || 10}
              onChange={(e) => handleChange('maxItems', parseInt(e.target.value))}
            />
          </div>
        )

      case 'work_estimate':
        return (
          <div className="config-field">
            <label>Estimate Type</label>
            <select
              value={config.estimateType || 'hours'}
              onChange={(e) => handleChange('estimateType', e.target.value)}
            >
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="points">Story Points</option>
              <option value="tshirt">T-Shirt Sizes</option>
            </select>
          </div>
        )

      case 'grouping':
        return (
          <div className="config-field">
            <label>Max Groups</label>
            <input
              type="number"
              min="2"
              max="20"
              value={config.maxGroups || 5}
              onChange={(e) => handleChange('maxGroups', parseInt(e.target.value))}
            />
          </div>
        )

      case 'dataset':
        return (
          <div className="config-field">
            <label>Dataset</label>
            <div style={{ padding: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
              {config.datasetName || 'Unknown dataset'}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="module-config-editor">
      {config.type !== 'dataset' && (
        <div className="config-field">
          <label>Prompt</label>
          <input
            type="text"
            value={config.prompt || ''}
            onChange={(e) => handleChange('prompt', e.target.value)}
            placeholder="Instructions or question for participants"
          />
        </div>
      )}
      {renderFields()}
    </div>
  )
}

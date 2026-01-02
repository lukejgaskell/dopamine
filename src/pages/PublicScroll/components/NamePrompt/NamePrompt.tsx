import { useState } from 'react'
import './NamePrompt.css'

type NamePromptProps = {
  onSubmit: (name: string) => void
  onCancel?: () => void
  initialName?: string
}

export function NamePrompt({ onSubmit, onCancel, initialName = '' }: NamePromptProps) {
  const [name, setName] = useState(initialName)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onSubmit(name.trim())
    }
  }

  const isChangingName = initialName !== ''

  return (
    <div className="name-prompt-overlay">
      <div className="name-prompt-card">
        <h2>{isChangingName ? 'Change Name' : 'Welcome!'}</h2>
        <p>{isChangingName ? 'Enter your new name' : 'Please enter your name to continue'}</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
            className="name-input"
          />
          <div className="name-prompt-buttons">
            {isChangingName && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="name-cancel-button"
              >
                Cancel
              </button>
            )}
            <button type="submit" className="name-submit-button">
              {isChangingName ? 'Save' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

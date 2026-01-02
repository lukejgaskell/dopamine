import { useState, useRef } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useUserStore } from '../../../../store/userStore'
import './NewIdeaForm.css'

type NewIdeaFormProps = {
  scrollId: string
  datasetId?: string | null
  onIdeaCreated?: () => void
}

export function NewIdeaForm({ scrollId, datasetId, onIdeaCreated }: NewIdeaFormProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { name } = useUserStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return

    setLoading(true)
    setError(null)

    try {
      // Get current user session for unique_user_id
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase.from('ideas').insert([
        {
          text: text.trim(),
          scroll_id: scrollId,
          dataset_id: datasetId,
          unique_user_id: user?.id || null,
          created_by: name || 'Anonymous',
        },
      ])

      if (error) throw error

      setText('')

      // Refocus the textarea after successful submission
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)

      onIdeaCreated?.()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter, allow Shift+Enter for new lines
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <div className="new-idea-form">
      <form onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          placeholder="Share your idea... (Press Enter to post, Shift+Enter for new line)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className="new-idea-input"
          rows={3}
        />
        {error && <div className="new-idea-error">{error}</div>}
        <button type="submit" disabled={loading || !text.trim()} className="new-idea-submit">
          {loading ? 'Posting...' : 'Post Idea'}
        </button>
      </form>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../../../lib/supabase'
import type { Scroll } from '../../../../types/scroll'
import type { Idea } from '../../../../types/idea'
import { ScrollResults } from '../../../PublicScroll/components/ScrollResults'
import { Logo } from '../../../../components/Logo'
import './ScrollResultsPage.css'

export function ScrollResultsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [scroll, setScroll] = useState<Scroll | null>(null)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setError('Invalid scroll ID')
        setLoading(false)
        return
      }

      try {
        // Get current session to verify ownership
        const { data: sessionData } = await supabase.auth.getSession()

        if (!sessionData?.session?.user?.id) {
          setError('You must be logged in to view results')
          setLoading(false)
          return
        }

        // Fetch scroll data
        const { data: scrollData, error: scrollError } = await supabase
          .from('scrolls')
          .select('*')
          .eq('id', id)
          .eq('user_id', sessionData.session.user.id)
          .single()

        if (scrollError) throw scrollError

        if (!scrollData) {
          setError('Scroll not found or you do not have permission to view it')
          setLoading(false)
          return
        }

        setScroll(scrollData)

        // Fetch ideas for this scroll
        const { data: ideasData, error: ideasError } = await supabase
          .from('ideas')
          .select('*')
          .eq('scroll_id', id)
          .order('created_at', { ascending: false })

        if (ideasError) throw ideasError

        setIdeas(ideasData || [])
      } catch (err: any) {
        setError('Failed to load results')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const handleDelete = async () => {
    if (!scroll || !id) return

    if (!confirm('Are you sure you want to delete this scroll? This action cannot be undone.')) {
      return
    }

    setDeleting(true)

    try {
      const { error } = await supabase
        .from('scrolls')
        .delete()
        .eq('id', id)

      if (error) throw error

      navigate('/')
    } catch (err: any) {
      console.error('Error deleting scroll:', err)
      alert('Failed to delete scroll: ' + err.message)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="results-page-container">
        <div className="results-page-loading">Loading results...</div>
      </div>
    )
  }

  if (error || !scroll) {
    return (
      <div className="results-page-container">
        <div className="results-page-error">
          <h2>Error</h2>
          <p>{error || 'Failed to load scroll'}</p>
          <button onClick={() => navigate('/')} className="back-button">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="results-page-container">
      <header className="results-page-header">
        <div className="results-page-header-left">
          <Logo size="small" />
        </div>
        <div className="results-page-header-center">
          <h1 className="results-page-title">{scroll.name}</h1>
          <div className="results-page-status">
            <span className={`status-badge status-${scroll.status}`}>
              {scroll.status}
            </span>
          </div>
        </div>
        <div className="results-page-header-right">
          {scroll.status === 'completed' && (
            <button
              onClick={handleDelete}
              className="delete-button"
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
          <button onClick={() => navigate('/')} className="back-button">
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="results-page-main">
        {scroll.modules && scroll.modules.length > 0 ? (
          <ScrollResults modules={scroll.modules} ideas={ideas} />
        ) : (
          <div className="no-modules-message">
            <p>No modules configured for this scroll.</p>
          </div>
        )}
      </main>
    </div>
  )
}

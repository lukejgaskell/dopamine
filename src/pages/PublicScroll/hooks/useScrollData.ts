import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Scroll } from '../../../types/scroll'
import type { Idea } from '../../../types/idea'
import type { RealtimeChannel } from '@supabase/supabase-js'

type UseScrollDataReturn = {
  scroll: Scroll | null
  loading: boolean
  error: string | null
  ideas: Idea[]
  activeUsers: string[]
  channel: RealtimeChannel | null
  isOwner: boolean
  isAuthenticated: boolean
  currentModuleIndex: number
  showingModuleResults: boolean
  setCurrentModuleIndex: (index: number) => void
  setShowingModuleResults: (showing: boolean) => void
  fetchScrollData: () => Promise<void>
  setScroll: (scroll: Scroll) => void
}

export function useScrollData(
  id: string | undefined,
  key: string | null,
  name: string,
  isOwner: boolean
): UseScrollDataReturn {
  const [scroll, setScroll] = useState<Scroll | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [activeUsers, setActiveUsers] = useState<string[]>([])
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [internalIsOwner, setInternalIsOwner] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0)
  const [showingModuleResults, setShowingModuleResults] = useState(false)

  const fetchScrollData = async () => {
    if (!id || !key) {
      setError('Invalid scroll link')
      setLoading(false)
      return
    }

    try {
      // Get current session to check if user is owner/authenticated
      const { data: sessionData } = await supabase.auth.getSession()

      // Set authenticated state
      if (sessionData?.session?.user) {
        setIsAuthenticated(true)
      }

      const { data, error } = await supabase
        .from('scrolls')
        .select('*')
        .eq('id', id)
        .eq('key', key)
        .in('status', ['draft', 'active', 'completed'])
        .single()

      if (error) throw error

      if (!data) {
        setError('Scroll not found or not active')
      } else {
        setScroll(data)
        // Check if current user is the owner
        // For draft scrolls, assume the visitor is the owner
        if (
          data.status === 'draft' ||
          sessionData?.session?.user?.id === data.user_id
        ) {
          setInternalIsOwner(true)
        }
        // Parse step: format is "module-{index}" or "module-{index}-results"
        if (data.step) {
          const match = data.step.match(/^module-(\d+)(-results)?$/)
          if (match) {
            const stepIndex = parseInt(match[1])
            const isShowingResults = !!match[2]
            setCurrentModuleIndex(stepIndex)
            setShowingModuleResults(isShowingResults)
          }
        }
      }
    } catch (error: any) {
      setError('Scroll not found or not active')
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchScrollData()
  }, [id, key])

  // Fetch initial ideas
  useEffect(() => {
    if (!id || !scroll) return

    const fetchIdeas = async () => {
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('scroll_id', id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setIdeas(data)
      }
    }

    fetchIdeas()
  }, [id, scroll])

  // Set up real-time subscription for ideas
  useEffect(() => {
    if (!id) return

    const ideasChannel = supabase
      .channel(`ideas:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ideas',
          filter: `scroll_id=eq.${id}`,
        },
        (payload) => {
          setIdeas((current) => [payload.new as Idea, ...current])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ideas',
          filter: `scroll_id=eq.${id}`,
        },
        (payload) => {
          setIdeas((current) =>
            current.map((idea) =>
              idea.id === payload.new.id ? (payload.new as Idea) : idea
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'ideas',
          filter: `scroll_id=eq.${id}`,
        },
        (payload) => {
          setIdeas((current) =>
            current.filter((idea) => idea.id !== payload.old.id)
          )
        }
      )
      .subscribe()

    return () => {
      ideasChannel.unsubscribe()
    }
  }, [id])

  // Set up real-time subscription for scroll step changes
  useEffect(() => {
    if (!id) return

    const scrollChannel = supabase
      .channel(`scroll-updates:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scrolls',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const updatedScroll = payload.new as Scroll
          setScroll(updatedScroll)
          // Parse step: format is "module-{index}" or "module-{index}-results"
          if (updatedScroll.step) {
            const match = updatedScroll.step.match(/^module-(\d+)(-results)?$/)
            if (match) {
              const stepIndex = parseInt(match[1])
              const isShowingResults = !!match[2]
              setCurrentModuleIndex(stepIndex)
              setShowingModuleResults(isShowingResults)
            }
          }
        }
      )
      .subscribe()

    return () => {
      scrollChannel.unsubscribe()
    }
  }, [id])

  // Set up real-time presence
  useEffect(() => {
    if (!id) return

    // Determine the display name for presence
    const displayName = isOwner ? 'host' : name
    if (!displayName) return

    const scrollChannel = supabase.channel(`scroll:${id}`, {
      config: {
        presence: {
          key: displayName,
        },
      },
    })

    scrollChannel
      .on('presence', { event: 'sync' }, () => {
        const state = scrollChannel.presenceState()
        const users = Object.keys(state).map((key) => {
          const presence = state[key]
          return (presence[0] as any)?.name || key
        })
        setActiveUsers(users)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await scrollChannel.track({ name: displayName })
        }
      })

    setChannel(scrollChannel)

    return () => {
      scrollChannel.unsubscribe()
    }
  }, [id, name, isOwner])

  return {
    scroll,
    loading,
    error,
    ideas,
    activeUsers,
    channel,
    isOwner: internalIsOwner,
    isAuthenticated,
    currentModuleIndex,
    showingModuleResults,
    setCurrentModuleIndex,
    setShowingModuleResults,
    fetchScrollData,
    setScroll,
  }
}

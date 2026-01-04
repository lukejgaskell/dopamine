import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/store/userStore'
import { useDialog } from '@/components/Dialog'
import { NamePrompt } from './components/NamePrompt'
import { ActiveUsers } from './components/ActiveUsers'
import { ModuleRenderer } from './components/ModuleRenderer'
import { IntroView } from './components/IntroView'
import { ModuleResultsView } from './components/ModuleResultsView'
import { MobileMenu } from './components/MobileMenu'
import { ScrollHeader } from './components/ScrollHeader'
import { useScrollData } from './hooks/useScrollData'
import { useScrollNavigation } from './hooks/useScrollNavigation'
import { getActiveDatasetId } from './utils'
import { ScrollProvider } from './context'
import './PublicScroll.css'

export function PublicScroll() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const key = searchParams.get('key')
  const navigate = useNavigate()
  const { error: showError } = useDialog()

  const { name, setName } = useUserStore()
  const [showNamePrompt, setShowNamePrompt] = useState(false)
  const [showIntro, setShowIntro] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const hasInitializedSelection = useRef(false)

  const handleError = useCallback((message: string) => {
    showError({ title: 'Error', message })
  }, [showError])

  // Use custom hooks for data and navigation
  const {
    scroll,
    loading,
    error,
    ideas,
    activeUsers,
    channel,
    isOwner,
    isAuthenticated,
    currentModuleIndex,
    showingModuleResults,
    setCurrentModuleIndex,
    setShowingModuleResults,
    fetchScrollData,
  } = useScrollData(id, key, name || '', false)

  const {
    transitioning,
    selectedIdeaIds,
    handleNextModule,
    handleContinueToNext,
    handleCompleteSession,
    handleActivateLinks,
    handleStartSession,
    toggleIdeaSelection,
    toggleSelectAll,
  } = useScrollNavigation({
    scroll,
    isOwner,
    currentModuleIndex,
    setCurrentModuleIndex,
    setShowingModuleResults,
    fetchScrollData,
    ideas,
    onError: handleError,
    onNavigateToResults: (scrollId) => navigate(`/app/results/${scrollId}`),
  })

  // Hide intro if step is set (session has started)
  useEffect(() => {
    if (scroll?.step) {
      setShowIntro(false)
    }
  }, [scroll?.step])

  // Show name prompt if user doesn't have a name and scroll is loaded
  useEffect(() => {
    if (!name && scroll && !loading && !isOwner) {
      setShowNamePrompt(true)
    }
  }, [name, scroll, loading, isOwner])

  // Initialize selection when entering module results view
  useEffect(() => {
    if (showingModuleResults && !hasInitializedSelection.current) {
      // Get dataset ideas for current module
      if (scroll?.modules) {
        const currentModule = scroll.modules[currentModuleIndex] as any
        const datasetId =
          currentModule.type === 'brainstorm' || currentModule.type === 'dataset'
            ? currentModule.dataset_id
            : getActiveDatasetId(scroll.modules, currentModuleIndex)

        const datasetIdeas = ideas.filter((idea) => idea.dataset_id === datasetId && !idea.deleted)

        if (datasetIdeas.length > 0) {
          toggleSelectAll(datasetIdeas)
          hasInitializedSelection.current = true
        }
      }
    } else if (!showingModuleResults) {
      // Reset when leaving module results view
      hasInitializedSelection.current = false
    }
  }, [showingModuleResults, scroll, currentModuleIndex, ideas, toggleSelectAll])

  const handleNameSubmit = async (submittedName: string) => {
    // Sign in anonymously if not already authenticated
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      await supabase.auth.signInAnonymously()
    }

    setName(submittedName)
    setShowNamePrompt(false)

    // Update presence with new name
    if (channel && submittedName) {
      await channel.track({ name: submittedName })
    }
  }

  const handleNameClick = () => {
    setShowNamePrompt(true)
  }

  const handleCancelNameChange = () => {
    setShowNamePrompt(false)
  }

  if (loading) {
    return (
      <div className="public-scroll-container">
        <div className="public-scroll-loading">Loading scroll...</div>
      </div>
    )
  }

  if (error || !scroll) {
    return (
      <div className="public-scroll-container">
        <div className="public-scroll-error">
          <h2>Scroll Not Found</h2>
          <p>{error || 'This scroll is not available'}</p>
        </div>
      </div>
    )
  }

  // Show "session has ended" for non-host users when scroll is completed
  if (scroll.status === 'completed' && !isOwner) {
    return (
      <div className="public-scroll-container">
        <div className="session-ended">
          <h2>Session Has Ended</h2>
          <p>This scroll session has been completed. Thank you for participating!</p>
        </div>
      </div>
    )
  }

  // Get the display name for the current user
  const currentUserDisplayName = isOwner ? 'host' : name
  const currentModule = scroll.modules?.[currentModuleIndex]
  const hasNextModule =
    scroll.modules && currentModuleIndex < scroll.modules.length - 1

  // Show intro view
  if (showIntro && scroll.modules && scroll.modules.length > 0) {
    return (
      <IntroView
        scroll={scroll}
        isOwner={isOwner}
        isAuthenticated={isAuthenticated}
        transitioning={transitioning}
        onActivateLinks={handleActivateLinks}
        onStartSession={handleStartSession}
      />
    )
  }

  // Show module results between modules (for all users)
  if (showingModuleResults && scroll.modules) {
    // Get dataset ideas for this module
    const currentModule = scroll.modules[currentModuleIndex] as any
    const datasetId =
      currentModule.type === 'brainstorm' || currentModule.type === 'dataset'
        ? currentModule.dataset_id
        : getActiveDatasetId(scroll.modules, currentModuleIndex)

    const datasetIdeas = ideas.filter((idea) => idea.dataset_id === datasetId && !idea.deleted)

    return (
      <ModuleResultsView
        scroll={scroll}
        currentModuleIndex={currentModuleIndex}
        ideas={ideas}
        isOwner={isOwner}
        isAuthenticated={isAuthenticated}
        hasNextModule={hasNextModule}
        transitioning={transitioning}
        onContinueToNext={handleContinueToNext}
        selectedIdeaIds={selectedIdeaIds}
        onToggleIdeaSelection={toggleIdeaSelection}
        onToggleSelectAll={() => toggleSelectAll(datasetIdeas)}
      />
    )
  }

  return (
    <ScrollProvider activeUsersCount={activeUsers.length}>
      <div className="public-scroll-container">
        {showNamePrompt && (
          <NamePrompt
            onSubmit={handleNameSubmit}
            onCancel={name ? handleCancelNameChange : undefined}
            initialName={name || ''}
          />
        )}

        {currentUserDisplayName && activeUsers.length > 0 && (
          <ActiveUsers
            users={activeUsers}
            currentUserName={currentUserDisplayName}
          />
        )}

        <MobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          currentUserDisplayName={currentUserDisplayName || undefined}
          isOwner={isOwner}
          isAuthenticated={isAuthenticated}
          hasNextModule={hasNextModule}
          transitioning={transitioning}
          onNameClick={handleNameClick}
          onNextModule={handleNextModule}
          onCompleteSession={handleCompleteSession}
        />

        <ScrollHeader
          scroll={scroll}
          currentModuleIndex={currentModuleIndex}
          isOwner={isOwner}
          isAuthenticated={isAuthenticated}
          hasNextModule={hasNextModule}
          transitioning={transitioning}
          currentUserDisplayName={currentUserDisplayName || undefined}
          onNextModule={handleNextModule}
          onCompleteSession={handleCompleteSession}
          onNameClick={handleNameClick}
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
        />

        <main className="public-scroll-main">
          {currentModule ? (
            <ModuleRenderer
              module={currentModule}
              scrollId={scroll.id}
              ideas={ideas}
              isHost={isOwner}
              userName={currentUserDisplayName}
              moduleIndex={currentModuleIndex}
              modules={scroll.modules}
            />
          ) : (
            <div className="no-modules">
              <p>No modules configured for this scroll.</p>
            </div>
          )}
        </main>
      </div>
    </ScrollProvider>
  )
}

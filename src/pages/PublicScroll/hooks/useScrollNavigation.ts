import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Scroll } from '@/types/scroll'
import type { Idea } from '@/types/idea'
import { aggregateModuleResults, getActiveDatasetId, isVotingModule } from '../utils'

type UseScrollNavigationParams = {
  scroll: Scroll | null
  isOwner: boolean
  currentModuleIndex: number
  setCurrentModuleIndex: (index: number) => void
  setShowingModuleResults: (showing: boolean) => void
  fetchScrollData: () => Promise<void>
  ideas: Idea[]
  onError?: (message: string) => void
  onNavigateToResults?: (scrollId: string) => void
}

type UseScrollNavigationReturn = {
  transitioning: boolean
  selectedIdeaIds: Set<string>
  handleNextModule: () => Promise<void>
  handleContinueToNext: () => Promise<void>
  handleCompleteSession: () => Promise<void>
  handleActivateLinks: () => Promise<void>
  handleStartSession: () => Promise<void>
  toggleIdeaSelection: (ideaId: string) => void
  toggleSelectAll: (datasetIdeas: Idea[]) => void
}

export function useScrollNavigation({
  scroll,
  isOwner,
  currentModuleIndex,
  setCurrentModuleIndex,
  setShowingModuleResults,
  fetchScrollData,
  ideas,
  onError,
  onNavigateToResults,
}: UseScrollNavigationParams): UseScrollNavigationReturn {
  const [transitioning, setTransitioning] = useState(false)
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<Set<string>>(new Set())

  // Sync module's selected_ideas to local state for participants
  useEffect(() => {
    if (!isOwner && scroll?.modules?.[currentModuleIndex]) {
      const currentModule = scroll.modules[currentModuleIndex] as any
      if (currentModule.selected_ideas) {
        setSelectedIdeaIds(new Set<string>(currentModule.selected_ideas))
      }
    }
  }, [scroll?.modules, currentModuleIndex, isOwner])

  const handleNextModule = async () => {
    if (!scroll || !isOwner || !scroll.modules) return

    const nextIndex = currentModuleIndex + 1
    if (nextIndex >= scroll.modules.length) return

    setTransitioning(true)
    try {
      const currentModule = scroll.modules[currentModuleIndex] as any

      // For voting modules, aggregate results before showing
      if (isVotingModule(currentModule.type)) {
        await aggregateModuleResults(scroll, currentModuleIndex, (idx) =>
          getActiveDatasetId(scroll.modules, idx)
        )
      }

      // Reset selection state
      setSelectedIdeaIds(new Set())

      // Fetch fresh modules from database to preserve aggregated results
      const { data: freshScroll } = await supabase
        .from('scrolls')
        .select('modules')
        .eq('id', scroll.id)
        .single()

      if (!freshScroll) throw new Error('Failed to fetch scroll data')

      // Reset module's selected_ideas while preserving results
      const updatedModules = [...freshScroll.modules]
      updatedModules[currentModuleIndex] = {
        ...updatedModules[currentModuleIndex],
        selected_ideas: []
      }

      const { error } = await supabase
        .from('scrolls')
        .update({
          step: `module-${currentModuleIndex}-results`,
          modules: updatedModules
        })
        .eq('id', scroll.id)

      if (error) throw error

      // Refresh scroll data to get the updated results
      await fetchScrollData()
      setShowingModuleResults(true)
    } catch (error: any) {
      console.error('Error advancing module:', error)
    } finally {
      setTransitioning(false)
    }
  }

  const handleContinueToNext = async () => {
    if (!scroll || !isOwner || !scroll.modules) return

    const nextIndex = currentModuleIndex + 1
    if (nextIndex >= scroll.modules.length) return

    setTransitioning(true)
    try {
      // Get current dataset ideas
      const currentModule = scroll.modules[currentModuleIndex] as any
      const datasetId =
        currentModule.type === 'brainstorm' || currentModule.type === 'dataset'
          ? currentModule.dataset_id
          : getActiveDatasetId(scroll.modules, currentModuleIndex)

      if (datasetId) {
        // Get all ideas for this dataset (excluding already deleted ones)
        const allDatasetIdeas = ideas.filter(
          (idea) => idea.dataset_id === datasetId && !idea.deleted
        )

        // Find unselected ideas
        const unselectedIds = allDatasetIdeas
          .filter((idea) => !selectedIdeaIds.has(idea.id))
          .map((idea) => idea.id)

        // Mark unselected ideas as deleted
        if (unselectedIds.length > 0) {
          console.log(`Marking ${unselectedIds.length} unselected ideas as deleted for next module`)

          const { error: deleteError } = await supabase
            .from('ideas')
            .update({ deleted: true })
            .in('id', unselectedIds)

          if (deleteError) {
            console.error('Error marking ideas as deleted:', deleteError)
            throw deleteError
          }

          // Wait for the realtime subscription to process the updates
          await new Promise(resolve => setTimeout(resolve, 500))

          // Refresh scroll data to ensure we have the latest ideas
          await fetchScrollData()
        }
      }

      // Reset selection for next time
      setSelectedIdeaIds(new Set())

      // Reset current module's selected_ideas and advance to next module
      const updatedModules = [...scroll.modules]
      updatedModules[currentModuleIndex] = {
        ...updatedModules[currentModuleIndex],
        selected_ideas: []
      }

      const { error } = await supabase
        .from('scrolls')
        .update({
          step: `module-${nextIndex}`,
          modules: updatedModules
        })
        .eq('id', scroll.id)

      if (error) throw error
      setShowingModuleResults(false)
      setCurrentModuleIndex(nextIndex)
    } catch (error: any) {
      console.error('Error advancing module:', error)
    } finally {
      setTransitioning(false)
    }
  }

  const handleCompleteSession = async () => {
    if (!scroll || !isOwner) return

    setTransitioning(true)
    try {
      // Aggregate current module results before completing
      await aggregateModuleResults(scroll, currentModuleIndex, (idx) =>
        getActiveDatasetId(scroll.modules, idx)
      )

      const { error } = await supabase
        .from('scrolls')
        .update({ status: 'completed' })
        .eq('id', scroll.id)

      if (error) throw error

      // Navigate to results page
      if (onNavigateToResults) {
        onNavigateToResults(scroll.id)
      }
    } catch (error: any) {
      console.error('Error completing session:', error)
    } finally {
      setTransitioning(false)
    }
  }

  const handleActivateLinks = async () => {
    if (!scroll) return

    setTransitioning(true)
    try {
      // Copy dataset data to ideas table for each dataset module
      const datasetModules = scroll.modules.filter((m: any) => m.type === 'dataset')

      for (const module of datasetModules) {
        const m = module as any
        if (m.datasetId && m.dataset_id) {
          // Fetch the dataset
          const { data: dataset, error: fetchError } = await supabase
            .from('datasets')
            .select('data')
            .eq('id', m.datasetId)
            .single()

          if (fetchError) {
            console.error('Error fetching dataset:', fetchError)
            continue
          }

          if (dataset && dataset.data && Array.isArray(dataset.data)) {
            // Insert each item as an idea
            const ideas = dataset.data.map((text: string) => ({
              text,
              scroll_id: scroll.id,
              dataset_id: m.dataset_id,
              unique_user_id: null,
              created_by: 'Dataset',
            }))

            const { error: insertError } = await supabase
              .from('ideas')
              .insert(ideas)

            if (insertError) {
              console.error('Error inserting ideas:', insertError)
            }
          }
        }
      }

      // Set scroll status to active
      const { error } = await supabase
        .from('scrolls')
        .update({ status: 'active' })
        .eq('id', scroll.id)

      if (error) throw error

      // Refresh scroll data to get updated status
      await fetchScrollData()
    } catch (error: any) {
      console.error('Error activating links:', error)
      onError?.('Failed to activate links: ' + error.message)
    } finally {
      setTransitioning(false)
    }
  }

  const handleStartSession = async () => {
    if (!scroll) return

    setTransitioning(true)
    try {
      // Set step to "module-0" to mark that session has started
      const { error } = await supabase
        .from('scrolls')
        .update({ step: 'module-0' })
        .eq('id', scroll.id)

      if (error) throw error
    } catch (error: any) {
      console.error('Error starting session:', error)
    } finally {
      setTransitioning(false)
    }
  }

  const toggleIdeaSelection = async (ideaId: string) => {
    const newSelection = new Set(selectedIdeaIds)
    if (newSelection.has(ideaId)) {
      newSelection.delete(ideaId)
    } else {
      newSelection.add(ideaId)
    }
    setSelectedIdeaIds(newSelection)

    // Persist selections to database if owner
    if (isOwner && scroll && scroll.modules) {
      try {
        const updatedModules = [...scroll.modules]
        updatedModules[currentModuleIndex] = {
          ...updatedModules[currentModuleIndex],
          selected_ideas: Array.from(newSelection)
        }

        await supabase
          .from('scrolls')
          .update({ modules: updatedModules })
          .eq('id', scroll.id)
      } catch (error) {
        console.error('Error updating selected ideas:', error)
      }
    }
  }

  const toggleSelectAll = async (datasetIdeas: Idea[]) => {
    // Count only selected items that are in the current dataset
    const currentlySelectedCount = datasetIdeas.filter(idea => selectedIdeaIds.has(idea.id)).length
    const newSelection = currentlySelectedCount === datasetIdeas.length
      ? new Set<string>()
      : new Set<string>(datasetIdeas.map((i) => i.id))

    setSelectedIdeaIds(newSelection)

    // Persist selections to database if owner
    if (isOwner && scroll && scroll.modules) {
      try {
        const updatedModules = [...scroll.modules]
        updatedModules[currentModuleIndex] = {
          ...updatedModules[currentModuleIndex],
          selected_ideas: Array.from(newSelection)
        }

        await supabase
          .from('scrolls')
          .update({ modules: updatedModules })
          .eq('id', scroll.id)
      } catch (error) {
        console.error('Error updating selected ideas:', error)
      }
    }
  }

  return {
    transitioning,
    selectedIdeaIds,
    handleNextModule,
    handleContinueToNext,
    handleCompleteSession,
    handleActivateLinks,
    handleStartSession,
    toggleIdeaSelection,
    toggleSelectAll,
  }
}

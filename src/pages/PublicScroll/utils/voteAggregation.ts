import { supabase } from '../../../lib/supabase'
import type { Scroll } from '../../../types/scroll'

export async function aggregateModuleResults(
  scroll: Scroll,
  moduleIndex: number,
  getActiveDatasetId: (moduleIndex: number) => string | null
) {
  const module = scroll.modules[moduleIndex] as any
  const moduleId = module.id

  // Get the dataset_id for this module
  const datasetId =
    module.type === 'brainstorm' || module.type === 'dataset'
      ? module.dataset_id
      : getActiveDatasetId(moduleIndex)

  if (!datasetId) return

  // Get all ideas for this dataset
  const { data: datasetIdeas } = await supabase
    .from('ideas')
    .select('id')
    .eq('scroll_id', scroll.id)
    .eq('dataset_id', datasetId)

  if (!datasetIdeas || datasetIdeas.length === 0) return

  const ideaIds = datasetIdeas.map((i) => i.id)

  // Get all votes for these ideas
  const { data: votes } = await supabase
    .from('votes')
    .select('created_by, idea_id, value')
    .eq('scroll_id', scroll.id)
    .eq('module_id', moduleId)
    .in('idea_id', ideaIds)

  if (!votes) return

  let results: any = {}

  // Aggregate based on module type
  switch (module.type) {
    case 'vote': {
      // Simple votes: { votes: { [ideaId]: [userId1, userId2, ...] } }
      const votesByIdea: Record<string, string[]> = {}
      votes.forEach((vote) => {
        if (!votesByIdea[vote.idea_id]) {
          votesByIdea[vote.idea_id] = []
        }
        votesByIdea[vote.idea_id].push(vote.created_by)
      })
      results = { votes: votesByIdea }
      break
    }

    case 'weighted_vote': {
      // Weighted votes: { weightedVotes: { [userId]: { [ideaId]: points } } }
      const weightedVotes: Record<string, Record<string, number>> = {}
      votes.forEach((vote) => {
        if (!weightedVotes[vote.created_by]) {
          weightedVotes[vote.created_by] = {}
        }
        weightedVotes[vote.created_by][vote.idea_id] = Number(vote.value) || 0
      })
      results = { weightedVotes }
      break
    }

    case 'likert_vote': {
      // Likert ratings: { ratings: { [userId]: { [ideaId]: rating } } }
      const ratings: Record<string, Record<string, number>> = {}
      votes.forEach((vote) => {
        if (!ratings[vote.created_by]) {
          ratings[vote.created_by] = {}
        }
        ratings[vote.created_by][vote.idea_id] = Number(vote.value) || 0
      })
      results = { ratings }
      break
    }

    case 'work_estimate': {
      // Work estimates: { estimates: { [userId]: { [ideaId]: estimate } } }
      const estimates: Record<string, Record<string, number>> = {}
      votes.forEach((vote) => {
        if (!estimates[vote.created_by]) {
          estimates[vote.created_by] = {}
        }
        estimates[vote.created_by][vote.idea_id] = Number(vote.value) || 0
      })
      results = { estimates }
      break
    }

    case 'rank_order': {
      // Rankings: { rankings: { [userId]: [ideaId1, ideaId2, ...] } }
      const rankings: Record<string, string[]> = {}
      votes.forEach((vote) => {
        if (!rankings[vote.created_by]) {
          rankings[vote.created_by] = []
        }
        // Store as [rank, ideaId] tuple for sorting
        rankings[vote.created_by].push({
          rank: Number(vote.value) || 0,
          ideaId: vote.idea_id,
        } as any)
      })

      // Sort each user's rankings by rank value and extract ideaIds
      Object.keys(rankings).forEach((userId) => {
        rankings[userId] = (rankings[userId] as any)
          .sort((a: any, b: any) => a.rank - b.rank)
          .map((item: any) => item.ideaId)
      })

      results = { rankings }
      break
    }
  }

  // Update scroll with results
  const { data: freshScroll } = await supabase
    .from('scrolls')
    .select('modules')
    .eq('id', scroll.id)
    .single()

  if (freshScroll) {
    const updatedModules = [...freshScroll.modules]
    updatedModules[moduleIndex] = {
      ...updatedModules[moduleIndex],
      results,
    }

    await supabase
      .from('scrolls')
      .update({ modules: updatedModules })
      .eq('id', scroll.id)
  }
}

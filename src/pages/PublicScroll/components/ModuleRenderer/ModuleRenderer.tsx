import type { ModuleConfig } from '../../../../types/module'
import type { Idea } from '../../../../types/idea'
import { IdeaCard } from '../IdeaCard'
import { NewIdeaForm } from '../NewIdeaForm'
import { VotingView } from '../VotingView'
import { SimpleVoteView } from '../SimpleVoteView'
import { WeightedVoteView } from '../WeightedVoteView'
import { RankOrderView } from '../RankOrderView'
import { WorkEstimateView } from '../WorkEstimateView'
import { GroupingView } from '../GroupingView'
import './ModuleRenderer.css'

type ModuleRendererProps = {
  module: ModuleConfig
  scrollId: string
  ideas: Idea[]
  isHost: boolean
  userName: string | null
  moduleIndex: number
  modules: ModuleConfig[]
}

export function ModuleRenderer({
  module,
  scrollId,
  ideas,
  isHost: _isHost,
  userName,
  moduleIndex,
  modules,
}: ModuleRendererProps) {
  // Find the active dataset_id by looking at the last dataset builder before this module
  const getActiveDatasetId = (): string | null => {
    // Look backwards through modules to find the last dataset builder
    for (let i = moduleIndex; i >= 0; i--) {
      const mod = modules[i] as any
      if (mod.type === 'dataset' || mod.type === 'brainstorm') {
        return mod.dataset_id || null
      }
    }
    return null
  }

  const activeDatasetId = getActiveDatasetId()

  const renderModuleContent = () => {
    switch (module.type) {
      case 'brainstorm':
        // Filter ideas for this brainstorm module
        const brainstormIdeas = ideas.filter(idea =>
          idea.dataset_id === (module as any).dataset_id
        )
        return (
          <div className="module-brainstorm">
            <div className="brainstorm-ideas">
              {brainstormIdeas.length === 0 ? (
                <div className="ideas-empty">
                  <p>No ideas yet. Be the first to share one!</p>
                </div>
              ) : (
                brainstormIdeas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)
              )}
            </div>
            {userName && (
              <div className="new-idea-fixed">
                <NewIdeaForm scrollId={scrollId} datasetId={(module as any).dataset_id} />
              </div>
            )}
          </div>
        )

      case 'vote':
        const voteIdeas = ideas.filter(idea => idea.dataset_id === activeDatasetId)
        return (
          <div className="module-vote">
            <SimpleVoteView
              ideas={voteIdeas}
              scrollId={scrollId}
              maxVotes={module.maxVotesPerUser || 3}
              moduleId={module.id}
              moduleIndex={moduleIndex}
              modules={modules}
              userName={userName || 'anonymous'}
              results={module.results}
            />
          </div>
        )

      case 'weighted_vote':
        const weightedVoteIdeas = ideas.filter(idea => idea.dataset_id === activeDatasetId)
        return (
          <div className="module-weighted-vote">
            <WeightedVoteView
              ideas={weightedVoteIdeas}
              scrollId={scrollId}
              totalPoints={module.totalPoints || 10}
              maxPointsPerItem={module.maxPointsPerItem || 5}
              moduleId={module.id}
              moduleIndex={moduleIndex}
              modules={modules}
              userName={userName || 'anonymous'}
              results={module.results}
            />
          </div>
        )

      case 'likert_vote':
        const likertIdeas = ideas.filter(idea => idea.dataset_id === activeDatasetId)
        return (
          <div className="module-likert-vote">
            <VotingView
              ideas={likertIdeas}
              scrollId={scrollId}
              moduleId={module.id}
              moduleIndex={moduleIndex}
              modules={modules}
              userName={userName || 'anonymous'}
              results={module.results}
            />
          </div>
        )

      case 'rank_order':
        const rankIdeas = ideas.filter(idea => idea.dataset_id === activeDatasetId)
        return (
          <div className="module-rank-order">
            <RankOrderView
              ideas={rankIdeas}
              scrollId={scrollId}
              maxItems={module.maxItems || 10}
              moduleId={module.id}
              moduleIndex={moduleIndex}
              modules={modules}
              userName={userName || 'anonymous'}
              results={module.results}
            />
          </div>
        )

      case 'work_estimate':
        const estimateIdeas = ideas.filter(idea => idea.dataset_id === activeDatasetId)
        return (
          <div className="module-work-estimate">
            <WorkEstimateView
              ideas={estimateIdeas}
              scrollId={scrollId}
              estimateType={module.estimateType || 'hours'}
              moduleId={module.id}
              moduleIndex={moduleIndex}
              modules={modules}
              userName={userName || 'anonymous'}
              results={module.results}
            />
          </div>
        )

      case 'grouping':
        const groupingIdeas = ideas.filter(idea => idea.dataset_id === activeDatasetId)
        return (
          <div className="module-grouping">
            <GroupingView
              ideas={groupingIdeas}
              scrollId={scrollId}
              maxGroups={module.maxGroups || 5}
              moduleIndex={moduleIndex}
              modules={modules}
              userName={userName || 'anonymous'}
              results={module.results}
            />
          </div>
        )

      case 'dataset':
        // Filter ideas for this dataset module
        const datasetIdeas = ideas.filter(idea =>
          idea.dataset_id === (module as any).dataset_id
        )
        return (
          <div className="module-dataset">
            <div className="dataset-ideas">
              {datasetIdeas.length === 0 ? (
                <div className="ideas-empty">
                  <p>No items in this dataset.</p>
                </div>
              ) : (
                datasetIdeas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)
              )}
            </div>
          </div>
        )

      default:
        return (
          <div className="module-placeholder">
            <p>Unknown module type</p>
          </div>
        )
    }
  }

  return (
    <div className="module-renderer">
      {module.prompt && (
        <div className="module-prompt">
          <p>{module.prompt}</p>
        </div>
      )}

      <div className="module-content">{renderModuleContent()}</div>
    </div>
  )
}

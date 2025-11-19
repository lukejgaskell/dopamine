import type { ModuleConfig } from '../../types/module'
import type { Idea } from '../../types/idea'
import { IdeaCard } from '../IdeaCard'
import { NewIdeaForm } from '../NewIdeaForm'
import { VotingView } from '../VotingView'
import { SimpleVoteView } from '../SimpleVoteView'
import { WeightedVoteView } from '../WeightedVoteView'
import { RankOrderView } from '../RankOrderView'
import { WorkEstimateView } from '../WorkEstimateView'
import { GroupingView } from '../GroupingView'
import './ModuleRenderer.css'

interface ModuleRendererProps {
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
  const renderModuleContent = () => {
    switch (module.type) {
      case 'brainstorm':
        return (
          <div className="module-brainstorm">
            <div className="brainstorm-ideas">
              {ideas.length === 0 ? (
                <div className="ideas-empty">
                  <p>No ideas yet. Be the first to share one!</p>
                </div>
              ) : (
                ideas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)
              )}
            </div>
            {userName && (
              <div className="new-idea-fixed">
                <NewIdeaForm scrollId={scrollId} />
              </div>
            )}
          </div>
        )

      case 'vote':
        return (
          <div className="module-vote">
            <SimpleVoteView
              ideas={ideas}
              scrollId={scrollId}
              maxVotes={module.maxVotesPerUser || 3}
              moduleIndex={moduleIndex}
              modules={modules}
              userName={userName || 'anonymous'}
              results={module.results}
            />
          </div>
        )

      case 'weighted_vote':
        return (
          <div className="module-weighted-vote">
            <WeightedVoteView
              ideas={ideas}
              scrollId={scrollId}
              totalPoints={module.totalPoints || 10}
              maxPointsPerItem={module.maxPointsPerItem || 5}
              moduleIndex={moduleIndex}
              modules={modules}
              userName={userName || 'anonymous'}
              results={module.results}
            />
          </div>
        )

      case 'likert_vote':
        return (
          <div className="module-likert-vote">
            <VotingView
              ideas={ideas}
              scrollId={scrollId}
              moduleIndex={moduleIndex}
              modules={modules}
              userName={userName || 'anonymous'}
              results={module.results}
            />
          </div>
        )

      case 'rank_order':
        return (
          <div className="module-rank-order">
            <RankOrderView
              ideas={ideas}
              scrollId={scrollId}
              maxItems={module.maxItems || 10}
              moduleIndex={moduleIndex}
              modules={modules}
              userName={userName || 'anonymous'}
              results={module.results}
            />
          </div>
        )

      case 'work_estimate':
        return (
          <div className="module-work-estimate">
            <WorkEstimateView
              ideas={ideas}
              scrollId={scrollId}
              estimateType={module.estimateType || 'hours'}
              moduleIndex={moduleIndex}
              modules={modules}
              userName={userName || 'anonymous'}
              results={module.results}
            />
          </div>
        )

      case 'grouping':
        return (
          <div className="module-grouping">
            <GroupingView
              ideas={ideas}
              scrollId={scrollId}
              maxGroups={module.maxGroups || 5}
              moduleIndex={moduleIndex}
              modules={modules}
              userName={userName || 'anonymous'}
              results={module.results}
            />
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

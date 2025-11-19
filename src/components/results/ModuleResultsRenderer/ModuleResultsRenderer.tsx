import type { ModuleConfig } from '../../../types/module'
import type { Idea } from '../../../types/idea'
import { SimpleVoteResults } from '../SimpleVoteResults'
import { WeightedVoteResults } from '../WeightedVoteResults'
import { LikertVoteResults } from '../LikertVoteResults'
import { RankOrderResults } from '../RankOrderResults'
import { WorkEstimateResults } from '../WorkEstimateResults'
import { GroupingResults } from '../GroupingResults'
import '../ResultsCommon.css'

interface ModuleResultsRendererProps {
  module: ModuleConfig
  ideas: Idea[]
}

export function ModuleResultsRenderer({ module, ideas }: ModuleResultsRendererProps) {
  // Debug: log what we're receiving
  console.log('Module:', module.type, 'Results:', module.results)

  const results = module.results || {}

  switch (module.type) {
    case 'vote':
      return <SimpleVoteResults ideas={ideas} results={results} />

    case 'weighted_vote':
      return <WeightedVoteResults ideas={ideas} results={results} />

    case 'likert_vote':
      return <LikertVoteResults ideas={ideas} results={results} />

    case 'rank_order':
      return <RankOrderResults ideas={ideas} results={results} />

    case 'work_estimate':
      return (
        <WorkEstimateResults
          ideas={ideas}
          results={results}
          estimateType={module.estimateType}
        />
      )

    case 'grouping':
      return <GroupingResults ideas={ideas} results={results} />

    case 'brainstorm':
      return (
        <div className="results-container">
          <div className="results-header">
            <h2>Brainstorm Complete</h2>
            <div className="results-stats">
              <div className="stat">
                <span className="stat-value">{ideas.length}</span>
                <span className="stat-label">Ideas Generated</span>
              </div>
            </div>
          </div>
          <div className="results-list">
            <h3>All Ideas</h3>
            <div className="ranked-results">
              {ideas.map((idea, index) => (
                <div key={idea.id} className="result-item">
                  <div className="result-rank">
                    <span className="rank-number">{index + 1}</span>
                  </div>
                  <div className="result-content">
                    <p className="result-text">{idea.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )

    default:
      return (
        <div className="results-container">
          <div className="no-results">
            <p>Unknown module type.</p>
          </div>
        </div>
      )
  }
}

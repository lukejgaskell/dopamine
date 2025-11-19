import type { Idea } from '../../types/idea'
import './ResultsView.css'

interface ResultsViewProps {
  ideas: Idea[]
}

export function ResultsView({ ideas }: ResultsViewProps) {
  const sortedIdeas = [...ideas].sort((a, b) => b.votes - a.votes)

  return (
    <div className="results-view">
      <div className="results-header">
        <h2 className="results-title">Final Results</h2>
        <p className="results-subtitle">Ideas ranked by votes</p>
      </div>
      <div className="results-list">
        {sortedIdeas.map((idea, index) => (
          <div key={idea.id} className="results-card">
            <div className="results-rank">
              <span className="rank-number">#{index + 1}</span>
            </div>
            <div className="results-content">
              <p className="results-text">{idea.text}</p>
            </div>
            <div className="results-votes">
              <span className="results-vote-count">{idea.votes}</span>
              <span className="results-vote-label">{idea.votes === 1 ? 'vote' : 'votes'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

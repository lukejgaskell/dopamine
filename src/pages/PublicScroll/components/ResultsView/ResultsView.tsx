import type { Idea } from '../../../../types/idea'
import './ResultsView.css'

type ResultsViewProps = {
  ideas: Idea[]
}

export function ResultsView({ ideas }: ResultsViewProps) {
  return (
    <div className="results-view">
      <div className="results-header">
        <h2 className="results-title">Final Results</h2>
        <p className="results-subtitle">All ideas</p>
      </div>
      <div className="results-list">
        {ideas.map((idea, index) => (
          <div key={idea.id} className="results-card">
            <div className="results-rank">
              <span className="rank-number">#{index + 1}</span>
            </div>
            <div className="results-content">
              <p className="results-text">{idea.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Idea } from '../../../../../types/idea'
import type { ModuleResults } from '../../../../../types/module'
import '../ResultsCommon.css'

type SimpleVoteResultsProps = {
  ideas: Idea[]
  results: ModuleResults
}

export function SimpleVoteResults({ ideas, results }: SimpleVoteResultsProps) {
  // Calculate vote counts for each idea
  const getVoteCount = (ideaId: string) => {
    return results?.votes?.[ideaId]?.length || 0
  }

  // Sort ideas by vote count
  const sortedIdeas = [...ideas]
    .map((idea) => ({
      ...idea,
      voteCount: getVoteCount(idea.id),
    }))
    .sort((a, b) => b.voteCount - a.voteCount)

  // Prepare chart data
  const chartData = sortedIdeas.slice(0, 10).map((idea, index) => ({
    name: `#${index + 1}`,
    votes: idea.voteCount,
    text: idea.text.substring(0, 50) + (idea.text.length > 50 ? '...' : ''),
  }))

  const totalVotes = sortedIdeas.reduce((sum, idea) => sum + idea.voteCount, 0)
  const totalVoters = Object.keys(results?.votes || {}).length > 0
    ? new Set(Object.values(results.votes || {}).flat()).size
    : 0

  return (
    <div className="results-container">
      <div className="results-header">
        <h2>Vote Results</h2>
        <div className="results-stats">
          <div className="stat">
            <span className="stat-value">{totalVotes}</span>
            <span className="stat-label">Total Votes</span>
          </div>
          <div className="stat">
            <span className="stat-value">{totalVoters}</span>
            <span className="stat-label">Voters</span>
          </div>
        </div>
      </div>

      <div className="results-chart">
        <h3>Votes Distribution</h3>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'var(--text-primary)' }}
                formatter={(value: number, _name: string, props: any) => [
                  `${value} votes`,
                  props.payload.text,
                ]}
              />
              <Bar dataKey="votes" fill="var(--primary-bg)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="results-list">
        <h3>Ranked Results</h3>
        <div className="ranked-results">
          {sortedIdeas.map((idea, index) => (
            <div key={idea.id} className={`result-item ${index < 3 ? 'top-three' : ''}`}>
              <div className="result-rank">
                {index < 3 ? (
                  <span className={`medal medal-${index + 1}`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </span>
                ) : (
                  <span className="rank-number">{index + 1}</span>
                )}
              </div>
              <div className="result-content">
                <p className="result-text">{idea.text}</p>
              </div>
              <div className="result-score">
                <span className="score-value">{idea.voteCount}</span>
                <span className="score-label">votes</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

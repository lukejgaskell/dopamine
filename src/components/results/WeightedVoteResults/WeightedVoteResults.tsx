import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Idea } from '../../../types/idea'
import type { ModuleResults } from '../../../types/module'
import '../ResultsCommon.css'

interface WeightedVoteResultsProps {
  ideas: Idea[]
  results: ModuleResults
}

export function WeightedVoteResults({ ideas, results }: WeightedVoteResultsProps) {
  // Calculate total points for each idea
  const getTotalPoints = (ideaId: string) => {
    if (!results?.weightedVotes) return 0
    return Object.values(results.weightedVotes).reduce(
      (sum, userVotes) => sum + (userVotes[ideaId] || 0),
      0
    )
  }

  // Sort ideas by total points
  const sortedIdeas = [...ideas]
    .map((idea) => ({
      ...idea,
      totalPoints: getTotalPoints(idea.id),
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)

  // Prepare chart data
  const chartData = sortedIdeas.slice(0, 10).map((idea, index) => ({
    name: `#${index + 1}`,
    points: idea.totalPoints,
    text: idea.text.substring(0, 50) + (idea.text.length > 50 ? '...' : ''),
  }))

  const totalPoints = sortedIdeas.reduce((sum, idea) => sum + idea.totalPoints, 0)
  const totalVoters = Object.keys(results?.weightedVotes || {}).length

  return (
    <div className="results-container">
      <div className="results-header">
        <h2>Weighted Vote Results</h2>
        <div className="results-stats">
          <div className="stat">
            <span className="stat-value">{totalPoints}</span>
            <span className="stat-label">Total Points</span>
          </div>
          <div className="stat">
            <span className="stat-value">{totalVoters}</span>
            <span className="stat-label">Voters</span>
          </div>
        </div>
      </div>

      <div className="results-chart">
        <h3>Points Distribution</h3>
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
                  `${value} points`,
                  props.payload.text,
                ]}
              />
              <Bar dataKey="points" fill="var(--status-active-bg)" radius={[4, 4, 0, 0]} />
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
                <span className="score-value">{idea.totalPoints}</span>
                <span className="score-label">points</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

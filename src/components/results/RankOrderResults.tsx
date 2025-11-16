import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Idea } from '../../types/idea'
import type { ModuleResults } from '../../types/module'
import './ResultsCommon.css'

interface RankOrderResultsProps {
  ideas: Idea[]
  results: ModuleResults
}

export default function RankOrderResults({ ideas, results }: RankOrderResultsProps) {
  // Calculate ranking score for each idea (lower rank = more points)
  const getIdeaScore = (ideaId: string) => {
    if (!results?.rankings) return { score: 0, appearances: 0, avgRank: 0 }

    const rankings = Object.values(results.rankings)
    let totalScore = 0
    let appearances = 0
    let totalRank = 0

    rankings.forEach((ranking) => {
      const position = ranking.indexOf(ideaId)
      if (position !== -1) {
        // Award points based on position (top = most points)
        totalScore += ranking.length - position
        appearances++
        totalRank += position + 1
      }
    })

    const avgRank = appearances > 0 ? totalRank / appearances : 0

    return { score: totalScore, appearances, avgRank }
  }

  // Sort ideas by total score
  const sortedIdeas = [...ideas]
    .map((idea) => ({
      ...idea,
      scoreData: getIdeaScore(idea.id),
    }))
    .sort((a, b) => b.scoreData.score - a.scoreData.score)

  // Prepare chart data
  const chartData = sortedIdeas.slice(0, 10).map((idea, index) => ({
    name: `#${index + 1}`,
    score: idea.scoreData.score,
    text: idea.text.substring(0, 50) + (idea.text.length > 50 ? '...' : ''),
  }))

  const totalVoters = Object.keys(results?.rankings || {}).length
  const totalScore = sortedIdeas.reduce((sum, idea) => sum + idea.scoreData.score, 0)

  return (
    <div className="results-container">
      <div className="results-header">
        <h2>Rank Order Results</h2>
        <div className="results-stats">
          <div className="stat">
            <span className="stat-value">{totalScore}</span>
            <span className="stat-label">Total Points</span>
          </div>
          <div className="stat">
            <span className="stat-value">{totalVoters}</span>
            <span className="stat-label">Rankers</span>
          </div>
        </div>
      </div>

      <div className="results-chart">
        <h3>Ranking Score Distribution</h3>
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
              <Bar dataKey="score" fill="var(--primary-bg)" radius={[4, 4, 0, 0]} />
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
              <div className="result-meta">
                <div className="meta-item">
                  <span className="meta-value">{idea.scoreData.score}</span>
                  <span className="meta-label">Points</span>
                </div>
                <div className="meta-item">
                  <span className="meta-value">
                    {idea.scoreData.avgRank > 0 ? idea.scoreData.avgRank.toFixed(1) : '-'}
                  </span>
                  <span className="meta-label">Avg Rank</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

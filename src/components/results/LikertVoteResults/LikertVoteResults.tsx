import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts'
import type { Idea } from '../../../types/idea'
import type { ModuleResults } from '../../../types/module'
import '../ResultsCommon.css'

interface LikertVoteResultsProps {
  ideas: Idea[]
  results: ModuleResults
}

export function LikertVoteResults({ ideas, results }: LikertVoteResultsProps) {
  // Calculate statistics for each idea
  const getIdeaStats = (ideaId: string) => {
    if (!results?.ratings) return { avg: 0, variance: 0, total: 0, count: 0 }

    const ratings = Object.values(results.ratings)
      .map((userRatings) => userRatings[ideaId])
      .filter((r) => r !== undefined)

    if (ratings.length === 0) return { avg: 0, variance: 0, total: 0, count: 0 }

    const total = ratings.reduce((a, b) => a + b, 0)
    const avg = total / ratings.length

    // Calculate variance
    const squaredDiffs = ratings.map((r) => Math.pow(r - avg, 2))
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / ratings.length

    return { avg, variance, total, count: ratings.length }
  }

  // Sort ideas by total score
  const sortedIdeas = [...ideas]
    .map((idea) => ({
      ...idea,
      stats: getIdeaStats(idea.id),
    }))
    .sort((a, b) => b.stats.total - a.stats.total)

  // Prepare radar chart data (top 6 ideas for readability)
  const radarData = sortedIdeas.slice(0, 6).map((idea, index) => ({
    subject: `#${index + 1}`,
    average: idea.stats.avg,
    fullMark: 5,
  }))

  // Prepare bar chart data for scores
  const scoreChartData = sortedIdeas.slice(0, 10).map((idea, index) => ({
    name: `#${index + 1}`,
    average: parseFloat(idea.stats.avg.toFixed(2)),
    text: idea.text.substring(0, 50) + (idea.text.length > 50 ? '...' : ''),
  }))

  // Prepare variance chart data
  const varianceChartData = sortedIdeas
    .slice(0, 10)
    .sort((a, b) => b.stats.variance - a.stats.variance)
    .map((idea, index) => ({
      name: `#${index + 1}`,
      variance: parseFloat(idea.stats.variance.toFixed(2)),
      text: idea.text.substring(0, 50) + (idea.text.length > 50 ? '...' : ''),
    }))

  const totalVoters = Object.keys(results?.ratings || {}).length
  const avgOverall =
    sortedIdeas.length > 0
      ? sortedIdeas.reduce((sum, idea) => sum + idea.stats.avg, 0) / sortedIdeas.length
      : 0

  return (
    <div className="results-container">
      <div className="results-header">
        <h2>Rating Results</h2>
        <div className="results-stats">
          <div className="stat">
            <span className="stat-value">{avgOverall.toFixed(1)}</span>
            <span className="stat-label">Avg Rating</span>
          </div>
          <div className="stat">
            <span className="stat-value">{totalVoters}</span>
            <span className="stat-label">Raters</span>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="results-chart">
          <h3>Average Scores Overview</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border-color)" />
                <PolarAngleAxis dataKey="subject" stroke="var(--text-secondary)" />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 5]}
                  stroke="var(--text-secondary)"
                />
                <Radar
                  name="Average Score"
                  dataKey="average"
                  stroke="var(--primary-bg)"
                  fill="var(--primary-bg)"
                  fillOpacity={0.5}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="results-chart">
          <h3>Score per Idea</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={scoreChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis domain={[0, 5]} stroke="var(--text-secondary)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                  formatter={(value: number, _name: string, props: any) => [
                    `${value.toFixed(2)} avg`,
                    props.payload.text,
                  ]}
                />
                <Bar dataKey="average" fill="var(--primary-bg)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="results-chart">
        <h3>Variance per Idea (Higher = More Disagreement)</h3>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={varianceChartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
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
                  `${value.toFixed(2)} variance`,
                  props.payload.text,
                ]}
              />
              <Bar dataKey="variance" fill="var(--danger-bg)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="results-list">
        <h3>Ranked Results (by Total Score)</h3>
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
                  <span className="meta-value">{idea.stats.avg.toFixed(1)}</span>
                  <span className="meta-label">Average</span>
                </div>
                <div className="meta-item">
                  <span
                    className={`meta-value ${
                      idea.stats.variance > 1 ? 'variance-high' : 'variance-low'
                    }`}
                  >
                    {idea.stats.variance.toFixed(2)}
                  </span>
                  <span className="meta-label">Variance</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

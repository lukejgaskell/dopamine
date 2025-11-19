import type { Idea } from '../../../types/idea'
import type { ModuleResults } from '../../../types/module'
import '../ResultsCommon.css'

interface WorkEstimateResultsProps {
  ideas: Idea[]
  results: ModuleResults
  estimateType?: 'hours' | 'days' | 'points' | 'tshirt'
}

const TSHIRT_LABELS: Record<number, string> = {
  1: 'XS',
  2: 'S',
  3: 'M',
  5: 'L',
  8: 'XL',
}

export function WorkEstimateResults({
  ideas,
  results,
  estimateType = 'hours',
}: WorkEstimateResultsProps) {
  // Calculate statistics for each idea
  const getIdeaStats = (ideaId: string) => {
    if (!results?.estimates) return { avg: 0, variance: 0, count: 0 }

    const estimates = Object.values(results.estimates)
      .map((userEstimates) => userEstimates[ideaId])
      .filter((e) => e !== undefined)

    if (estimates.length === 0) return { avg: 0, variance: 0, count: 0 }

    const avg = estimates.reduce((a, b) => a + b, 0) / estimates.length

    // Calculate variance
    const squaredDiffs = estimates.map((e) => Math.pow(e - avg, 2))
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / estimates.length

    return { avg, variance, count: estimates.length }
  }

  // Sort ideas by average effort (highest first)
  const sortedByEffort = [...ideas]
    .map((idea) => ({
      ...idea,
      stats: getIdeaStats(idea.id),
    }))
    .sort((a, b) => b.stats.avg - a.stats.avg)

  // Sort by variance for most contentious items
  const sortedByVariance = [...sortedByEffort].sort((a, b) => b.stats.variance - a.stats.variance)

  const totalEstimators = Object.keys(results?.estimates || {}).length
  const totalEffort = sortedByEffort.reduce((sum, idea) => sum + idea.stats.avg, 0)

  const getUnitLabel = () => {
    switch (estimateType) {
      case 'hours':
        return 'hours'
      case 'days':
        return 'days'
      case 'points':
        return 'pts'
      case 'tshirt':
        return ''
      default:
        return 'units'
    }
  }

  const formatEstimate = (value: number) => {
    if (estimateType === 'tshirt') {
      // Find closest t-shirt size
      const sizes = [1, 2, 3, 5, 8]
      const closest = sizes.reduce((prev, curr) =>
        Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
      )
      return TSHIRT_LABELS[closest] || value.toFixed(1)
    }
    return value.toFixed(1)
  }

  return (
    <div className="results-container">
      <div className="results-header">
        <h2>Work Estimate Results</h2>
        <div className="results-stats">
          <div className="stat">
            <span className="stat-value">
              {formatEstimate(totalEffort)} {getUnitLabel()}
            </span>
            <span className="stat-label">Total Effort</span>
          </div>
          <div className="stat">
            <span className="stat-value">{totalEstimators}</span>
            <span className="stat-label">Estimators</span>
          </div>
        </div>
      </div>

      <div className="results-list">
        <h3>Sorted by Average Effort (Highest First)</h3>
        <div className="ranked-results">
          {sortedByEffort.map((idea, index) => (
            <div key={idea.id} className={`result-item ${index < 3 ? 'top-three' : ''}`}>
              <div className="result-rank">
                <span className="rank-number">{index + 1}</span>
              </div>
              <div className="result-content">
                <p className="result-text">{idea.text}</p>
              </div>
              <div className="result-meta">
                <div className="meta-item">
                  <span className="meta-value">
                    {formatEstimate(idea.stats.avg)} {getUnitLabel()}
                  </span>
                  <span className="meta-label">Average</span>
                </div>
                <div className="meta-item">
                  <span
                    className={`meta-value ${
                      idea.stats.variance > 2 ? 'variance-high' : 'variance-low'
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

      {sortedByVariance.length > 0 && sortedByVariance[0].stats.variance > 0 && (
        <div className="results-list">
          <h3>Most Contentious Estimates (Highest Variance)</h3>
          <div className="ranked-results">
            {sortedByVariance.slice(0, 5).map((idea, index) => (
              <div key={idea.id} className="result-item">
                <div className="result-rank">
                  <span className="rank-number">{index + 1}</span>
                </div>
                <div className="result-content">
                  <p className="result-text">{idea.text}</p>
                </div>
                <div className="result-meta">
                  <div className="meta-item">
                    <span className="meta-value variance-high">
                      {idea.stats.variance.toFixed(2)}
                    </span>
                    <span className="meta-label">Variance</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-value">
                      {formatEstimate(idea.stats.avg)} {getUnitLabel()}
                    </span>
                    <span className="meta-label">Average</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

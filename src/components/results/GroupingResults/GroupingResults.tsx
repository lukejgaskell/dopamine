import type { Idea } from '../../../types/idea'
import type { ModuleResults } from '../../../types/module'
import '../ResultsCommon.css'

interface GroupingResultsProps {
  ideas: Idea[]
  results: ModuleResults
}

export function GroupingResults({ ideas, results }: GroupingResultsProps) {
  if (!results?.groups || Object.keys(results.groups).length === 0) {
    return (
      <div className="results-container">
        <div className="no-results">
          <p>No grouping results available yet.</p>
        </div>
      </div>
    )
  }

  // Get the idea text by ID
  const getIdeaText = (ideaId: string) => {
    const idea = ideas.find((i) => i.id === ideaId)
    return idea?.text || 'Unknown item'
  }

  // Aggregate groupings across all users to find common patterns
  const aggregateGroupings = () => {
    const groupNameCounts: Record<string, number> = {}
    const groupItemCounts: Record<string, Record<string, number>> = {}

    // Count how often each group name appears and which items are in it
    Object.values(results.groups || {}).forEach((userGroups) => {
      userGroups.forEach((group) => {
        const normalizedName = group.name.toLowerCase().trim()
        groupNameCounts[normalizedName] = (groupNameCounts[normalizedName] || 0) + 1

        if (!groupItemCounts[normalizedName]) {
          groupItemCounts[normalizedName] = {}
        }

        group.itemIds.forEach((itemId) => {
          groupItemCounts[normalizedName][itemId] =
            (groupItemCounts[normalizedName][itemId] || 0) + 1
        })
      })
    })

    // Sort group names by frequency
    const sortedGroupNames = Object.entries(groupNameCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)

    return { sortedGroupNames, groupItemCounts }
  }

  const { sortedGroupNames, groupItemCounts } = aggregateGroupings()
  const totalGroupers = Object.keys(results.groups).length

  // Show the most common grouping pattern (from the user with most groups)
  const mostCompleteGrouping = Object.entries(results.groups).sort(
    (a, b) => b[1].length - a[1].length
  )[0]

  return (
    <div className="results-container">
      <div className="results-header">
        <h2>Grouping Results</h2>
        <div className="results-stats">
          <div className="stat">
            <span className="stat-value">{sortedGroupNames.length}</span>
            <span className="stat-label">Unique Groups</span>
          </div>
          <div className="stat">
            <span className="stat-value">{totalGroupers}</span>
            <span className="stat-label">Participants</span>
          </div>
        </div>
      </div>

      {mostCompleteGrouping && (
        <div className="results-list">
          <h3>Example Grouping (by {mostCompleteGrouping[0]})</h3>
          <div className="grouping-results">
            {mostCompleteGrouping[1].map((group) => (
              <div key={group.id} className="group-result-card">
                <div className="group-result-header">
                  <h4>{group.name}</h4>
                  <span className="group-count">{group.itemIds.length} items</span>
                </div>
                <div className="group-items-list">
                  {group.itemIds.map((itemId) => (
                    <div key={itemId} className="group-item">
                      {getIdeaText(itemId)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sortedGroupNames.length > 0 && (
        <div className="results-list">
          <h3>Common Group Themes</h3>
          <div className="ranked-results">
            {sortedGroupNames.slice(0, 10).map((groupName, index) => {
              const itemCount = Object.keys(groupItemCounts[groupName]).length
              const mostCommonItems = Object.entries(groupItemCounts[groupName])
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)

              return (
                <div key={groupName} className="result-item">
                  <div className="result-rank">
                    <span className="rank-number">{index + 1}</span>
                  </div>
                  <div className="result-content">
                    <p className="result-text" style={{ textTransform: 'capitalize' }}>
                      {groupName}
                    </p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Common items:{' '}
                      {mostCommonItems.map(([id]) => getIdeaText(id).substring(0, 30)).join(', ')}
                      {mostCommonItems.length < Object.keys(groupItemCounts[groupName]).length && '...'}
                    </div>
                  </div>
                  <div className="result-meta">
                    <div className="meta-item">
                      <span className="meta-value">{itemCount}</span>
                      <span className="meta-label">Items</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

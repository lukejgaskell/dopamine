import { useMemo } from 'react'
import type { Idea } from '../types/idea'
import './IdeaCard.css'

interface IdeaCardProps {
  idea: Idea
}

// Simple hash function to generate consistent random positions from ID
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export default function IdeaCard({ idea }: IdeaCardProps) {
  const { position, maxWidth } = useMemo(() => {
    const hash = hashCode(idea.id)
    const textLength = idea.text.length

    // Vary max-width based on text length for organic sizing
    let cardMaxWidth: number
    if (textLength < 50) {
      cardMaxWidth = 200
    } else if (textLength < 100) {
      cardMaxWidth = 250
    } else if (textLength < 150) {
      cardMaxWidth = 300
    } else {
      cardMaxWidth = 350
    }

    // Grid-based positioning to minimize overlaps, centered on screen
    // Create a 5x4 grid of possible positions
    const gridCols = 5
    const gridRows = 4
    const cellIndex = hash % (gridCols * gridRows)

    const col = cellIndex % gridCols
    const row = Math.floor(cellIndex / gridCols)

    // Calculate position with some randomness within each cell
    const cellWidth = 50 / gridCols  // 50% total width divided by columns (centered)
    const cellHeight = 40 / gridRows  // 40% total height divided by rows (centered)

    const microHash = (hash >> 16) % 100
    const xOffset = (microHash % 30) / 100 * cellWidth  // Random within cell
    const yOffset = ((microHash >> 4) % 30) / 100 * cellHeight

    const x = 25 + (col * cellWidth) + xOffset  // Start at 25% (centered)
    const y = 20 + (row * cellHeight) + yOffset  // Start at 20% (centered)

    return {
      position: { x, y },
      maxWidth: cardMaxWidth
    }
  }, [idea.id, idea.text.length])

  return (
    <div
      className="idea-card"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        maxWidth: `${maxWidth}px`,
      }}
    >
      <p className="idea-text">{idea.text}</p>
    </div>
  )
}

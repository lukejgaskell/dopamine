import type { Idea } from '../types/idea'
import './IdeaCard.css'

interface IdeaCardProps {
  idea: Idea
}

export default function IdeaCard({ idea }: IdeaCardProps) {
  return (
    <div className="idea-card">
      <p className="idea-text">{idea.text}</p>
    </div>
  )
}

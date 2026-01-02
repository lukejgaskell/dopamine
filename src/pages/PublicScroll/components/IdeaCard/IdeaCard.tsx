import type { Idea } from '../../../../types/idea'
import './IdeaCard.css'

type IdeaCardProps = {
  idea: Idea
}

export function IdeaCard({ idea }: IdeaCardProps) {
  return (
    <div className="idea-card">
      <p className="idea-text">{idea.text}</p>
    </div>
  )
}

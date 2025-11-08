import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Idea } from '../types/idea'
import './VotingView.css'

interface VotingViewProps {
  ideas: Idea[]
  scrollId: string
}

export default function VotingView({ ideas, scrollId }: VotingViewProps) {
  const [votedIdeas, setVotedIdeas] = useState<Set<string>>(new Set())

  const handleVote = async (ideaId: string) => {
    if (votedIdeas.has(ideaId)) return

    try {
      const idea = ideas.find((i) => i.id === ideaId)
      if (!idea) return

      const { error } = await supabase
        .from('ideas')
        .update({ votes: idea.votes + 1 })
        .eq('id', ideaId)

      if (error) throw error

      setVotedIdeas((prev) => new Set([...prev, ideaId]))
    } catch (error: any) {
      console.error('Error voting:', error)
    }
  }

  const sortedIdeas = [...ideas].sort((a, b) => b.votes - a.votes)

  return (
    <div className="voting-view">
      <div className="voting-instructions">
        <p>Vote for your favorite ideas! Click on an idea to vote.</p>
      </div>
      <div className="voting-list">
        {sortedIdeas.map((idea) => (
          <div
            key={idea.id}
            className={`voting-card ${votedIdeas.has(idea.id) ? 'voted' : ''}`}
            onClick={() => handleVote(idea.id)}
          >
            <div className="voting-card-content">
              <p className="voting-card-text">{idea.text}</p>
            </div>
            <div className="voting-card-votes">
              <span className="vote-count">{idea.votes}</span>
              <span className="vote-label">{idea.votes === 1 ? 'vote' : 'votes'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import type { Idea } from "../../types/idea";
import type { ModuleConfig, ModuleResults } from "../../types/module";
import "./SimpleVoteView.css";

interface SimpleVoteViewProps {
  ideas: Idea[];
  scrollId: string;
  maxVotes?: number;
  moduleIndex: number;
  modules: ModuleConfig[];
  userName: string;
  results?: ModuleResults;
}

export function SimpleVoteView({
  ideas,
  scrollId,
  maxVotes = 3,
  moduleIndex,
  modules: _modules,
  userName,
  results,
}: SimpleVoteViewProps) {
  const [votedIdeas, setVotedIdeas] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  // Check if user already voted
  useEffect(() => {
    if (results?.votes) {
      const userVotes = new Set<string>();
      Object.entries(results.votes).forEach(([ideaId, voters]) => {
        if (voters.includes(userName)) {
          userVotes.add(ideaId);
        }
      });
      if (userVotes.size > 0) {
        setVotedIdeas(userVotes);
        setSubmitted(true);
      }
    }
  }, [results, userName]);

  const saveResults = async (newVotedIdeas: Set<string>) => {
    // Fetch fresh scroll data to avoid race conditions
    const { data: freshScroll } = await supabase
      .from("scrolls")
      .select("modules")
      .eq("id", scrollId)
      .single();

    if (!freshScroll) return;

    const updatedModules = [...freshScroll.modules];
    const currentResults = updatedModules[moduleIndex].results || {};
    const votes = currentResults.votes || {};

    // Add user to each voted idea
    newVotedIdeas.forEach((ideaId) => {
      if (!votes[ideaId]) {
        votes[ideaId] = [];
      }
      if (!votes[ideaId].includes(userName)) {
        votes[ideaId].push(userName);
      }
    });

    updatedModules[moduleIndex] = {
      ...updatedModules[moduleIndex],
      results: { ...currentResults, votes },
    };

    await supabase
      .from("scrolls")
      .update({ modules: updatedModules })
      .eq("id", scrollId);
  };

  const handleVote = async (ideaId: string) => {
    if (votedIdeas.has(ideaId)) return;
    if (votedIdeas.size >= maxVotes) return;
    if (submitted) return;

    const newVotedIdeas = new Set([...votedIdeas, ideaId]);
    setVotedIdeas(newVotedIdeas);

    // Auto-submit when max votes reached
    if (newVotedIdeas.size >= maxVotes) {
      await saveResults(newVotedIdeas);
      setSubmitted(true);
    }
  };

  const handleSubmit = async () => {
    if (votedIdeas.size === 0) return;
    await saveResults(votedIdeas);
    setSubmitted(true);
  };

  // Calculate vote counts from results
  const getVoteCount = (ideaId: string) => {
    return results?.votes?.[ideaId]?.length || 0;
  };

  const sortedIdeas = [...ideas].sort(
    (a, b) => getVoteCount(b.id) - getVoteCount(a.id)
  );
  const remainingVotes = maxVotes - votedIdeas.size;

  if (submitted) {
    return (
      <div className="simple-vote-view">
        <div className="vote-submitted">
          <div className="submitted-icon">✓</div>
          <h3>Votes Submitted!</h3>
          <p>You voted for {votedIdeas.size} item{votedIdeas.size !== 1 ? "s" : ""}.</p>
        </div>
        <div className="simple-vote-list">
          {sortedIdeas.map((idea) => (
            <div
              key={idea.id}
              className={`simple-vote-card ${votedIdeas.has(idea.id) ? "voted" : ""} disabled`}
            >
              <div className="simple-vote-card-content">
                <p className="simple-vote-card-text">{idea.text}</p>
              </div>
              <div className="simple-vote-card-action">
                {votedIdeas.has(idea.id) && (
                  <span className="vote-checkmark">✓</span>
                )}
              </div>
              <div className="simple-vote-count">
                <span className="count-number">{getVoteCount(idea.id)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="simple-vote-view">
      <div className="vote-instructions">
        <p>
          Click to vote for your favorites. You have{" "}
          <strong>{remainingVotes}</strong> vote{remainingVotes !== 1 ? "s" : ""}{" "}
          remaining.
        </p>
      </div>
      <div className="simple-vote-list">
        {sortedIdeas.map((idea) => (
          <div
            key={idea.id}
            className={`simple-vote-card ${votedIdeas.has(idea.id) ? "voted" : ""} ${
              remainingVotes === 0 && !votedIdeas.has(idea.id) ? "disabled" : ""
            }`}
            onClick={() => handleVote(idea.id)}
          >
            <div className="simple-vote-card-content">
              <p className="simple-vote-card-text">{idea.text}</p>
            </div>
            <div className="simple-vote-card-action">
              {votedIdeas.has(idea.id) ? (
                <span className="vote-checkmark">✓</span>
              ) : (
                <span className="vote-icon">+1</span>
              )}
            </div>
            <div className="simple-vote-count">
              <span className="count-number">{getVoteCount(idea.id)}</span>
            </div>
          </div>
        ))}
      </div>
      {votedIdeas.size > 0 && votedIdeas.size < maxVotes && (
        <div className="simple-vote-submit">
          <button className="submit-votes-btn" onClick={handleSubmit}>
            Submit {votedIdeas.size} Vote{votedIdeas.size !== 1 ? "s" : ""}
          </button>
        </div>
      )}
    </div>
  );
}

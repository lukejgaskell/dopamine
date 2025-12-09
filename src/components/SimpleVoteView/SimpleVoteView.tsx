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
  moduleIndex: _moduleIndex,
  modules: _modules,
  userName: _userName,
  results: _results,
}: SimpleVoteViewProps) {
  const [votedIdeas, setVotedIdeas] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setCurrentUserId(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Get current user ID and load their existing votes
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Load user's existing votes for these ideas
      const ideaIds = ideas.map(i => i.id);
      const { data: userVotes } = await supabase
        .from('votes')
        .select('idea_id')
        .eq('created_by', user.id)
        .eq('scroll_id', scrollId)
        .in('idea_id', ideaIds);

      if (userVotes && userVotes.length > 0) {
        const votedSet = new Set(userVotes.map(v => v.idea_id));
        setVotedIdeas(votedSet);
        setSubmitted(true);
      }
    };

    if (ideas.length > 0) {
      loadUserData();
    }
  }, [ideas, scrollId]);

  // Load vote counts for all ideas
  useEffect(() => {
    const loadVoteCounts = async () => {
      const ideaIds = ideas.map(i => i.id);
      const { data: votes } = await supabase
        .from('votes')
        .select('idea_id')
        .eq('scroll_id', scrollId)
        .in('idea_id', ideaIds);

      if (votes) {
        const counts: Record<string, number> = {};
        votes.forEach(vote => {
          counts[vote.idea_id] = (counts[vote.idea_id] || 0) + 1;
        });
        setVoteCounts(counts);
      }
    };

    if (ideas.length > 0) {
      loadVoteCounts();
    }

    // Subscribe to vote changes
    const channel = supabase
      .channel(`votes:${scrollId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `scroll_id=eq.${scrollId}`,
        },
        () => {
          loadVoteCounts();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [ideas, scrollId]);

  const saveResults = async (newVotedIdeas: Set<string>) => {
    if (!currentUserId) return;

    // Convert votes to vote records (value = 1 for simple votes)
    const voteRecords = Array.from(newVotedIdeas).map(ideaId => ({
      created_by: currentUserId,
      scroll_id: scrollId,
      idea_id: ideaId,
      value: 1,
    }));

    // Insert votes
    await supabase
      .from('votes')
      .insert(voteRecords);
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

  // Calculate vote counts from voteCounts state
  const getVoteCount = (ideaId: string) => {
    return voteCounts[ideaId] || 0;
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

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import type { Idea } from "../../types/idea";
import type { ModuleConfig, ModuleResults } from "../../types/module";
import "./WeightedVoteView.css";

interface WeightedVoteViewProps {
  ideas: Idea[];
  scrollId: string;
  totalPoints?: number;
  maxPointsPerItem?: number;
  moduleIndex: number;
  modules: ModuleConfig[];
  userName: string;
  results?: ModuleResults;
}

export function WeightedVoteView({
  ideas,
  scrollId,
  totalPoints = 10,
  maxPointsPerItem = 5,
  moduleIndex: _moduleIndex,
  modules: _modules,
  userName: _userName,
  results: _results,
}: WeightedVoteViewProps) {
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [totalPointsByIdea, setTotalPointsByIdea] = useState<Record<string, number>>({});

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
        .select('idea_id, value')
        .eq('created_by', user.id)
        .eq('scroll_id', scrollId)
        .in('idea_id', ideaIds);

      if (userVotes && userVotes.length > 0) {
        const allocationsMap: Record<string, number> = {};
        userVotes.forEach(vote => {
          allocationsMap[vote.idea_id] = vote.value;
        });
        setAllocations(allocationsMap);
        setSubmitted(true);
      }
    };

    if (ideas.length > 0) {
      loadUserData();
    }
  }, [ideas, scrollId]);

  // Load total points for all ideas
  useEffect(() => {
    const loadTotalPoints = async () => {
      const ideaIds = ideas.map(i => i.id);
      const { data: votes } = await supabase
        .from('votes')
        .select('idea_id, value')
        .eq('scroll_id', scrollId)
        .in('idea_id', ideaIds);

      if (votes) {
        const totals: Record<string, number> = {};
        votes.forEach(vote => {
          totals[vote.idea_id] = (totals[vote.idea_id] || 0) + vote.value;
        });
        setTotalPointsByIdea(totals);
      }
    };

    if (ideas.length > 0) {
      loadTotalPoints();
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
          loadTotalPoints();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [ideas, scrollId]);

  const usedPoints = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  const remainingPoints = totalPoints - usedPoints;

  const handleIncrement = (ideaId: string) => {
    const current = allocations[ideaId] || 0;
    if (current >= maxPointsPerItem) return;
    if (remainingPoints <= 0) return;

    setAllocations((prev) => ({
      ...prev,
      [ideaId]: current + 1,
    }));
  };

  const handleDecrement = (ideaId: string) => {
    const current = allocations[ideaId] || 0;
    if (current <= 0) return;

    setAllocations((prev) => ({
      ...prev,
      [ideaId]: current - 1,
    }));
  };

  const handleSubmit = async () => {
    if (submitting || submitted || !currentUserId) return;
    if (Object.keys(allocations).length === 0) return;

    setSubmitting(true);
    try {
      // Convert allocations to vote records
      const voteRecords = Object.entries(allocations)
        .filter(([_, value]) => value > 0) // Only include non-zero allocations
        .map(([ideaId, value]) => ({
          created_by: currentUserId,
          scroll_id: scrollId,
          idea_id: ideaId,
          value: value,
        }));

      // Insert votes
      const { error } = await supabase
        .from('votes')
        .insert(voteRecords);

      if (error) throw error;

      setSubmitted(true);
    } catch (error: any) {
      console.error("Error submitting votes:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate total points for an idea
  const getTotalPoints = (ideaId: string) => {
    return totalPointsByIdea[ideaId] || 0;
  };

  const sortedIdeas = [...ideas].sort(
    (a, b) => getTotalPoints(b.id) - getTotalPoints(a.id)
  );

  if (submitted) {
    return (
      <div className="weighted-vote-view">
        <div className="vote-submitted">
          <div className="submitted-icon">✓</div>
          <h3>Votes Submitted!</h3>
          <p>Your point allocation has been recorded.</p>
        </div>
        <div className="weighted-vote-list">
          {sortedIdeas.map((idea) => {
            const allocated = allocations[idea.id] || 0;
            return (
              <div key={idea.id} className={`weighted-vote-card ${allocated > 0 ? "voted" : ""}`}>
                <div className="weighted-vote-card-content">
                  <p className="weighted-vote-card-text">{idea.text}</p>
                </div>
                <div className="weighted-vote-results">
                  <div className="your-allocation">
                    <span className="allocation-value">{allocated}</span>
                    <span className="allocation-label">Your pts</span>
                  </div>
                  <div className="total-allocation">
                    <span className="total-value">{getTotalPoints(idea.id)}</span>
                    <span className="total-label">Total</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="weighted-vote-view">
      <div className="weighted-vote-header">
        <div className="points-remaining">
          <span className="points-number">{remainingPoints}</span>
          <span className="points-label">points remaining</span>
        </div>
        <p className="weighted-vote-instructions">
          Distribute up to {totalPoints} points across ideas (max {maxPointsPerItem} per idea)
        </p>
      </div>

      <div className="weighted-vote-list">
        {sortedIdeas.map((idea) => {
          const allocated = allocations[idea.id] || 0;
          const canIncrement = allocated < maxPointsPerItem && remainingPoints > 0;
          const canDecrement = allocated > 0;

          return (
            <div key={idea.id} className="weighted-vote-card">
              <div className="weighted-vote-card-content">
                <p className="weighted-vote-card-text">{idea.text}</p>
              </div>
              <div className="weighted-vote-controls">
                <button
                  className="point-btn decrement"
                  onClick={() => handleDecrement(idea.id)}
                  disabled={!canDecrement}
                >
                  -
                </button>
                <span className="allocated-points">{allocated}</span>
                <button
                  className="point-btn increment"
                  onClick={() => handleIncrement(idea.id)}
                  disabled={!canIncrement}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="weighted-vote-submit">
        <button
          className="submit-votes-btn"
          onClick={handleSubmit}
          disabled={submitting || usedPoints === 0}
        >
          {submitting ? "Submitting..." : "Submit Votes"}
        </button>
      </div>
    </div>
  );
}

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
  moduleIndex,
  modules: _modules,
  userName,
  results,
}: WeightedVoteViewProps) {
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Check if user already voted
  useEffect(() => {
    if (results?.weightedVotes?.[userName]) {
      setAllocations(results.weightedVotes[userName]);
      setSubmitted(true);
    }
  }, [results, userName]);

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
    if (submitting || submitted) return;
    if (Object.keys(allocations).length === 0) return;

    setSubmitting(true);
    try {
      // Fetch fresh scroll data to avoid race conditions
      const { data: freshScroll } = await supabase
        .from("scrolls")
        .select("modules")
        .eq("id", scrollId)
        .single();

      if (!freshScroll) return;

      const updatedModules = [...freshScroll.modules];
      const currentResults = updatedModules[moduleIndex].results || {};
      const allWeightedVotes = currentResults.weightedVotes || {};

      allWeightedVotes[userName] = allocations;

      updatedModules[moduleIndex] = {
        ...updatedModules[moduleIndex],
        results: { ...currentResults, weightedVotes: allWeightedVotes },
      };

      await supabase
        .from("scrolls")
        .update({ modules: updatedModules })
        .eq("id", scrollId);

      setSubmitted(true);
    } catch (error: any) {
      console.error("Error submitting votes:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate total points for an idea
  const getTotalPoints = (ideaId: string) => {
    if (!results?.weightedVotes) return 0;
    return Object.values(results.weightedVotes).reduce(
      (sum, userVotes) => sum + (userVotes[ideaId] || 0),
      0
    );
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

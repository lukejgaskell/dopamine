import { useState, useRef, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import type { Idea } from "../../types/idea";
import type { ModuleConfig, ModuleResults } from "../../types/module";
import "./RankOrderView.css";

interface RankOrderViewProps {
  ideas: Idea[];
  scrollId: string;
  maxItems?: number;
  moduleIndex: number;
  modules: ModuleConfig[];
  userName: string;
  results?: ModuleResults;
}

export function RankOrderView({
  ideas,
  scrollId,
  maxItems = 10,
  moduleIndex: _moduleIndex,
  modules: _modules,
  userName: _userName,
  results: _results,
}: RankOrderViewProps) {
  const [rankedItems, setRankedItems] = useState<Idea[]>([]);
  const [unrankedItems, setUnrankedItems] = useState<Idea[]>(ideas);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draggedItem, setDraggedItem] = useState<Idea | null>(null);
  const [dragSource, setDragSource] = useState<"ranked" | "unranked" | null>(null);
  const dragOverItemRef = useRef<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

  // Get current user ID and load their existing rankings
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Load user's existing votes/rankings for these ideas
      const ideaIds = ideas.map(i => i.id);
      const { data: userVotes } = await supabase
        .from('votes')
        .select('idea_id, value')
        .eq('created_by', user.id)
        .eq('scroll_id', scrollId)
        .in('idea_id', ideaIds);

      if (userVotes && userVotes.length > 0) {
        // Sort by rank (value), lower is better (1 = 1st place)
        const sortedVotes = userVotes.sort((a, b) => a.value - b.value);
        const ranked = sortedVotes
          .map(vote => ideas.find(i => i.id === vote.idea_id))
          .filter(Boolean) as Idea[];
        const rankedIds = ranked.map(i => i.id);
        const unranked = ideas.filter((i) => !rankedIds.includes(i.id));
        setRankedItems(ranked);
        setUnrankedItems(unranked);
        setSubmitted(true);
      }
    };

    if (ideas.length > 0) {
      loadUserData();
    }
  }, [ideas, scrollId]);

  const handleDragStart = (
    e: React.DragEvent,
    item: Idea,
    source: "ranked" | "unranked"
  ) => {
    setDraggedItem(item);
    setDragSource(source);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    if (index !== undefined) {
      dragOverItemRef.current = index;
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragSource(null);
    dragOverItemRef.current = null;
  };

  const handleDropOnRanked = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (dragSource === "unranked") {
      if (rankedItems.length >= maxItems) return;

      setUnrankedItems((prev) => prev.filter((i) => i.id !== draggedItem.id));
      setRankedItems((prev) => {
        const newRanked = [...prev];
        newRanked.splice(dropIndex, 0, draggedItem);
        return newRanked;
      });
    } else if (dragSource === "ranked") {
      setRankedItems((prev) => {
        const filtered = prev.filter((i) => i.id !== draggedItem.id);
        filtered.splice(dropIndex, 0, draggedItem);
        return filtered;
      });
    }

    handleDragEnd();
  };

  const handleDropOnUnranked = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem || dragSource !== "ranked") return;

    setRankedItems((prev) => prev.filter((i) => i.id !== draggedItem.id));
    setUnrankedItems((prev) => [...prev, draggedItem]);
    handleDragEnd();
  };

  const handleAddToRanked = (item: Idea) => {
    if (rankedItems.length >= maxItems) return;
    setUnrankedItems((prev) => prev.filter((i) => i.id !== item.id));
    setRankedItems((prev) => [...prev, item]);
  };

  const handleRemoveFromRanked = (item: Idea) => {
    setRankedItems((prev) => prev.filter((i) => i.id !== item.id));
    setUnrankedItems((prev) => [...prev, item]);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setRankedItems((prev) => {
      const newRanked = [...prev];
      [newRanked[index - 1], newRanked[index]] = [newRanked[index], newRanked[index - 1]];
      return newRanked;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === rankedItems.length - 1) return;
    setRankedItems((prev) => {
      const newRanked = [...prev];
      [newRanked[index], newRanked[index + 1]] = [newRanked[index + 1], newRanked[index]];
      return newRanked;
    });
  };

  const handleSubmit = async () => {
    if (submitting || submitted || rankedItems.length === 0 || !currentUserId) return;

    setSubmitting(true);
    try {
      // Convert rankings to vote records (rank position as value: 1 for 1st, 2 for 2nd, etc.)
      const voteRecords = rankedItems.map((idea, index) => ({
        created_by: currentUserId,
        scroll_id: scrollId,
        idea_id: idea.id,
        value: index + 1, // 1-based rank position
      }));

      // Insert votes
      const { error } = await supabase
        .from('votes')
        .insert(voteRecords);

      if (error) throw error;

      setSubmitted(true);
    } catch (error: any) {
      console.error("Error submitting ranking:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate average rank position for an idea
  const getAverageRank = (ideaId: string) => {
    if (!_results?.rankings) return 0;
    const rankings = Object.values(_results.rankings);
    const positions = rankings
      .map((ranking) => ranking.indexOf(ideaId))
      .filter((pos) => pos !== -1);
    if (positions.length === 0) return 0;
    return positions.reduce((a, b) => a + b, 0) / positions.length + 1;
  };

  if (submitted) {
    return (
      <div className="rank-order-view">
        <div className="vote-submitted">
          <div className="submitted-icon">✓</div>
          <h3>Ranking Submitted!</h3>
          <p>Your ranking has been recorded.</p>
        </div>
        <div className="rank-results">
          <h4>Your Ranking</h4>
          <div className="ranked-list results">
            {rankedItems.map((item, index) => (
              <div key={item.id} className="ranked-item result">
                <span className="rank-number">{index + 1}</span>
                <span className="rank-text">{item.text}</span>
                <div className="avg-rank">
                  <span className="avg-value">{getAverageRank(item.id).toFixed(1)}</span>
                  <span className="avg-label">Avg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rank-order-view">
      <div className="rank-order-header">
        <p className="rank-order-instructions">
          Drag items to rank them in order of preference (top = most preferred).
          Rank up to {maxItems} items.
        </p>
      </div>

      <div className="rank-order-container">
        <div className="rank-order-panel">
          <h3>Your Ranking ({rankedItems.length}/{maxItems})</h3>
          <div
            className="ranked-list"
            onDragOver={(e) => handleDragOver(e)}
            onDrop={(e) => handleDropOnRanked(e, rankedItems.length)}
          >
            {rankedItems.length === 0 ? (
              <div className="ranked-placeholder">
                Drag items here to rank them
              </div>
            ) : (
              rankedItems.map((item, index) => (
                <div
                  key={item.id}
                  className="ranked-item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, item, "ranked")}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDropOnRanked(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <span className="rank-number">{index + 1}</span>
                  <span className="rank-text">{item.text}</span>
                  <div className="rank-controls">
                    <button
                      className="rank-btn"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                    <button
                      className="rank-btn"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === rankedItems.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      className="rank-btn remove"
                      onClick={() => handleRemoveFromRanked(item)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rank-order-panel">
          <h3>Available Items ({unrankedItems.length})</h3>
          <div
            className="unranked-list"
            onDragOver={(e) => handleDragOver(e)}
            onDrop={handleDropOnUnranked}
          >
            {unrankedItems.length === 0 ? (
              <div className="unranked-placeholder">
                All items have been ranked
              </div>
            ) : (
              unrankedItems.map((item) => (
                <div
                  key={item.id}
                  className="unranked-item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, item, "unranked")}
                  onDragEnd={handleDragEnd}
                >
                  <span className="unrank-text">{item.text}</span>
                  <button
                    className="add-btn"
                    onClick={() => handleAddToRanked(item)}
                    disabled={rankedItems.length >= maxItems}
                  >
                    +
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rank-order-submit">
        <button
          className="submit-ranking-btn"
          onClick={handleSubmit}
          disabled={submitting || rankedItems.length === 0}
        >
          {submitting ? "Submitting..." : "Submit Ranking"}
        </button>
      </div>
    </div>
  );
}

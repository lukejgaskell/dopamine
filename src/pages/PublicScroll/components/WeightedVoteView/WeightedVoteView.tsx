import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from '../../../../lib/supabase';
import type { Idea } from '../../../../types/idea';
import type { ModuleConfig, ModuleResults } from '../../../../types/module';
import { useScrollContext } from '../../context';
import "./WeightedVoteView.css";

const DEBOUNCE_MS = 500;

type WeightedVoteViewProps = {
  ideas: Idea[];
  scrollId: string;
  totalPoints?: number;
  maxPointsPerItem?: number;
  moduleId: string;
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
  moduleId,
  moduleIndex: _moduleIndex,
  modules: _modules,
  userName: _userName,
  results: _results,
}: WeightedVoteViewProps) {
  const { activeUsersCount } = useScrollContext();
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [totalPointsByIdea, setTotalPointsByIdea] = useState<Record<string, number>>({});
  const [totalPointsCast, setTotalPointsCast] = useState(0);
  const [saving, setSaving] = useState<Set<string>>(new Set());

  // Track the original DB value before pending changes
  const originalValues = useRef<Record<string, number>>({});
  // Track debounce timers per idea
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
        .eq('module_id', moduleId)
        .in('idea_id', ideaIds);

      if (userVotes && userVotes.length > 0) {
        const allocationsMap: Record<string, number> = {};
        userVotes.forEach(vote => {
          allocationsMap[vote.idea_id] = Number(vote.value) || 0;
        });
        setAllocations(allocationsMap);
        // Initialize original values to match loaded data
        originalValues.current = { ...allocationsMap };
      }
    };

    if (ideas.length > 0) {
      loadUserData();
    }
  }, [ideas, scrollId, moduleId]);

  // Load total points for all ideas
  useEffect(() => {
    const loadTotalPoints = async () => {
      const ideaIds = ideas.map(i => i.id);
      const { data: votes } = await supabase
        .from('votes')
        .select('idea_id, value')
        .eq('scroll_id', scrollId)
        .eq('module_id', moduleId)
        .in('idea_id', ideaIds);

      if (votes) {
        const totals: Record<string, number> = {};
        let totalCast = 0;
        votes.forEach(vote => {
          const value = Number(vote.value) || 0;
          totals[vote.idea_id] = (totals[vote.idea_id] || 0) + value;
          totalCast += value;
        });
        setTotalPointsByIdea(totals);
        setTotalPointsCast(totalCast);
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
  }, [ideas, scrollId, moduleId]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  const usedPoints = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  const remainingPoints = totalPoints - usedPoints;
  const totalPossiblePoints = activeUsersCount * totalPoints;
  const remainingSessionPoints = totalPossiblePoints - totalPointsCast;

  // Actual DB save function
  const saveToDb = useCallback(async (ideaId: string, newValue: number, dbOriginalValue: number) => {
    if (!currentUserId) return;

    setSaving(prev => new Set(prev).add(ideaId));

    try {
      let error = null;

      if (dbOriginalValue > 0) {
        // User already has a vote for this idea in DB
        if (newValue === 0) {
          // Delete the vote
          const result = await supabase
            .from('votes')
            .delete()
            .eq('created_by', currentUserId)
            .eq('scroll_id', scrollId)
            .eq('module_id', moduleId)
            .eq('idea_id', ideaId);
          error = result.error;
        } else {
          // Update the existing vote
          const result = await supabase
            .from('votes')
            .update({ value: newValue })
            .eq('created_by', currentUserId)
            .eq('scroll_id', scrollId)
            .eq('module_id', moduleId)
            .eq('idea_id', ideaId);
          error = result.error;
        }
      } else {
        // No existing vote in DB - insert new record
        if (newValue > 0) {
          const result = await supabase
            .from('votes')
            .insert({
              created_by: currentUserId,
              scroll_id: scrollId,
              idea_id: ideaId,
              module_id: moduleId,
              value: newValue,
            });
          error = result.error;
        }
      }

      if (error) {
        console.error('Error saving allocation:', error);
        // Revert to original value on error
        setAllocations(prev => ({
          ...prev,
          [ideaId]: dbOriginalValue
        }));
      } else {
        // Update the original value to reflect what's now in DB
        originalValues.current[ideaId] = newValue;
      }
    } catch (error) {
      console.error('Error saving allocation:', error);
      // Revert to original value on error
      setAllocations(prev => ({
        ...prev,
        [ideaId]: dbOriginalValue
      }));
    } finally {
      setSaving(prev => {
        const next = new Set(prev);
        next.delete(ideaId);
        return next;
      });
    }
  }, [currentUserId, scrollId, moduleId]);

  // Schedule a debounced save for an idea
  const scheduleSave = useCallback((ideaId: string, newValue: number) => {
    // Clear any existing timer for this idea
    if (debounceTimers.current[ideaId]) {
      clearTimeout(debounceTimers.current[ideaId]);
    }

    // Capture the original DB value (before any pending changes started)
    const dbOriginalValue = originalValues.current[ideaId] ?? 0;

    // Schedule the save
    debounceTimers.current[ideaId] = setTimeout(() => {
      delete debounceTimers.current[ideaId];
      saveToDb(ideaId, newValue, dbOriginalValue);
    }, DEBOUNCE_MS);
  }, [saveToDb]);

  const handleIncrement = (ideaId: string) => {
    const current = allocations[ideaId] || 0;
    if (current >= maxPointsPerItem) return;
    if (remainingPoints <= 0) return;

    const newValue = current + 1;
    setAllocations((prev) => ({
      ...prev,
      [ideaId]: newValue,
    }));
    // Optimistically update totals
    setTotalPointsByIdea(prev => ({
      ...prev,
      [ideaId]: (prev[ideaId] || 0) + 1
    }));
    setTotalPointsCast(prev => prev + 1);
    scheduleSave(ideaId, newValue);
  };

  const handleDecrement = (ideaId: string) => {
    const current = allocations[ideaId] || 0;
    if (current <= 0) return;

    const newValue = current - 1;
    setAllocations((prev) => ({
      ...prev,
      [ideaId]: newValue,
    }));
    // Optimistically update totals
    setTotalPointsByIdea(prev => ({
      ...prev,
      [ideaId]: (prev[ideaId] || 0) - 1
    }));
    setTotalPointsCast(prev => prev - 1);
    scheduleSave(ideaId, newValue);
  };

  // Calculate total points for an idea
  const getTotalPoints = (ideaId: string) => {
    return totalPointsByIdea[ideaId] || 0;
  };

  const sortedIdeas = [...ideas].sort(
    (a, b) => getTotalPoints(b.id) - getTotalPoints(a.id)
  );

  return (
    <div className="weighted-vote-view">
      <div className="weighted-vote-header">
        <div className="weighted-vote-instructions">
          <p>
            Distribute up to <strong>{totalPoints}</strong> points (max {maxPointsPerItem} per idea).
            You have <strong>{remainingPoints}</strong> point{remainingPoints !== 1 ? "s" : ""} remaining.
          </p>
        </div>
        <div className="weighted-vote-session-stats">
          <span className="session-points-count">{totalPointsCast}</span>
          <span className="session-points-label">points cast</span>
          {activeUsersCount > 0 && (
            <>
              <span className="session-points-divider">|</span>
              <span className="session-points-remaining">{remainingSessionPoints}</span>
              <span className="session-points-label">remaining</span>
            </>
          )}
        </div>
      </div>

      <div className="weighted-vote-list">
        {sortedIdeas.map((idea) => {
          const allocated = allocations[idea.id] || 0;
          const isSaving = saving.has(idea.id);
          const hasPendingChanges = debounceTimers.current[idea.id] !== undefined;
          const canIncrement = allocated < maxPointsPerItem && remainingPoints > 0;
          const canDecrement = allocated > 0;

          return (
            <div key={idea.id} className={`weighted-vote-card ${isSaving || hasPendingChanges ? "updating" : ""}`}>
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
              <div className="weighted-vote-total">
                <span className="total-points-number">{getTotalPoints(idea.id)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

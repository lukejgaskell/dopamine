import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from '@/lib/supabase';
import type { Idea } from '@/types/idea';
import type { ModuleConfig, ModuleResults } from '@/types/module';
import { useScrollContext } from '../../context';
import "./WorkEstimateView.css";

const DEBOUNCE_MS = 500;

type WorkEstimateViewProps = {
  ideas: Idea[];
  scrollId: string;
  estimateType?: "hours" | "days" | "points" | "tshirt";
  moduleId: string;
  moduleIndex: number;
  modules: ModuleConfig[];
  userName: string;
  results?: ModuleResults;
}

const TSHIRT_SIZES = [
  { value: 1, label: "XS", description: "Extra Small" },
  { value: 2, label: "S", description: "Small" },
  { value: 3, label: "M", description: "Medium" },
  { value: 5, label: "L", description: "Large" },
  { value: 8, label: "XL", description: "Extra Large" },
];

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13, 21];

const HOUR_OPTIONS = [0.5, 1, 2, 4, 8, 16, 24, 40];

const DAY_OPTIONS = [0.5, 1, 2, 3, 5, 10, 20];

export function WorkEstimateView({
  ideas,
  scrollId,
  estimateType = "hours",
  moduleId,
  moduleIndex: _moduleIndex,
  modules: _modules,
  userName: _userName,
  results: _results,
}: WorkEstimateViewProps) {
  const { activeUsersCount } = useScrollContext();
  const [estimates, setEstimates] = useState<Record<string, number>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [totalEstimatesByIdea, setTotalEstimatesByIdea] = useState<Record<string, { sum: number; count: number }>>({});

  // Track the original DB value before pending changes
  const originalValues = useRef<Record<string, number>>({});
  // Track debounce timers per idea
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Listen for auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Load user's existing votes for these ideas
      const ideaIds = ideas.map((i) => i.id);
      const { data: userVotes } = await supabase
        .from("votes")
        .select("idea_id, value")
        .eq("created_by", user.id)
        .eq("scroll_id", scrollId)
        .eq("module_id", moduleId)
        .in("idea_id", ideaIds);

      if (userVotes && userVotes.length > 0) {
        const votesMap: Record<string, number> = {};
        userVotes.forEach((vote) => {
          votesMap[vote.idea_id] = Number(vote.value) || 0;
        });
        setEstimates(votesMap);
        originalValues.current = { ...votesMap };
      }
    };

    if (ideas.length > 0) {
      loadUserData();
    }
  }, [ideas, scrollId, moduleId]);

  // Load total estimates for all ideas and subscribe to changes
  useEffect(() => {
    const loadTotalEstimates = async () => {
      const ideaIds = ideas.map((i) => i.id);
      const { data: votes } = await supabase
        .from("votes")
        .select("idea_id, value")
        .eq("scroll_id", scrollId)
        .eq("module_id", moduleId)
        .in("idea_id", ideaIds);

      if (votes) {
        const totals: Record<string, { sum: number; count: number }> = {};
        votes.forEach((vote) => {
          const value = Number(vote.value) || 0;
          if (!totals[vote.idea_id]) {
            totals[vote.idea_id] = { sum: 0, count: 0 };
          }
          totals[vote.idea_id].sum += value;
          totals[vote.idea_id].count += 1;
        });
        setTotalEstimatesByIdea(totals);
      }
    };

    if (ideas.length > 0) {
      loadTotalEstimates();
    }

    // Subscribe to vote changes
    const channel = supabase
      .channel(`estimates:${scrollId}:${moduleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
          filter: `scroll_id=eq.${scrollId}`,
        },
        () => {
          loadTotalEstimates();
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
      Object.values(debounceTimers.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  // Actual DB save function
  const saveToDb = useCallback(
    async (ideaId: string, newValue: number, dbOriginalValue: number) => {
      if (!currentUserId) return;

      setSaving((prev) => new Set(prev).add(ideaId));

      try {
        let error = null;

        if (dbOriginalValue > 0) {
          // User already has a vote for this idea in DB
          if (newValue === 0) {
            // Delete the vote
            const result = await supabase
              .from("votes")
              .delete()
              .eq("created_by", currentUserId)
              .eq("scroll_id", scrollId)
              .eq("module_id", moduleId)
              .eq("idea_id", ideaId);
            error = result.error;
          } else {
            // Update the existing vote
            const result = await supabase
              .from("votes")
              .update({ value: newValue })
              .eq("created_by", currentUserId)
              .eq("scroll_id", scrollId)
              .eq("module_id", moduleId)
              .eq("idea_id", ideaId);
            error = result.error;
          }
        } else {
          // No existing vote in DB - insert new record
          if (newValue > 0) {
            const result = await supabase.from("votes").insert({
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
          console.error("Error saving estimate:", error);
          // Revert to original value on error
          setEstimates((prev) => ({
            ...prev,
            [ideaId]: dbOriginalValue,
          }));
        } else {
          // Update the original value to reflect what's now in DB
          originalValues.current[ideaId] = newValue;
        }
      } catch (error) {
        console.error("Error saving estimate:", error);
        // Revert to original value on error
        setEstimates((prev) => ({
          ...prev,
          [ideaId]: dbOriginalValue,
        }));
      } finally {
        setSaving((prev) => {
          const next = new Set(prev);
          next.delete(ideaId);
          return next;
        });
      }
    },
    [currentUserId, scrollId, moduleId]
  );

  // Schedule a debounced save for an idea
  const scheduleSave = useCallback(
    (ideaId: string, newValue: number) => {
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
    },
    [saveToDb]
  );

  const handleEstimateChange = (ideaId: string, value: number) => {
    const oldValue = estimates[ideaId] || 0;

    // Toggle off if clicking the same value
    const newValue = oldValue === value ? 0 : value;

    setEstimates((prev) => ({
      ...prev,
      [ideaId]: newValue,
    }));

    // Optimistically update totals
    const oldTotal = totalEstimatesByIdea[ideaId] || { sum: 0, count: 0 };
    const hadPreviousVote = (originalValues.current[ideaId] || 0) > 0;

    setTotalEstimatesByIdea((prev) => ({
      ...prev,
      [ideaId]: {
        sum: oldTotal.sum - oldValue + newValue,
        count: newValue > 0
          ? (hadPreviousVote ? oldTotal.count : oldTotal.count + 1)
          : (hadPreviousVote ? oldTotal.count - 1 : oldTotal.count),
      },
    }));

    scheduleSave(ideaId, newValue);
  };

  const getUnitLabel = () => {
    switch (estimateType) {
      case "hours":
        return "hours";
      case "days":
        return "days";
      case "points":
        return "story points";
      case "tshirt":
        return "t-shirt size";
      default:
        return "units";
    }
  };

  const getOptions = () => {
    switch (estimateType) {
      case "tshirt":
        return TSHIRT_SIZES;
      case "points":
        return FIBONACCI_POINTS.map((v) => ({ value: v, label: String(v) }));
      case "hours":
        return HOUR_OPTIONS.map((v) => ({ value: v, label: String(v) }));
      case "days":
        return DAY_OPTIONS.map((v) => ({ value: v, label: String(v) }));
      default:
        return HOUR_OPTIONS.map((v) => ({ value: v, label: String(v) }));
    }
  };

  const completedCount = Object.values(estimates).filter((v) => v > 0).length;
  const options = getOptions();

  // Count total estimates cast (votes from all users)
  const totalEstimatesCast = Object.values(totalEstimatesByIdea).reduce(
    (sum, item) => sum + item.count, 0
  );
  // Total possible = items * active users
  const totalPossible = ideas.length * activeUsersCount;
  const estimatesRemaining = totalPossible - totalEstimatesCast;

  return (
    <div className="work-estimate-view">
      <div className="work-estimate-header">
        <div className="work-estimate-instructions">
          <p>
            Estimate the effort required for each item in {getUnitLabel()}.
            You have estimated <strong>{completedCount}</strong> of <strong>{ideas.length}</strong> items.
          </p>
        </div>
        <div className="work-estimate-session-stats">
          <span className="session-stats-count">{totalEstimatesCast}</span>
          <span className="session-stats-label">estimated</span>
          {activeUsersCount > 0 && (
            <>
              <span className="session-stats-divider">|</span>
              <span className="session-stats-remaining">{estimatesRemaining}</span>
              <span className="session-stats-label">remaining</span>
            </>
          )}
        </div>
      </div>

      <div className="work-estimate-list">
        {ideas.map((idea) => {
          const currentValue = estimates[idea.id] || 0;
          const isSaving = saving.has(idea.id);
          const isEstimated = currentValue > 0;

          return (
            <div
              key={idea.id}
              className={`work-estimate-card ${isEstimated ? "estimated" : ""} ${isSaving ? "saving" : ""}`}
            >
              <div className="work-estimate-card-content">
                <p className="work-estimate-card-text">{idea.text}</p>
              </div>
              <div className="work-estimate-controls">
                <div className="options-selector">
                  {options.map((option) => {
                    const optionValue = typeof option === "object" ? option.value : option;
                    const optionLabel = typeof option === "object" ? option.label : String(option);
                    const optionTitle = typeof option === "object" && "description" in option
                      ? (option as { description: string }).description
                      : undefined;
                    return (
                      <button
                        key={optionValue}
                        className={`option-btn ${currentValue === optionValue ? "selected" : ""}`}
                        onClick={() => handleEstimateChange(idea.id, optionValue)}
                        title={optionTitle}
                      >
                        {optionLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

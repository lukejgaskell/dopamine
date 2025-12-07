import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import type { Idea } from "../../types/idea";
import type { ModuleConfig, ModuleResults } from "../../types/module";
import "./WorkEstimateView.css";

interface WorkEstimateViewProps {
  ideas: Idea[];
  scrollId: string;
  estimateType?: "hours" | "days" | "points" | "tshirt";
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

export function WorkEstimateView({
  ideas,
  scrollId,
  estimateType = "hours",
  moduleIndex: _moduleIndex,
  modules: _modules,
  userName: _userName,
  results: _results,
}: WorkEstimateViewProps) {
  const [estimates, setEstimates] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [allVotes, setAllVotes] = useState<Record<string, number[]>>({});

  // Listen for auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
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
        .in("idea_id", ideaIds);

      if (userVotes && userVotes.length > 0) {
        const votesMap: Record<string, number> = {};
        userVotes.forEach((vote) => {
          votesMap[vote.idea_id] = vote.value;
        });
        setEstimates(votesMap);
        setSubmitted(true);
      }
    };

    if (ideas.length > 0) {
      loadUserData();
    }
  }, [ideas, scrollId]);

  // Load all votes for calculating averages
  useEffect(() => {
    const loadAllVotes = async () => {
      const ideaIds = ideas.map((i) => i.id);
      const { data: votes } = await supabase
        .from("votes")
        .select("idea_id, value")
        .eq("scroll_id", scrollId)
        .in("idea_id", ideaIds);

      if (votes) {
        const votesByIdea: Record<string, number[]> = {};
        votes.forEach((vote) => {
          if (!votesByIdea[vote.idea_id]) {
            votesByIdea[vote.idea_id] = [];
          }
          votesByIdea[vote.idea_id].push(vote.value);
        });
        setAllVotes(votesByIdea);
      }
    };

    if (ideas.length > 0) {
      loadAllVotes();
    }

    // Subscribe to vote changes
    const channel = supabase
      .channel(`votes:${scrollId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
          filter: `scroll_id=eq.${scrollId}`,
        },
        () => {
          loadAllVotes();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [ideas, scrollId]);

  const handleEstimateChange = (ideaId: string, value: number) => {
    setEstimates((prev) => ({
      ...prev,
      [ideaId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (submitting || submitted || !currentUserId) return;
    if (Object.keys(estimates).length === 0) return;

    setSubmitting(true);
    try {
      // Convert estimates to vote records
      const voteRecords = Object.entries(estimates).map(([ideaId, value]) => ({
        created_by: currentUserId,
        scroll_id: scrollId,
        idea_id: ideaId,
        value: value,
      }));

      // Insert votes
      const { error } = await supabase.from("votes").insert(voteRecords);

      if (error) throw error;

      setSubmitted(true);
    } catch (error: any) {
      console.error("Error submitting estimates:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate average estimate for an idea
  const getAverageEstimate = (ideaId: string) => {
    const votes = allVotes[ideaId] || [];
    if (votes.length === 0) return 0;
    return votes.reduce((a, b) => a + b, 0) / votes.length;
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

  const renderEstimateInput = (ideaId: string) => {
    const currentValue = estimates[ideaId] || 0;

    if (estimateType === "tshirt") {
      return (
        <div className="tshirt-selector">
          {TSHIRT_SIZES.map((size) => (
            <button
              key={size.value}
              className={`tshirt-btn ${
                currentValue === size.value ? "selected" : ""
              }`}
              onClick={() => handleEstimateChange(ideaId, size.value)}
              title={size.description}
            >
              {size.label}
            </button>
          ))}
        </div>
      );
    }

    if (estimateType === "points") {
      return (
        <div className="points-selector">
          {FIBONACCI_POINTS.map((point) => (
            <button
              key={point}
              className={`point-option ${
                currentValue === point ? "selected" : ""
              }`}
              onClick={() => handleEstimateChange(ideaId, point)}
            >
              {point}
            </button>
          ))}
        </div>
      );
    }

    // Hours or Days - numeric input
    return (
      <div className="numeric-estimate">
        <input
          type="number"
          min="0"
          max={estimateType === "hours" ? 1000 : 365}
          step={estimateType === "hours" ? 0.5 : 0.5}
          value={currentValue || ""}
          onChange={(e) =>
            handleEstimateChange(ideaId, parseFloat(e.target.value) || 0)
          }
          placeholder="0"
        />
        <span className="unit-label">{estimateType}</span>
      </div>
    );
  };

  const completedCount = Object.values(estimates).filter((v) => v > 0).length;

  const formatEstimate = (value: number) => {
    if (estimateType === "tshirt") {
      const size = TSHIRT_SIZES.find((s) => s.value === value);
      return size ? size.label : value;
    }
    return value;
  };

  if (submitted) {
    return (
      <div className="work-estimate-view">
        <div className="vote-submitted">
          <div className="submitted-icon">✓</div>
          <h3>Estimates Submitted!</h3>
          <p>Your work estimates have been recorded.</p>
        </div>
        <div className="work-estimate-list">
          {ideas.map((idea) => {
            const userEstimate = estimates[idea.id] || 0;
            return (
              <div
                key={idea.id}
                className={`work-estimate-card ${
                  userEstimate > 0 ? "estimated" : ""
                }`}
              >
                <div className="work-estimate-card-content">
                  <p className="work-estimate-card-text">{idea.text}</p>
                </div>
                <div className="estimate-results">
                  <div className="your-estimate">
                    <span className="estimate-value">
                      {formatEstimate(userEstimate)}
                    </span>
                    <span className="estimate-label">Yours</span>
                  </div>
                  <div className="avg-estimate">
                    <span className="avg-value">
                      {estimateType === "tshirt"
                        ? formatEstimate(
                            Math.round(getAverageEstimate(idea.id))
                          )
                        : getAverageEstimate(idea.id).toFixed(1)}
                    </span>
                    <span className="avg-label">Avg</span>
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
    <div className="work-estimate-view">
      <div className="work-estimate-header">
        <p className="work-estimate-instructions">
          Estimate the effort required for each item in {getUnitLabel()}.
        </p>
        <div className="estimate-progress">
          <span className="progress-count">{completedCount}</span>
          <span className="progress-total">/ {ideas.length} estimated</span>
        </div>
      </div>

      <div className="work-estimate-list">
        {ideas.map((idea) => (
          <div key={idea.id} className="work-estimate-card">
            <div className="work-estimate-card-content">
              <p className="work-estimate-card-text">{idea.text}</p>
            </div>
            <div className="work-estimate-input">
              {renderEstimateInput(idea.id)}
            </div>
          </div>
        ))}
      </div>

      <div className="work-estimate-submit">
        <button
          className="submit-estimates-btn"
          onClick={handleSubmit}
          disabled={submitting || completedCount === 0}
        >
          {submitting ? "Submitting..." : "Submit Estimates"}
        </button>
      </div>
    </div>
  );
}

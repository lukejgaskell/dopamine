import { useState, useEffect } from "react";
import { supabase } from '../../../../lib/supabase';
import type { Idea } from '../../../../types/idea';
import type { ModuleConfig, ModuleResults } from '../../../../types/module';
import "./WorkEstimateView.css";

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
  const [estimates, setEstimates] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
          votesMap[vote.idea_id] = vote.value;
        });
        setEstimates(votesMap);
      }
    };

    if (ideas.length > 0) {
      loadUserData();
    }
  }, [ideas, scrollId, moduleId]);

  const handleEstimateChange = (ideaId: string, value: number) => {
    setEstimates((prev) => ({
      ...prev,
      [ideaId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (submitting || !currentUserId) return;
    if (Object.keys(estimates).length === 0) return;

    setSubmitting(true);
    try {
      // Convert estimates to vote records
      const voteRecords = Object.entries(estimates).map(([ideaId, value]) => ({
        created_by: currentUserId,
        scroll_id: scrollId,
        idea_id: ideaId,
        module_id: moduleId,
        value: value,
      }));

      // Insert votes
      const { error } = await supabase.from("votes").insert(voteRecords);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error submitting estimates:", error);
    } finally {
      setSubmitting(false);
    }
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

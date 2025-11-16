import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Idea } from "../types/idea";
import type { ModuleConfig, ModuleResults } from "../types/module";
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

export default function WorkEstimateView({
  ideas,
  scrollId,
  estimateType = "hours",
  moduleIndex,
  modules: _modules,
  userName,
  results,
}: WorkEstimateViewProps) {
  const [estimates, setEstimates] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Check if user already estimated
  useEffect(() => {
    if (results?.estimates?.[userName]) {
      setEstimates(results.estimates[userName]);
      setSubmitted(true);
    }
  }, [results, userName]);

  const handleEstimateChange = (ideaId: string, value: number) => {
    setEstimates((prev) => ({
      ...prev,
      [ideaId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (submitting || submitted) return;
    if (Object.keys(estimates).length === 0) return;

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
      const allEstimates = currentResults.estimates || {};

      allEstimates[userName] = estimates;

      updatedModules[moduleIndex] = {
        ...updatedModules[moduleIndex],
        results: { ...currentResults, estimates: allEstimates },
      };

      await supabase
        .from("scrolls")
        .update({ modules: updatedModules })
        .eq("id", scrollId);

      setSubmitted(true);
    } catch (error: any) {
      console.error("Error submitting estimates:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate average estimate for an idea
  const getAverageEstimate = (ideaId: string) => {
    if (!results?.estimates) return 0;
    const allEstimates = Object.values(results.estimates);
    const estimatesForIdea = allEstimates
      .map((userEstimates) => userEstimates[ideaId])
      .filter((e) => e !== undefined);
    if (estimatesForIdea.length === 0) return 0;
    return estimatesForIdea.reduce((a, b) => a + b, 0) / estimatesForIdea.length;
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
              className={`tshirt-btn ${currentValue === size.value ? "selected" : ""}`}
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
              className={`point-option ${currentValue === point ? "selected" : ""}`}
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
          onChange={(e) => handleEstimateChange(ideaId, parseFloat(e.target.value) || 0)}
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
              <div key={idea.id} className={`work-estimate-card ${userEstimate > 0 ? "estimated" : ""}`}>
                <div className="work-estimate-card-content">
                  <p className="work-estimate-card-text">{idea.text}</p>
                </div>
                <div className="estimate-results">
                  <div className="your-estimate">
                    <span className="estimate-value">{formatEstimate(userEstimate)}</span>
                    <span className="estimate-label">Yours</span>
                  </div>
                  <div className="avg-estimate">
                    <span className="avg-value">
                      {estimateType === "tshirt"
                        ? formatEstimate(Math.round(getAverageEstimate(idea.id)))
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

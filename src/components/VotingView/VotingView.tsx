import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import type { Idea } from "../../types/idea";
import type { ModuleConfig, ModuleResults } from "../../types/module";
import "./VotingView.css";

interface VotingViewProps {
  ideas: Idea[];
  scrollId: string;
  moduleIndex: number;
  modules: ModuleConfig[];
  userName: string;
  results?: ModuleResults;
}

export function VotingView({
  ideas,
  scrollId,
  moduleIndex,
  modules: _modules,
  userName,
  results,
}: VotingViewProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  // Check if user already rated
  useEffect(() => {
    if (results?.ratings?.[userName]) {
      setRatings(results.ratings[userName]);
      setSubmitted(true);
    }
  }, [results, userName]);

  const handleRating = (ideaId: string, rating: number) => {
    if (submitted) return;
    setRatings((prev) => ({
      ...prev,
      [ideaId]: rating,
    }));
  };

  const handleSubmit = async () => {
    if (Object.keys(ratings).length === 0) return;

    // Fetch fresh scroll data to avoid race conditions
    const { data: freshScroll } = await supabase
      .from("scrolls")
      .select("modules")
      .eq("id", scrollId)
      .single();

    if (!freshScroll) return;

    const updatedModules = [...freshScroll.modules];
    const currentResults = updatedModules[moduleIndex].results || {};
    const allRatings = currentResults.ratings || {};

    allRatings[userName] = ratings;

    updatedModules[moduleIndex] = {
      ...updatedModules[moduleIndex],
      results: { ...currentResults, ratings: allRatings },
    };

    await supabase
      .from("scrolls")
      .update({ modules: updatedModules })
      .eq("id", scrollId);

    setSubmitted(true);
  };

  // Calculate average rating for an idea
  const getAverageRating = (ideaId: string) => {
    if (!results?.ratings) return 0;
    const allRatings = Object.values(results.ratings);
    const ratingsForIdea = allRatings
      .map((userRatings) => userRatings[ideaId])
      .filter((r) => r !== undefined);
    if (ratingsForIdea.length === 0) return 0;
    return ratingsForIdea.reduce((a, b) => a + b, 0) / ratingsForIdea.length;
  };

  const sortedIdeas = [...ideas].sort(
    (a, b) => getAverageRating(b.id) - getAverageRating(a.id)
  );

  const ratedCount = Object.keys(ratings).length;

  if (submitted) {
    return (
      <div className="voting-view">
        <div className="vote-submitted-header">
          <div className="submitted-icon">✓</div>
          <h3>Ratings Submitted!</h3>
        </div>
        <div className="voting-list">
          {sortedIdeas.map((idea) => (
            <div key={idea.id} className="voting-card voted">
              <div className="voting-card-content">
                <p className="voting-card-text">{idea.text}</p>
              </div>
              <div className="voting-card-rating">
                <div className="rating-submitted">
                  <span className="rating-value">{ratings[idea.id] || "-"}</span>
                  <span className="rating-label">Your rating</span>
                </div>
                <div className="rating-average">
                  <span className="avg-value">{getAverageRating(idea.id).toFixed(1)}</span>
                  <span className="avg-label">Avg</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="voting-view">
      <div className="voting-instructions">
        <p>Rate each idea from 1 to 5 ({ratedCount}/{ideas.length} rated)</p>
      </div>
      <div className="voting-list">
        {sortedIdeas.map((idea) => (
          <div
            key={idea.id}
            className={`voting-card ${ratings[idea.id] ? "rated" : ""}`}
          >
            <div className="voting-card-content">
              <p className="voting-card-text">{idea.text}</p>
            </div>
            <div className="voting-card-rating">
              <div className="rating-buttons">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    className={`rating-button ${ratings[idea.id] === rating ? "selected" : ""}`}
                    onClick={() => handleRating(idea.id, rating)}
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="voting-submit">
        <button
          className="submit-ratings-btn"
          onClick={handleSubmit}
          disabled={ratedCount === 0}
        >
          Submit Ratings
        </button>
      </div>
    </div>
  );
}

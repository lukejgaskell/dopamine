import { useState, useEffect } from "react";
import { supabase } from '../../../../lib/supabase';
import type { Idea } from '../../../../types/idea';
import type { ModuleConfig, ModuleResults } from '../../../../types/module';
import "./VotingView.css";

type VotingViewProps = {
  ideas: Idea[];
  scrollId: string;
  moduleId: string;
  moduleIndex: number;
  modules: ModuleConfig[];
  userName: string;
  results?: ModuleResults;
}

export function VotingView({
  ideas,
  scrollId,
  moduleId,
  moduleIndex: _moduleIndex,
  modules: _modules,
  userName: _userName,
  results: _results,
}: VotingViewProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [allRatings, setAllRatings] = useState<Record<string, number[]>>({});

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

  // Get current user ID and load their existing ratings
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
        const ratingsMap: Record<string, number> = {};
        userVotes.forEach(vote => {
          ratingsMap[vote.idea_id] = vote.value;
        });
        setRatings(ratingsMap);
      }
    };

    if (ideas.length > 0) {
      loadUserData();
    }
  }, [ideas, scrollId, moduleId]);

  // Load all ratings for calculating averages
  useEffect(() => {
    const loadAllRatings = async () => {
      const ideaIds = ideas.map(i => i.id);
      const { data: votes } = await supabase
        .from('votes')
        .select('idea_id, value')
        .eq('scroll_id', scrollId)
        .eq('module_id', moduleId)
        .in('idea_id', ideaIds);

      if (votes) {
        const ratingsByIdea: Record<string, number[]> = {};
        votes.forEach(vote => {
          if (!ratingsByIdea[vote.idea_id]) {
            ratingsByIdea[vote.idea_id] = [];
          }
          ratingsByIdea[vote.idea_id].push(vote.value);
        });
        setAllRatings(ratingsByIdea);
      }
    };

    if (ideas.length > 0) {
      loadAllRatings();
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
          loadAllRatings();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [ideas, scrollId, moduleId]);

  const handleRating = (ideaId: string, rating: number) => {
    setRatings((prev) => ({
      ...prev,
      [ideaId]: rating,
    }));
  };

  const handleSubmit = async () => {
    if (Object.keys(ratings).length === 0 || !currentUserId) return;

    // Convert ratings to vote records
    const voteRecords = Object.entries(ratings).map(([ideaId, value]) => ({
      created_by: currentUserId,
      scroll_id: scrollId,
      idea_id: ideaId,
      module_id: moduleId,
      value: value,
    }));

    // Insert votes
    await supabase
      .from('votes')
      .insert(voteRecords);
  };

  // Calculate average rating for an idea
  const getAverageRating = (ideaId: string) => {
    const ratingsForIdea = allRatings[ideaId] || [];
    if (ratingsForIdea.length === 0) return 0;
    return ratingsForIdea.reduce((a, b) => a + b, 0) / ratingsForIdea.length;
  };

  const sortedIdeas = [...ideas].sort(
    (a, b) => getAverageRating(b.id) - getAverageRating(a.id)
  );

  const ratedCount = Object.keys(ratings).length;

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

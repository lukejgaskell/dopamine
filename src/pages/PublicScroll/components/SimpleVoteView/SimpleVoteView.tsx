import { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import type { Idea } from '@/types/idea';
import type { ModuleConfig, ModuleResults } from '@/types/module';
import { useScrollContext } from '../../context';
import "./SimpleVoteView.css";

type SimpleVoteViewProps = {
  ideas: Idea[];
  scrollId: string;
  maxVotes?: number;
  moduleId: string;
  moduleIndex: number;
  modules: ModuleConfig[];
  userName: string;
  results?: ModuleResults;
}

export function SimpleVoteView({
  ideas,
  scrollId,
  maxVotes = 3,
  moduleId,
  moduleIndex: _moduleIndex,
  modules: _modules,
  userName: _userName,
  results: _results,
}: SimpleVoteViewProps) {
  const { activeUsersCount } = useScrollContext();
  const [userVoteCount, setUserVoteCount] = useState(0);
  const [userVotesPerIdea, setUserVotesPerIdea] = useState<Record<string, number>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [totalVotesCast, setTotalVotesCast] = useState(0);
  const [voting, setVoting] = useState(false);

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

      // Load user's existing votes for these ideas (count per idea)
      const ideaIds = ideas.map(i => i.id);
      const { data: userVotes } = await supabase
        .from('votes')
        .select('idea_id')
        .eq('created_by', user.id)
        .eq('scroll_id', scrollId)
        .eq('module_id', moduleId)
        .in('idea_id', ideaIds);

      if (userVotes && userVotes.length > 0) {
        const votesPerIdea: Record<string, number> = {};
        userVotes.forEach(v => {
          votesPerIdea[v.idea_id] = (votesPerIdea[v.idea_id] || 0) + 1;
        });
        setUserVotesPerIdea(votesPerIdea);
        setUserVoteCount(userVotes.length);
      }
    };

    if (ideas.length > 0) {
      loadUserData();
    }
  }, [ideas, scrollId, moduleId]);

  // Load vote counts for all ideas
  useEffect(() => {
    const loadVoteCounts = async () => {
      const ideaIds = ideas.map(i => i.id);
      const { data: votes } = await supabase
        .from('votes')
        .select('idea_id')
        .eq('scroll_id', scrollId)
        .eq('module_id', moduleId)
        .in('idea_id', ideaIds);

      if (votes) {
        const counts: Record<string, number> = {};
        votes.forEach(vote => {
          counts[vote.idea_id] = (counts[vote.idea_id] || 0) + 1;
        });
        setVoteCounts(counts);
        setTotalVotesCast(votes.length);
      }
    };

    if (ideas.length > 0) {
      loadVoteCounts();
    }

    // Subscribe to vote changes
    const channel = supabase
      .channel(`votes:${scrollId}:${moduleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `scroll_id=eq.${scrollId}`,
        },
        () => {
          loadVoteCounts();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [ideas, scrollId, moduleId]);

  const handleVote = async (ideaId: string) => {
    if (!currentUserId) return;
    if (userVoteCount >= maxVotes) return;
    if (voting) return;

    setVoting(true);

    // Optimistically update UI
    setUserVoteCount(prev => prev + 1);
    setUserVotesPerIdea(prev => ({
      ...prev,
      [ideaId]: (prev[ideaId] || 0) + 1
    }));
    setVoteCounts(prev => ({
      ...prev,
      [ideaId]: (prev[ideaId] || 0) + 1
    }));

    try {
      // Insert the vote immediately
      const { error } = await supabase
        .from('votes')
        .insert({
          created_by: currentUserId,
          scroll_id: scrollId,
          idea_id: ideaId,
          module_id: moduleId,
          value: 1,
        });

      if (error) throw error;
    } catch (error) {
      // Revert optimistic update on error
      console.error('Error casting vote:', error);
      setUserVoteCount(prev => prev - 1);
      setUserVotesPerIdea(prev => ({
        ...prev,
        [ideaId]: Math.max((prev[ideaId] || 1) - 1, 0)
      }));
      setVoteCounts(prev => ({
        ...prev,
        [ideaId]: Math.max((prev[ideaId] || 1) - 1, 0)
      }));
    } finally {
      setVoting(false);
    }
  };

  const getVoteCount = (ideaId: string) => {
    return voteCounts[ideaId] || 0;
  };

  const getUserVotesForIdea = (ideaId: string) => {
    return userVotesPerIdea[ideaId] || 0;
  };

  const sortedIdeas = [...ideas].sort(
    (a, b) => getVoteCount(b.id) - getVoteCount(a.id)
  );
  const remainingVotes = maxVotes - userVoteCount;
  const totalPossibleVotes = activeUsersCount * maxVotes;
  const remainingSessionVotes = totalPossibleVotes - totalVotesCast;

  return (
    <div className="simple-vote-view">
      <div className="vote-header">
        <div className="vote-instructions">
          <p>
            Click to vote for your favorites. You have{" "}
            <strong>{remainingVotes}</strong> vote{remainingVotes !== 1 ? "s" : ""}{" "}
            remaining.
          </p>
        </div>
        <div className="vote-session-stats">
          <span className="session-votes-count">{totalVotesCast}</span>
          <span className="session-votes-label">votes cast</span>
          {activeUsersCount > 0 && (
            <>
              <span className="session-votes-divider">|</span>
              <span className="session-votes-remaining">{remainingSessionVotes}</span>
              <span className="session-votes-label">remaining</span>
            </>
          )}
        </div>
      </div>
      <div className="simple-vote-list">
        {sortedIdeas.map((idea) => {
          const userVotes = getUserVotesForIdea(idea.id);
          const hasVoted = userVotes > 0;
          return (
            <div
              key={idea.id}
              className={`simple-vote-card ${hasVoted ? "voted" : ""} ${
                remainingVotes === 0 ? "disabled" : ""
              }`}
              onClick={() => handleVote(idea.id)}
            >
              <div className="simple-vote-card-content">
                <p className="simple-vote-card-text">{idea.text}</p>
              </div>
              <div className="simple-vote-card-action">
                {hasVoted ? (
                  <span className="vote-checkmark">+{userVotes}</span>
                ) : (
                  <span className="vote-icon">+1</span>
                )}
              </div>
              <div className="simple-vote-count">
                <span className="count-number">{getVoteCount(idea.id)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

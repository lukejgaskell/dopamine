import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useUserStore } from "../store/userStore";
import type { Scroll } from "../types/scroll";
import type { Idea } from "../types/idea";
import type { RealtimeChannel } from "@supabase/supabase-js";
import NamePrompt from "./NamePrompt";
import ActiveUsers from "./ActiveUsers";
import NewIdeaForm from "./NewIdeaForm";
import IdeaCard from "./IdeaCard";
import VotingView from "./VotingView";
import ResultsView from "./ResultsView";
import Logo from "./Logo";
import "./PublicScroll.css";

export default function PublicScroll() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const key = searchParams.get("key");

  const { name, setName } = useUserStore();
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [scroll, setScroll] = useState<Scroll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const fetchScroll = async () => {
      if (!id || !key) {
        setError("Invalid scroll link");
        setLoading(false);
        return;
      }

      try {
        // Get current session to check if user is owner
        const { data: sessionData } = await supabase.auth.getSession();

        const { data, error } = await supabase
          .from("scrolls")
          .select("*")
          .eq("id", id)
          .eq("key", key)
          .in("status", ["active"])
          .single();

        if (error) throw error;

        if (!data) {
          setError("Scroll not found or not active");
        } else {
          setScroll(data);
          // Check if current user is the owner
          if (sessionData?.session?.user?.id === data.user_id) {
            setIsOwner(true);
          }
        }
      } catch (error: any) {
        setError("Scroll not found or not active");
      } finally {
        setLoading(false);
      }
    };

    fetchScroll();
  }, [id, key]);

  useEffect(() => {
    // Show name prompt if user doesn't have a name and scroll is loaded
    if (!name && scroll && !loading) {
      setShowNamePrompt(true);
    }
  }, [name, scroll, loading]);

  // Fetch initial ideas
  useEffect(() => {
    if (!id || !scroll) return;

    const fetchIdeas = async () => {
      const { data, error } = await supabase
        .from("ideas")
        .select("*")
        .eq("scroll_id", id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setIdeas(data);
      }
    };

    fetchIdeas();
  }, [id, scroll]);

  // Set up real-time subscription for ideas
  useEffect(() => {
    if (!id || !scroll) return;

    const ideasChannel = supabase
      .channel(`ideas:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ideas",
          filter: `scroll_id=eq.${id}`,
        },
        (payload) => {
          setIdeas((current) => [payload.new as Idea, ...current]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ideas",
          filter: `scroll_id=eq.${id}`,
        },
        (payload) => {
          setIdeas((current) =>
            current.map((idea) =>
              idea.id === payload.new.id ? (payload.new as Idea) : idea
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "ideas",
          filter: `scroll_id=eq.${id}`,
        },
        (payload) => {
          setIdeas((current) =>
            current.filter((idea) => idea.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      ideasChannel.unsubscribe();
    };
  }, [id, scroll]);

  // Set up real-time subscription for scroll step changes
  useEffect(() => {
    if (!id || !scroll) return;

    const scrollChannel = supabase
      .channel(`scroll-updates:${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "scrolls",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setScroll(payload.new as Scroll);
        }
      )
      .subscribe();

    return () => {
      scrollChannel.unsubscribe();
    };
  }, [id, scroll]);

  // Set up real-time presence
  useEffect(() => {
    if (!id || !name || !scroll) return;

    const scrollChannel = supabase.channel(`scroll:${id}`, {
      config: {
        presence: {
          key: name,
        },
      },
    });

    scrollChannel
      .on("presence", { event: "sync" }, () => {
        const state = scrollChannel.presenceState();
        const users = Object.keys(state).map((key) => {
          const presence = state[key];
          return (presence[0] as any)?.name || key;
        });
        setActiveUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await scrollChannel.track({ name });
        }
      });

    setChannel(scrollChannel);

    return () => {
      scrollChannel.unsubscribe();
    };
  }, [id, name, scroll]);

  const handleNameSubmit = async (submittedName: string) => {
    setName(submittedName);
    setShowNamePrompt(false);

    // Update presence with new name
    if (channel && submittedName) {
      await channel.track({ name: submittedName });
    }
  };

  if (loading) {
    return (
      <div className="public-scroll-container">
        <div className="public-scroll-loading">Loading scroll...</div>
      </div>
    );
  }

  if (error || !scroll) {
    return (
      <div className="public-scroll-container">
        <div className="public-scroll-error">
          <h2>Scroll Not Found</h2>
          <p>{error || "This scroll is not available"}</p>
        </div>
      </div>
    );
  }

  const handleNameClick = () => {
    setShowNamePrompt(true);
  };

  const handleCancelNameChange = () => {
    setShowNamePrompt(false);
  };

  const handleContinueToVoting = async () => {
    if (!scroll || !isOwner) return;

    setTransitioning(true);
    try {
      const { error } = await supabase
        .from("scrolls")
        .update({ step: "voting" })
        .eq("id", scroll.id);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error transitioning to voting:", error);
    } finally {
      setTransitioning(false);
    }
  };

  const handleCompleteVoting = async () => {
    if (!scroll || !isOwner) return;

    setCompleting(true);
    try {
      const { error } = await supabase
        .from("scrolls")
        .update({ step: "results" })
        .eq("id", scroll.id);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error completing voting:", error);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="public-scroll-container">
      {showNamePrompt && (
        <NamePrompt
          onSubmit={handleNameSubmit}
          onCancel={name ? handleCancelNameChange : undefined}
          initialName={name || ""}
        />
      )}

      {name && activeUsers.length > 0 && (
        <ActiveUsers users={activeUsers} currentUserName={name} />
      )}

      {name && (
        <div className="public-scroll-user-info" onClick={handleNameClick}>
          <span className="public-scroll-user-name">{name}</span>
        </div>
      )}

      <header className="public-scroll-header">
        <div className="public-scroll-header-left">
          <Logo size="small" />
        </div>
        <div className="public-scroll-header-center">
          <h1 className="public-scroll-title">{scroll.name}</h1>
        </div>
        <div className="public-scroll-header-right">
          {isOwner && scroll.step !== "voting" && scroll.step !== "results" && (
            <button
              className="continue-voting-btn"
              onClick={handleContinueToVoting}
              disabled={transitioning}
            >
              {transitioning ? "Transitioning..." : "Continue to Voting"}
            </button>
          )}
          {isOwner && scroll.step === "voting" && (
            <button
              className="continue-voting-btn"
              onClick={handleCompleteVoting}
              disabled={completing}
            >
              {completing ? "Completing..." : "Complete"}
            </button>
          )}
        </div>
      </header>

      {scroll.step === "voting" ? (
        <VotingView ideas={ideas} scrollId={scroll.id} />
      ) : scroll.step === "results" ? (
        <ResultsView ideas={ideas} />
      ) : (
        <>
          <div className="public-scroll-canvas">
            {ideas.length === 0 ? (
              <div className="ideas-empty">
                <p>No ideas yet. Be the first to share one!</p>
              </div>
            ) : (
              ideas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)
            )}
          </div>

          {name && (
            <div className="new-idea-fixed">
              <NewIdeaForm scrollId={scroll.id} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

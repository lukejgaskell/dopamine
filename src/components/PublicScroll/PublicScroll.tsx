import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from "../../lib/supabase";
import { useUserStore } from "../../store/userStore";
import type { Scroll } from "../../types/scroll";
import type { Idea } from "../../types/idea";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { NamePrompt } from "../NamePrompt";
import { ActiveUsers } from "../ActiveUsers";
import { ModuleRenderer } from "../ModuleRenderer";
import { ModuleTimer } from "../ModuleTimer";
import { Logo } from "../Logo";
import { ScrollResults } from "../ScrollResults";
import "./PublicScroll.css";

export function PublicScroll() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const key = searchParams.get("key");
  const navigate = useNavigate();

  const { name, setName } = useUserStore();
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [scroll, setScroll] = useState<Scroll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const fetchScrollData = async () => {
    if (!id || !key) {
      setError("Invalid scroll link");
      setLoading(false);
      return;
    }

    try {
      // Get current session to check if user is owner/authenticated
      const { data: sessionData } = await supabase.auth.getSession();

      // Set authenticated state
      if (sessionData?.session?.user) {
        setIsAuthenticated(true);
      }

      const { data, error } = await supabase
        .from("scrolls")
        .select("*")
        .eq("id", id)
        .eq("key", key)
        .in("status", ["draft", "active", "completed"])
        .single();

      if (error) throw error;

      if (!data) {
        setError("Scroll not found or not active");
      } else {
        setScroll(data);
        // Check if current user is the owner
        // For draft scrolls, assume the visitor is the owner
        if (data.status === 'draft' || sessionData?.session?.user?.id === data.user_id) {
          setIsOwner(true);
        }
        // Initialize current module from step if it's a number
        if (data.step && !isNaN(parseInt(data.step))) {
          const stepIndex = parseInt(data.step);
          setCurrentModuleIndex(stepIndex);
          // If step is set (session has started), skip intro
          setShowIntro(false);
        }
      }
    } catch (error: any) {
      setError("Scroll not found or not active");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScrollData();
  }, [id, key]);

  useEffect(() => {
    // Show name prompt if user doesn't have a name and scroll is loaded
    // Skip if user is the owner - they'll be "host"
    if (!name && scroll && !loading && !isOwner) {
      setShowNamePrompt(true);
    }
  }, [name, scroll, loading, isOwner]);

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
          const updatedScroll = payload.new as Scroll;
          setScroll(updatedScroll);
          // Update current module index from step
          if (updatedScroll.step && !isNaN(parseInt(updatedScroll.step))) {
            setCurrentModuleIndex(parseInt(updatedScroll.step));
          }
        }
      )
      .subscribe();

    return () => {
      scrollChannel.unsubscribe();
    };
  }, [id, scroll]);

  // Set up real-time presence
  useEffect(() => {
    if (!id || !scroll) return;

    // Determine the display name for presence
    const displayName = isOwner ? "host" : name;
    if (!displayName) return;

    const scrollChannel = supabase.channel(`scroll:${id}`, {
      config: {
        presence: {
          key: displayName,
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
          await scrollChannel.track({ name: displayName });
        }
      });

    setChannel(scrollChannel);

    return () => {
      scrollChannel.unsubscribe();
    };
  }, [id, name, scroll, isOwner]);

  const handleNameSubmit = async (submittedName: string) => {
    setName(submittedName);
    setShowNamePrompt(false);

    // Update presence with new name
    if (channel && submittedName) {
      await channel.track({ name: submittedName });
    }
  };

  // Get the display name for the current user
  const currentUserDisplayName = isOwner ? "host" : name;

  const handleNextModule = async () => {
    if (!scroll || !isOwner || !scroll.modules) return;

    const nextIndex = currentModuleIndex + 1;
    if (nextIndex >= scroll.modules.length) return;

    setTransitioning(true);
    try {
      const { error } = await supabase
        .from("scrolls")
        .update({ step: nextIndex.toString() })
        .eq("id", scroll.id);

      if (error) throw error;
      setCurrentModuleIndex(nextIndex);
    } catch (error: any) {
      console.error("Error advancing module:", error);
    } finally {
      setTransitioning(false);
    }
  };

  const handlePrevModule = async () => {
    if (!scroll || !isOwner || currentModuleIndex <= 0) return;

    const prevIndex = currentModuleIndex - 1;

    setTransitioning(true);
    try {
      const { error } = await supabase
        .from("scrolls")
        .update({ step: prevIndex.toString() })
        .eq("id", scroll.id);

      if (error) throw error;
      setCurrentModuleIndex(prevIndex);
    } catch (error: any) {
      console.error("Error going back:", error);
    } finally {
      setTransitioning(false);
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

  const currentModule = scroll.modules?.[currentModuleIndex];
  const hasNextModule = scroll.modules && currentModuleIndex < scroll.modules.length - 1;
  const hasPrevModule = currentModuleIndex > 0;
  const hasTimer = currentModule?.type === 'brainstorm' && (currentModule as any).timeLimit;

  const handleShowResults = async () => {
    // Refresh scroll data to get latest results before showing
    console.log('Before refresh - scroll modules:', scroll?.modules);
    await fetchScrollData();
    console.log('After refresh - scroll modules:', scroll?.modules);
    setShowResults(true);
  };

  const handleCompleteSession = async () => {
    if (!scroll || !isOwner) return;

    setTransitioning(true);
    try {
      const { error } = await supabase
        .from("scrolls")
        .update({ status: "completed" })
        .eq("id", scroll.id);

      if (error) throw error;

      // Show results after completing
      await fetchScrollData();
      setShowResults(true);
    } catch (error: any) {
      console.error("Error completing session:", error);
    } finally {
      setTransitioning(false);
    }
  };

  const getShareableLink = () => {
    if (!scroll?.key) return null;
    const baseUrl = window.location.origin;
    return `${baseUrl}/scroll/${scroll.id}?key=${scroll.key}`;
  };

  const handleCopyLink = () => {
    const link = getShareableLink();
    if (link) {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyQR = async () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        canvas.toBlob(async (blob) => {
          if (blob) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            setQrCopied(true);
            setTimeout(() => setQrCopied(false), 2000);
          }
        }, 'image/png');
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    } catch (err) {
      console.error('Failed to copy QR code:', err);
    }
  };

  const handleDownloadQR = () => {
    if (!qrRef.current || !scroll) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      const link = document.createElement('a');
      link.download = `${scroll.name.replace(/\s+/g, '-')}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleActivateLinks = async () => {
    if (!scroll) return;

    setTransitioning(true);
    try {
      // Set scroll status to active
      const { error } = await supabase
        .from("scrolls")
        .update({ status: "active" })
        .eq("id", scroll.id);

      if (error) throw error;

      // Refresh scroll data to get updated status
      await fetchScrollData();
    } catch (error: any) {
      console.error("Error activating links:", error);
      alert("Failed to activate links: " + error.message);
    } finally {
      setTransitioning(false);
    }
  };

  const handleStartSession = async () => {
    if (!scroll) return;

    setTransitioning(true);
    try {
      // Set step to "0" to mark that session has started
      const { error } = await supabase
        .from("scrolls")
        .update({ step: "0" })
        .eq("id", scroll.id);

      if (error) throw error;
      setShowIntro(false);
    } catch (error: any) {
      console.error("Error starting session:", error);
    } finally {
      setTransitioning(false);
    }
  };

  // Show intro view
  if (showIntro && scroll.modules && scroll.modules.length > 0) {
    return (
      <div className="public-scroll-container">
        <header className="public-scroll-header">
          <div className="public-scroll-header-left">
            <Logo size="small" />
          </div>
          <div className="public-scroll-header-center">
            <h1 className="public-scroll-title">{scroll.name}</h1>
          </div>
          <div className="public-scroll-header-right">
            {isAuthenticated && (
              <button
                className="dashboard-link-button"
                onClick={() => navigate('/')}
              >
                ← Dashboard
              </button>
            )}
          </div>
        </header>
        <main className="public-scroll-main">
          <div className="intro-container">
            <div className="intro-content">
              <h2>Welcome!</h2>
              <p>This session has {scroll.modules.length} {scroll.modules.length === 1 ? 'module' : 'modules'}.</p>

              {isOwner && scroll.key && (
                <div className="intro-share-section">
                  <h3>Share this session</h3>
                  <div className="share-link-group">
                    <label>Public Link</label>
                    <div className="share-link-row">
                      <input
                        type="text"
                        value={getShareableLink() || ''}
                        readOnly
                        className="share-link-input"
                        onClick={(e) => e.currentTarget.select()}
                      />
                      <button
                        onClick={handleCopyLink}
                        className="copy-link-btn"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="qr-code-section">
                    <div className="qr-code-box" ref={qrRef}>
                      <QRCodeSVG
                        value={getShareableLink() || ''}
                        size={160}
                        level="M"
                        includeMargin={true}
                      />
                    </div>
                    <div className="qr-actions">
                      <button onClick={handleCopyQR} className="qr-btn">
                        {qrCopied ? 'Copied!' : 'Copy QR'}
                      </button>
                      <button onClick={handleDownloadQR} className="qr-btn">
                        Download PNG
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <button
                className="start-session-button"
                onClick={scroll.status === 'draft' ? handleActivateLinks : handleStartSession}
                disabled={transitioning}
              >
                {transitioning
                  ? (scroll.status === 'draft' ? 'Activating...' : 'Starting...')
                  : (scroll.status === 'draft' ? 'Activate Links' : 'Start Session')
                }
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show results view
  if (showResults && scroll.modules) {
    return (
      <div className="public-scroll-container">
        <header className="public-scroll-header">
          <div className="public-scroll-header-left">
            <Logo size="small" />
          </div>
          <div className="public-scroll-header-center">
            <h1 className="public-scroll-title">{scroll.name}</h1>
            <div className="module-indicator">Results</div>
          </div>
          <div className="public-scroll-header-right">
            {isAuthenticated && (
              <button
                className="dashboard-link-button"
                onClick={() => navigate('/')}
              >
                ← Dashboard
              </button>
            )}
            <button
              className="nav-btn prev"
              onClick={() => setShowResults(false)}
            >
              Back to Session
            </button>
          </div>
        </header>
        <main className="public-scroll-main">
          <ScrollResults
            modules={scroll.modules}
            ideas={ideas}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="public-scroll-container">
      {showNamePrompt && (
        <NamePrompt
          onSubmit={handleNameSubmit}
          onCancel={name ? handleCancelNameChange : undefined}
          initialName={name || ""}
        />
      )}

      {currentUserDisplayName && activeUsers.length > 0 && (
        <ActiveUsers users={activeUsers} currentUserName={currentUserDisplayName} />
      )}

      {hasTimer && (
        <div className="sidebar-timer">
          <ModuleTimer
            timeLimit={(currentModule as any).timeLimit}
            scrollId={scroll.id}
            moduleIndex={currentModuleIndex}
            modules={scroll.modules}
            timerState={(currentModule as any).timerState}
          />
        </div>
      )}

      <header className="public-scroll-header">
        <div className="public-scroll-header-left">
          <Logo size="small" />
        </div>
        <div className="public-scroll-header-center">
          <h1 className="public-scroll-title">{scroll.name}</h1>
          {scroll.modules && scroll.modules.length > 0 && (
            <div className="module-indicator">
              {currentModuleIndex + 1} / {scroll.modules.length}
            </div>
          )}
        </div>
        <div className="public-scroll-header-right">
          {isAuthenticated && (
            <button
              className="dashboard-link-button"
              onClick={() => navigate('/')}
            >
              ← Dashboard
            </button>
          )}
          {isOwner && (
            <div className="host-controls">
              {hasPrevModule && (
                <button
                  className="nav-btn prev"
                  onClick={handlePrevModule}
                  disabled={transitioning}
                >
                  Previous
                </button>
              )}
              {hasNextModule && (
                <button
                  className="nav-btn next"
                  onClick={handleNextModule}
                  disabled={transitioning}
                >
                  {transitioning ? "..." : "Next"}
                </button>
              )}
              {!hasNextModule && (
                <button
                  className="nav-btn complete"
                  onClick={handleCompleteSession}
                  disabled={transitioning}
                >
                  {transitioning ? "..." : "Complete"}
                </button>
              )}
              <button
                className="nav-btn results"
                onClick={handleShowResults}
              >
                Results
              </button>
            </div>
          )}
          {currentUserDisplayName && (
            <div className="public-scroll-user-info" onClick={isOwner ? undefined : handleNameClick} style={isOwner ? { cursor: 'default' } : undefined}>
              <span className="public-scroll-user-name">{currentUserDisplayName}</span>
            </div>
          )}
        </div>
      </header>

      <main className="public-scroll-main">
        {currentModule ? (
          <ModuleRenderer
            module={currentModule}
            scrollId={scroll.id}
            ideas={ideas}
            isHost={isOwner}
            userName={currentUserDisplayName}
            moduleIndex={currentModuleIndex}
            modules={scroll.modules}
          />
        ) : (
          <div className="no-modules">
            <p>No modules configured for this scroll.</p>
          </div>
        )}
      </main>
    </div>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import type { Scroll } from "../../types/scroll";
import { ScrollCard } from "../ScrollCard";
import { NewScrollForm } from "../NewScrollForm";
import { EditScrollForm } from "../EditScrollForm";
import { Logo } from "../Logo";
import "./Scrolls.css";

export function Scrolls() {
  const [scrolls, setScrolls] = useState<Scroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedScroll, setSelectedScroll] = useState<Scroll | null>(null);

  const fetchScrolls = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("scrolls")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setScrolls(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScrolls();
  }, []);

  const handleScrollCreated = () => {
    setShowNewForm(false);
    fetchScrolls();
  };

  const handleScrollUpdated = () => {
    setSelectedScroll(null);
    fetchScrolls();
  };

  if (loading) {
    return <div className="scrolls-loading">Loading scrolls...</div>;
  }

  if (error) {
    return <div className="scrolls-error">Error: {error}</div>;
  }

  return (
    <div className="scrolls-container">
      <div className="scrolls-content">
        <div className="scrolls-header">
          <div className="scrolls-header-left">
            <Logo size="medium" />
          </div>
          <div className="scrolls-header-right">
            <button
              className="new-scroll-button"
              onClick={() => setShowNewForm(true)}
            >
              + New Scroll
            </button>
          </div>
        </div>

        {showNewForm && (
          <NewScrollForm
            onClose={() => setShowNewForm(false)}
            onCreated={handleScrollCreated}
          />
        )}

        {selectedScroll && (
          <EditScrollForm
            scroll={selectedScroll}
            onClose={() => setSelectedScroll(null)}
            onUpdated={handleScrollUpdated}
          />
        )}

        {scrolls.length === 0 ? (
          <div className="scrolls-empty">
            <p>No scrolls yet. Create your first one!</p>
          </div>
        ) : (
          <div className="scrolls-grid">
            {scrolls.map((scroll) => (
              <ScrollCard
                key={scroll.id}
                scroll={scroll}
                onClick={() => setSelectedScroll(scroll)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import type { Scroll } from "../../../types/scroll";
import type { SidebarAction } from "../Layout";
import { ScrollCard } from "../../Dashboard/components/ScrollCard";
import { NewScrollForm } from "../../Dashboard/components/NewScrollForm";
import "./page.css";

type ContextType = {
  setSidebarAction: (action: SidebarAction) => void;
}

export function ScrollsPage() {
  const navigate = useNavigate();
  const { setSidebarAction } = useOutletContext<ContextType>();
  const [scrolls, setScrolls] = useState<Scroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  // Set sidebar action for this view
  useEffect(() => {
    setSidebarAction({
      label: "+ New Scroll",
      onClick: () => setShowNewForm(true)
    });

    return () => {
      setSidebarAction(null);
    };
  }, [setSidebarAction]);

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

  const handleScrollClick = (scroll: Scroll) => {
    navigate(`/scrolls/${scroll.id}`);
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
        {showNewForm && (
          <NewScrollForm
            onClose={() => setShowNewForm(false)}
            onCreated={handleScrollCreated}
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
                onClick={() => handleScrollClick(scroll)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

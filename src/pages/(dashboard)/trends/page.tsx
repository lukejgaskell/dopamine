import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from '../../../lib/supabase';
import type { Trend } from '../../../types/trend';
import type { SidebarAction } from "../Layout";
import { TrendCard } from "../../Dashboard/components/TrendCard";
import { NewTrendForm } from "../../Dashboard/components/NewTrendForm";
import "./page.css";

type ContextType = {
  setSidebarAction: (action: SidebarAction) => void;
}

export function TrendsPage() {
  const navigate = useNavigate();
  const { setSidebarAction } = useOutletContext<ContextType>();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  // Set sidebar action for this view
  useEffect(() => {
    setSidebarAction({
      label: "+ New Trend",
      onClick: () => setShowNewForm(true)
    });

    return () => {
      setSidebarAction(null);
    };
  }, [setSidebarAction]);

  const fetchTrends = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("trends")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTrends(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  const handleTrendCreated = () => {
    setShowNewForm(false);
    fetchTrends();
  };

  const handleTrendClick = (trend: Trend) => {
    navigate(`/trends/${trend.id}`);
  };

  if (loading) {
    return <div className="trends-loading">Loading trends...</div>;
  }

  if (error) {
    return <div className="trends-error">Error: {error}</div>;
  }

  return (
    <div className="trends-container">
      <div className="trends-content">
        {showNewForm && (
          <NewTrendForm
            onClose={() => setShowNewForm(false)}
            onCreated={handleTrendCreated}
          />
        )}

        {trends.length === 0 ? (
          <div className="trends-empty">
            <p>No trends yet. Create your first one!</p>
          </div>
        ) : (
          <div className="trends-grid">
            {trends.map((trend) => (
              <TrendCard
                key={trend.id}
                trend={trend}
                onClick={() => handleTrendClick(trend)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

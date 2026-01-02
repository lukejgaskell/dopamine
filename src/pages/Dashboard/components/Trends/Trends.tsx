import { useState, useEffect } from "react";
import { supabase } from '../../../../lib/supabase';
import type { Trend } from '../../../../types/trend';
import type { SidebarAction } from '../../../../App';
import { TrendCard } from "../TrendCard";
import { NewTrendForm } from "../NewTrendForm";
import { EditTrendForm } from "../EditTrendForm";
import "./Trends.css";

type TrendsProps = {
  onSetSidebarAction?: (action: SidebarAction) => void;
}

export function Trends({ onSetSidebarAction }: TrendsProps) {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);

  // Set sidebar action for this view
  useEffect(() => {
    onSetSidebarAction?.({
      label: "+ New Trend",
      onClick: () => setShowNewForm(true)
    });

    return () => {
      onSetSidebarAction?.(null);
    };
  }, [onSetSidebarAction]);

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

  const handleTrendUpdated = () => {
    setSelectedTrend(null);
    fetchTrends();
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

        {selectedTrend && (
          <EditTrendForm
            trend={selectedTrend}
            onClose={() => setSelectedTrend(null)}
            onUpdated={handleTrendUpdated}
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
                onClick={() => setSelectedTrend(trend)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

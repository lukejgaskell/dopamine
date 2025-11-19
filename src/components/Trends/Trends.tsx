import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import type { Trend } from "../../types/trend";
import { TrendCard } from "../TrendCard";
import { NewTrendForm } from "../NewTrendForm";
import { EditTrendForm } from "../EditTrendForm";
import { Logo } from "../Logo";
import "./Trends.css";

export function Trends() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);

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
        <div className="trends-header">
          <div className="trends-header-left">
            <Logo size="medium" />
          </div>
          <div className="trends-header-right">
            <button
              className="new-trend-button"
              onClick={() => setShowNewForm(true)}
            >
              + New Trend
            </button>
          </div>
        </div>

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

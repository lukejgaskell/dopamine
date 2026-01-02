import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../../lib/supabase";
import type { Trend } from "../../../../types/trend";
import { EditTrendForm } from "../../../Dashboard/components/EditTrendForm";
import "./page.css";

export function EditTrendPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trend, setTrend] = useState<Trend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrend = async () => {
      if (!id) {
        setError("No trend ID provided");
        setLoading(false);
        return;
      }

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
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        if (!data) throw new Error("Trend not found");

        setTrend(data);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrend();
  }, [id]);

  const handleClose = () => {
    navigate("/trends");
  };

  const handleUpdated = () => {
    navigate("/trends");
  };

  if (loading) {
    return (
      <div className="edit-trend-container">
        <div className="edit-trend-loading">Loading trend...</div>
      </div>
    );
  }

  if (error || !trend) {
    return (
      <div className="edit-trend-container">
        <div className="edit-trend-error">Error: {error || "Trend not found"}</div>
      </div>
    );
  }

  return (
    <div className="edit-trend-container">
      <div className="edit-trend-content">
        <EditTrendForm
          trend={trend}
          onClose={handleClose}
          onUpdated={handleUpdated}
        />
      </div>
    </div>
  );
}

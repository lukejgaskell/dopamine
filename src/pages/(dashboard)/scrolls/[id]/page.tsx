import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../../lib/supabase";
import type { Scroll } from "../../../../types/scroll";
import { EditScrollForm } from "./components/EditScrollForm";
import "./page.css";

export function EditScrollPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [scroll, setScroll] = useState<Scroll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScroll = async () => {
      if (!id) {
        setError("No scroll ID provided");
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
          .from("scrolls")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        if (!data) throw new Error("Scroll not found");

        setScroll(data);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchScroll();
  }, [id]);

  const handleClose = () => {
    navigate("/scrolls");
  };

  const handleUpdated = () => {
    navigate("/scrolls");
  };

  if (loading) {
    return (
      <div className="edit-scroll-container">
        <div className="edit-scroll-loading">Loading scroll...</div>
      </div>
    );
  }

  if (error || !scroll) {
    return (
      <div className="edit-scroll-container">
        <div className="edit-scroll-error">Error: {error || "Scroll not found"}</div>
      </div>
    );
  }

  return (
    <div className="edit-scroll-container">
      <div className="edit-scroll-content">
        <EditScrollForm
          scroll={scroll}
          onClose={handleClose}
          onUpdated={handleUpdated}
        />
      </div>
    </div>
  );
}

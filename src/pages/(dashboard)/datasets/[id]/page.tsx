import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../../lib/supabase";
import type { Dataset } from "../../../../types/dataset";
import { EditDatasetForm } from "../../../Dashboard/components/EditDatasetForm";
import "./page.css";

export function EditDatasetPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDataset = async () => {
      if (!id) {
        setError("No dataset ID provided");
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
          .from("datasets")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        if (!data) throw new Error("Dataset not found");

        setDataset(data);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDataset();
  }, [id]);

  const handleClose = () => {
    navigate("/datasets");
  };

  const handleUpdated = () => {
    navigate("/datasets");
  };

  if (loading) {
    return (
      <div className="edit-dataset-container">
        <div className="edit-dataset-loading">Loading dataset...</div>
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="edit-dataset-container">
        <div className="edit-dataset-error">Error: {error || "Dataset not found"}</div>
      </div>
    );
  }

  return (
    <div className="edit-dataset-container">
      <div className="edit-dataset-content">
        <EditDatasetForm
          dataset={dataset}
          onClose={handleClose}
          onUpdated={handleUpdated}
        />
      </div>
    </div>
  );
}

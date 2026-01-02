import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from '../../../lib/supabase';
import type { Dataset } from '../../../types/dataset';
import type { SidebarAction } from "../Layout";
import { DatasetCard } from "../../Dashboard/components/DatasetCard";
import { NewDatasetForm } from "../../Dashboard/components/NewDatasetForm";
import "./page.css";

type ContextType = {
  setSidebarAction: (action: SidebarAction) => void;
}

export function DatasetsPage() {
  const navigate = useNavigate();
  const { setSidebarAction } = useOutletContext<ContextType>();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  // Set sidebar action for this view
  useEffect(() => {
    setSidebarAction({
      label: "+ New Dataset",
      onClick: () => setShowNewForm(true)
    });

    return () => {
      setSidebarAction(null);
    };
  }, [setSidebarAction]);

  const fetchDatasets = async () => {
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
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDatasets(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleDatasetCreated = () => {
    setShowNewForm(false);
    fetchDatasets();
  };

  const handleDatasetClick = (dataset: Dataset) => {
    navigate(`/datasets/${dataset.id}`);
  };

  if (loading) {
    return <div className="datasets-loading">Loading datasets...</div>;
  }

  if (error) {
    return <div className="datasets-error">Error: {error}</div>;
  }

  return (
    <div className="datasets-container">
      <div className="datasets-content">
        {showNewForm && (
          <NewDatasetForm
            onClose={() => setShowNewForm(false)}
            onCreated={handleDatasetCreated}
          />
        )}

        {datasets.length === 0 ? (
          <div className="datasets-empty">
            <p>No datasets yet. Create your first one!</p>
          </div>
        ) : (
          <div className="datasets-grid">
            {datasets.map((dataset) => (
              <DatasetCard
                key={dataset.id}
                dataset={dataset}
                onClick={() => handleDatasetClick(dataset)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import type { Dataset } from "../../types/dataset";
import { DatasetCard } from "../DatasetCard";
import { NewDatasetForm } from "../NewDatasetForm";
import { EditDatasetForm } from "../EditDatasetForm";
import { Logo } from "../Logo";
import "./Datasets.css";

export function Datasets() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

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

  const handleDatasetUpdated = () => {
    setSelectedDataset(null);
    fetchDatasets();
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
        <div className="datasets-header">
          <div className="datasets-header-left">
            <Logo size="medium" />
          </div>
          <div className="datasets-header-right">
            <button
              className="new-dataset-button"
              onClick={() => setShowNewForm(true)}
            >
              + New Dataset
            </button>
          </div>
        </div>

        {showNewForm && (
          <NewDatasetForm
            onClose={() => setShowNewForm(false)}
            onCreated={handleDatasetCreated}
          />
        )}

        {selectedDataset && (
          <EditDatasetForm
            dataset={selectedDataset}
            onClose={() => setSelectedDataset(null)}
            onUpdated={handleDatasetUpdated}
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
                onClick={() => setSelectedDataset(dataset)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

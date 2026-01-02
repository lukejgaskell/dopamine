import { useState, useEffect } from "react";
import { supabase } from '../../../../lib/supabase';
import type { Dataset } from '../../../../types/dataset';
import type { SidebarAction } from '../../../../App';
import { DatasetCard } from "../DatasetCard";
import { NewDatasetForm } from "../NewDatasetForm";
import { EditDatasetForm } from "../EditDatasetForm";
import "./Datasets.css";

type DatasetsProps = {
  onSetSidebarAction?: (action: SidebarAction) => void;
}

export function Datasets({ onSetSidebarAction }: DatasetsProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

  // Set sidebar action for this view
  useEffect(() => {
    onSetSidebarAction?.({
      label: "+ New Dataset",
      onClick: () => setShowNewForm(true)
    });

    return () => {
      onSetSidebarAction?.(null);
    };
  }, [onSetSidebarAction]);

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

import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from '../../../lib/supabase';
import type { Dataset } from '../../../types/dataset';
import type { SidebarAction } from "../Layout";
import { NewDatasetForm } from "./components/NewDatasetForm";
import "./page.css";

type ContextType = {
  setSidebarAction: (action: SidebarAction) => void;
}

const ITEMS_PER_PAGE = 20;

export function DatasetsPage() {
  const navigate = useNavigate();
  const { setSidebarAction } = useOutletContext<ContextType>();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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

  // Pagination calculations
  const totalPages = Math.ceil(datasets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentDatasets = datasets.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          <>
            <div className="datasets-table">
              <div className="datasets-table-header">
                <div className="datasets-table-cell name-cell">Name</div>
                <div className="datasets-table-cell date-cell">Created</div>
              </div>
              <div className="datasets-table-body">
                {currentDatasets.map((dataset) => (
                  <div
                    key={dataset.id}
                    className="datasets-table-row"
                    onClick={() => handleDatasetClick(dataset)}
                  >
                    <div className="datasets-table-cell name-cell">{dataset.name}</div>
                    <div className="datasets-table-cell date-cell">
                      {new Date(dataset.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <div className="pagination-info">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

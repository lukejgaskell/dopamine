import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from '../../../lib/supabase';
import type { Trend } from '../../../types/trend';
import type { SidebarAction } from "../Layout";
import { NewTrendForm } from "./components/NewTrendForm";
import "./page.css";

type ContextType = {
  setSidebarAction: (action: SidebarAction) => void;
}

const ITEMS_PER_PAGE = 20;

export function TrendsPage() {
  const navigate = useNavigate();
  const { setSidebarAction } = useOutletContext<ContextType>();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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

  // Pagination calculations
  const totalPages = Math.ceil(trends.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentTrends = trends.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          <>
            <div className="trends-table">
              <div className="trends-table-header">
                <div className="trends-table-cell name-cell">Name</div>
                <div className="trends-table-cell date-cell">Created</div>
              </div>
              <div className="trends-table-body">
                {currentTrends.map((trend) => (
                  <div
                    key={trend.id}
                    className="trends-table-row"
                    onClick={() => handleTrendClick(trend)}
                  >
                    <div className="trends-table-cell name-cell">{trend.name}</div>
                    <div className="trends-table-cell date-cell">
                      {new Date(trend.created_at).toLocaleDateString()}
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

import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { Scroll } from "@/types/scroll";
import type { SidebarAction } from "../Layout";
import { useDialog } from "@/components/Dialog";
import { NewScrollForm } from "./components/NewScrollForm";
import "./page.css";

type ContextType = {
  setSidebarAction: (action: SidebarAction) => void;
}

const ITEMS_PER_PAGE = 20;

export function ScrollsPage() {
  const navigate = useNavigate();
  const { setSidebarAction } = useOutletContext<ContextType>();
  const { confirm, error: showError } = useDialog();
  const [scrolls, setScrolls] = useState<Scroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Set sidebar action for this view
  useEffect(() => {
    setSidebarAction({
      label: "+ New Scroll",
      onClick: () => setShowNewForm(true)
    });

    return () => {
      setSidebarAction(null);
    };
  }, [setSidebarAction]);

  const fetchScrolls = async () => {
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
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setScrolls(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScrolls();
  }, []);

  const handleScrollCreated = () => {
    setShowNewForm(false);
    fetchScrolls();
  };

  const getShareableLink = (scroll: Scroll) => {
    if (!scroll.key) return null;
    const baseUrl = window.location.origin;
    return `${baseUrl}/scroll/${scroll.id}?key=${scroll.key}`;
  };

  const handleGoTo = (scroll: Scroll) => {
    const link = getShareableLink(scroll);
    if (link) {
      window.open(link, '_blank');
    }
  };

  const handleViewResults = (scrollId: string) => {
    navigate(`/results/${scrollId}`);
  };

  const handleEdit = (scroll: Scroll) => {
    navigate(`/scrolls/${scroll.id}`);
  };

  const handleDelete = async (scroll: Scroll) => {
    const confirmed = await confirm({
      title: 'Delete Scroll',
      message: `Are you sure you want to delete "${scroll.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });

    if (!confirmed) return;

    try {
      const { error: deleteError } = await supabase
        .from('scrolls')
        .delete()
        .eq('id', scroll.id);

      if (deleteError) throw deleteError;

      // Refresh the list
      fetchScrolls();
    } catch (err: any) {
      console.error('Error deleting scroll:', err);
      await showError({
        title: 'Error',
        message: 'Failed to delete scroll: ' + err.message,
      });
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(scrolls.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentScrolls = scrolls.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return <div className="scrolls-loading">Loading scrolls...</div>;
  }

  if (error) {
    return <div className="scrolls-error">Error: {error}</div>;
  }

  return (
    <div className="scrolls-container">
      <div className="scrolls-content">
        {showNewForm && (
          <NewScrollForm
            onClose={() => setShowNewForm(false)}
            onCreated={handleScrollCreated}
          />
        )}

        {scrolls.length === 0 ? (
          <div className="scrolls-empty">
            <p>No scrolls yet. Create your first one!</p>
          </div>
        ) : (
          <>
            <div className="scrolls-table">
              <div className="scrolls-table-header">
                <div className="scrolls-table-cell name-cell">Name</div>
                <div className="scrolls-table-cell status-cell">Status</div>
                <div className="scrolls-table-cell date-cell">Created</div>
                <div className="scrolls-table-cell actions-cell">Actions</div>
              </div>
              <div className="scrolls-table-body">
              {currentScrolls.map((scroll) => (
                <div
                  key={scroll.id}
                  className="scrolls-table-row"
                >
                  <div className="scrolls-table-cell name-cell">{scroll.name}</div>
                  <div className="scrolls-table-cell status-cell">
                    <span className={`status-badge status-${scroll.status}`}>
                      {scroll.status}
                    </span>
                  </div>
                  <div className="scrolls-table-cell date-cell">
                    {new Date(scroll.created_at).toLocaleDateString()}
                  </div>
                  <div className="scrolls-table-cell actions-cell">
                    {scroll.status === 'draft' && (
                      <button
                        onClick={() => handleEdit(scroll)}
                        className="action-button edit-button"
                        title="Edit"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                    )}
                    {(scroll.status === 'draft' || scroll.status === 'active') && getShareableLink(scroll) && (
                      <button
                        onClick={() => handleGoTo(scroll)}
                        className="action-button goto-button"
                        title="Go to"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 16 16 12 12 8"></polyline>
                          <line x1="8" y1="12" x2="16" y2="12"></line>
                        </svg>
                      </button>
                    )}
                    {scroll.status === 'completed' && (
                      <button
                        onClick={() => handleViewResults(scroll.id)}
                        className="action-button results-button"
                        title="View Results"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="20" x2="12" y2="10"></line>
                          <line x1="18" y1="20" x2="18" y2="4"></line>
                          <line x1="6" y1="20" x2="6" y2="16"></line>
                        </svg>
                      </button>
                    )}
                    {(scroll.status === 'active' || scroll.status === 'completed') && (
                      <button
                        onClick={() => handleDelete(scroll)}
                        className="action-button delete-button"
                        title="Delete"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
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

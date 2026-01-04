import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from '../../../../components/Logo';
import type { Scroll } from "../../../../types/scroll";
import type { Idea } from "../../../../types/idea";
import "./ModuleResultsView.css";

const ITEMS_PER_PAGE = 20;

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  isOwner: boolean;
  hasNextModule: boolean;
  transitioning: boolean;
  onContinue: () => Promise<void>;
  onDashboard: () => void;
};

function MobileResultsMenu({
  isOpen,
  onClose,
  isAuthenticated,
  isOwner,
  hasNextModule,
  transitioning,
  onContinue,
  onDashboard,
}: MobileMenuProps) {
  if (!isOpen) return null;

  const handleContinue = async () => {
    await onContinue();
    onClose();
  };

  return (
    <div className="mobile-results-menu-overlay" onClick={onClose}>
      <div className="mobile-results-menu" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-results-menu-header">
          <h3>Menu</h3>
          <button className="mobile-results-menu-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="mobile-results-menu-content">
          {isAuthenticated && (
            <button
              className="mobile-results-menu-item"
              onClick={() => {
                onDashboard();
                onClose();
              }}
            >
              ← Dashboard
            </button>
          )}
          {isOwner && hasNextModule && (
            <button
              className="mobile-results-menu-item primary"
              onClick={handleContinue}
              disabled={transitioning}
            >
              {transitioning ? "..." : "Continue to Next"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

type ModuleResultsViewProps = {
  scroll: Scroll;
  currentModuleIndex: number;
  ideas: Idea[];
  isOwner: boolean;
  isAuthenticated: boolean;
  hasNextModule: boolean;
  transitioning: boolean;
  onContinueToNext: () => Promise<void>;
  selectedIdeaIds: Set<string>;
  onToggleIdeaSelection: (ideaId: string) => void;
  onToggleSelectAll: () => void;
};

export function ModuleResultsView({
  scroll,
  currentModuleIndex,
  ideas,
  isOwner,
  isAuthenticated,
  hasNextModule,
  transitioning,
  onContinueToNext,
  selectedIdeaIds,
  onToggleIdeaSelection,
  onToggleSelectAll,
}: ModuleResultsViewProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const currentModule = scroll.modules[currentModuleIndex] as any;
  const moduleResults = currentModule.results || {};

  // Get dataset ideas for this module
  const getActiveDatasetId = (): string | null => {
    for (let i = currentModuleIndex; i >= 0; i--) {
      const mod = scroll.modules[i] as any;
      if (mod.type === 'dataset' || mod.type === 'brainstorm') {
        return mod.dataset_id || null;
      }
    }
    return null;
  };

  const datasetId = currentModule.type === 'brainstorm' || currentModule.type === 'dataset'
    ? currentModule.dataset_id
    : getActiveDatasetId();

  const datasetIdeas = ideas.filter(idea => idea.dataset_id === datasetId && !idea.deleted);

  // Count only selected ideas that are in the current dataset
  const selectedCount = datasetIdeas.filter(idea => selectedIdeaIds.has(idea.id)).length;

  // Calculate display value for each idea based on module type
  const getIdeaMetric = (ideaId: string): { label: string; value: string } | null => {
    switch (currentModule.type) {
      case 'vote': {
        const votes = moduleResults.votes?.[ideaId] || [];
        return { label: 'votes', value: votes.length.toString() };
      }
      case 'weighted_vote': {
        let total = 0;
        Object.values(moduleResults.weightedVotes || {}).forEach((userVotes: any) => {
          total += Number(userVotes[ideaId] || 0);
        });
        return { label: 'points', value: total.toString() };
      }
      case 'likert_vote': {
        const ratings: number[] = [];
        Object.values(moduleResults.ratings || {}).forEach((userRatings: any) => {
          if (userRatings[ideaId] !== undefined) {
            ratings.push(Number(userRatings[ideaId]));
          }
        });
        const avg = ratings.length > 0
          ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
          : '0';
        return { label: 'avg rating', value: avg };
      }
      case 'work_estimate': {
        const estimates: number[] = [];
        Object.values(moduleResults.estimates || {}).forEach((userEstimates: any) => {
          if (userEstimates[ideaId] !== undefined) {
            estimates.push(Number(userEstimates[ideaId]));
          }
        });
        const avg = estimates.length > 0
          ? (estimates.reduce((a, b) => a + b, 0) / estimates.length).toFixed(1)
          : '0';
        return { label: 'avg estimate', value: avg };
      }
      case 'rank_order': {
        // Calculate average rank position (lower is better)
        const positions: number[] = [];
        Object.values(moduleResults.rankings || {}).forEach((ranking: any) => {
          const position = ranking.indexOf(ideaId);
          if (position !== -1) {
            positions.push(position + 1);
          }
        });
        const avg = positions.length > 0
          ? (positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1)
          : '-';
        return { label: 'avg rank', value: avg };
      }
      default:
        return null;
    }
  };

  // Sort ideas by metric value (descending)
  const sortedIdeas = [...datasetIdeas].sort((a, b) => {
    const metricA = getIdeaMetric(a.id);
    const metricB = getIdeaMetric(b.id);
    if (!metricA || !metricB) return 0;
    return parseFloat(metricB.value) - parseFloat(metricA.value);
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedIdeas.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentIdeas = sortedIdeas.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="public-scroll-container">
      <MobileResultsMenu
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        isAuthenticated={isAuthenticated}
        isOwner={isOwner}
        hasNextModule={hasNextModule}
        transitioning={transitioning}
        onContinue={onContinueToNext}
        onDashboard={() => navigate('/app/scrolls')}
      />
      <header className="public-scroll-header">
        <div className="public-scroll-header-left">
          <Logo size="small" />
        </div>
        <div className="public-scroll-header-center">
          <h1 className="public-scroll-title">{scroll.name}</h1>
          <div className="module-indicator">
            Module {currentModuleIndex + 1} Results
          </div>
        </div>
        <div className="public-scroll-header-right">
          {/* Desktop buttons */}
          <div className="header-desktop-buttons">
            {isAuthenticated && (
              <button
                className="dashboard-link-button"
                onClick={() => navigate('/app/scrolls')}
              >
                ← Dashboard
              </button>
            )}
            {isOwner && hasNextModule && (
              <button
                className="nav-btn next"
                onClick={onContinueToNext}
                disabled={transitioning}
              >
                {transitioning ? "..." : "Continue"}
              </button>
            )}
          </div>
          {/* Mobile hamburger - only for hosts */}
          {isOwner && (
            <button
              className="header-mobile-menu-btn"
              onClick={() => setShowMobileMenu(true)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
      </header>
      <main className="public-scroll-main">
        <div className="module-results-content">
          {isOwner && hasNextModule && (
            <div className="module-results-selection-header">
              <span className="module-results-selection-count">
                {selectedCount} of {datasetIdeas.length} selected to continue
              </span>
              <button
                onClick={onToggleSelectAll}
                className="module-results-select-all-btn"
              >
                {selectedCount === datasetIdeas.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          )}
          <div className="module-results-ideas-list">
            {currentIdeas.map((idea) => {
              const metric = getIdeaMetric(idea.id);
              const isSelected = selectedIdeaIds.has(idea.id);
              return (
                <div
                  key={idea.id}
                  className={`module-results-idea-card ${isSelected ? 'selected' : ''} ${isOwner && hasNextModule ? 'clickable' : ''}`}
                  onClick={isOwner && hasNextModule ? () => onToggleIdeaSelection(idea.id) : undefined}
                >
                  {isOwner && hasNextModule && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleIdeaSelection(idea.id)}
                      className="module-results-checkbox"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <div className="module-results-idea-text">
                    <p>{idea.text}</p>
                  </div>
                  {metric && (
                    <div className="module-results-metric">
                      <span className="module-results-metric-value">
                        {metric.value}
                      </span>
                      <span className="module-results-metric-label">
                        {metric.label}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="module-results-pagination">
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
        </div>
      </main>
    </div>
  );
}

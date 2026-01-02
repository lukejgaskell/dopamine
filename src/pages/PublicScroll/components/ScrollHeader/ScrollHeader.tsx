import { useNavigate } from "react-router-dom";
import { Logo } from '../../../../components/Logo';
import type { Scroll } from "../../../../types/scroll";
import "./ScrollHeader.css";

type ScrollHeaderProps = {
  scroll: Scroll;
  currentModuleIndex: number;
  isOwner: boolean;
  isAuthenticated: boolean;
  hasNextModule: boolean;
  transitioning: boolean;
  currentUserDisplayName: string | undefined;
  onNextModule: () => Promise<void>;
  onCompleteSession: () => Promise<void>;
  onNameClick: () => void;
  onMobileMenuOpen: () => void;
};

export function ScrollHeader({
  scroll,
  currentModuleIndex,
  isOwner,
  isAuthenticated,
  hasNextModule,
  transitioning,
  currentUserDisplayName,
  onNextModule,
  onCompleteSession,
  onNameClick,
  onMobileMenuOpen,
}: ScrollHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="public-scroll-header">
      <div className="public-scroll-header-left">
        <Logo size="small" />
      </div>
      <div className="public-scroll-header-center">
        <h1 className="public-scroll-title">{scroll.name}</h1>
        {scroll.modules && scroll.modules.length > 0 && (
          <div className="module-indicator">
            {currentModuleIndex + 1} / {scroll.modules.length}
          </div>
        )}
      </div>
      <div className="public-scroll-header-right">
        {/* Desktop navigation */}
        <div className="desktop-nav">
          {isAuthenticated && (
            <button
              className="dashboard-link-button"
              onClick={() => navigate('/')}
            >
              ← Dashboard
            </button>
          )}
          {isOwner && (
            <div className="host-controls">
              {hasNextModule && (
                <button
                  className="nav-btn next"
                  onClick={onNextModule}
                  disabled={transitioning}
                >
                  {transitioning ? "..." : "Next"}
                </button>
              )}
              {!hasNextModule && (
                <button
                  className="nav-btn complete"
                  onClick={onCompleteSession}
                  disabled={transitioning}
                >
                  {transitioning ? "..." : "Complete"}
                </button>
              )}
            </div>
          )}
          {currentUserDisplayName && (
            <div className="public-scroll-user-info" onClick={isOwner ? undefined : onNameClick} style={isOwner ? { cursor: 'default' } : undefined}>
              <span className="public-scroll-user-name">{currentUserDisplayName}</span>
            </div>
          )}
        </div>
        {/* Mobile hamburger button */}
        <button className="mobile-menu-button" onClick={onMobileMenuOpen}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>
    </header>
  );
}

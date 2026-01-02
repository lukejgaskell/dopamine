import { useNavigate } from "react-router-dom";
import "./MobileMenu.css";

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  currentUserDisplayName: string | undefined;
  isOwner: boolean;
  isAuthenticated: boolean;
  hasNextModule: boolean;
  transitioning: boolean;
  onNameClick: () => void;
  onNextModule: () => Promise<void>;
  onCompleteSession: () => Promise<void>;
};

export function MobileMenu({
  isOpen,
  onClose,
  currentUserDisplayName,
  isOwner,
  isAuthenticated,
  hasNextModule,
  transitioning,
  onNameClick,
  onNextModule,
  onCompleteSession,
}: MobileMenuProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleNextModule = async () => {
    await onNextModule();
    onClose();
  };

  const handleCompleteSession = async () => {
    await onCompleteSession();
    onClose();
  };

  return (
    <div className="mobile-menu-overlay" onClick={onClose}>
      <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-menu-header">
          <h3>Menu</h3>
          <button className="mobile-menu-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="mobile-menu-content">
          {currentUserDisplayName && (
            <div className="mobile-menu-section">
              <div className="mobile-menu-label">Signed in as</div>
              <div
                className="mobile-menu-user"
                onClick={isOwner ? undefined : onNameClick}
              >
                {currentUserDisplayName}
              </div>
            </div>
          )}
          {isAuthenticated && (
            <button
              className="mobile-menu-item"
              onClick={() => {
                navigate("/");
                onClose();
              }}
            >
              ← Dashboard
            </button>
          )}
          {isOwner && (
            <div className="mobile-menu-section">
              <div className="mobile-menu-label">Host Controls</div>
              {hasNextModule && (
                <button
                  className="mobile-menu-item"
                  onClick={handleNextModule}
                  disabled={transitioning}
                >
                  {transitioning ? "..." : "Next"}
                </button>
              )}
              {!hasNextModule && (
                <button
                  className="mobile-menu-item"
                  onClick={handleCompleteSession}
                  disabled={transitioning}
                >
                  {transitioning ? "..." : "Complete"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

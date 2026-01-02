import { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { Logo } from '../../components/Logo'
import './Layout.css'

export type SidebarAction = {
  label: string
  onClick: () => void
} | null

type LayoutProps = {
  session: Session
}

export function DashboardLayout({ session }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Get sidebar action from current view
  const [sidebarAction, setSidebarAction] = useState<SidebarAction>(null)

  // Determine active view from current path
  const getActiveView = () => {
    if (location.pathname.startsWith('/scrolls')) return 'scrolls'
    if (location.pathname.startsWith('/trends')) return 'trends'
    if (location.pathname.startsWith('/datasets')) return 'datasets'
    return 'scrolls'
  }

  const activeView = getActiveView()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  // Get username from email
  const getUsername = () => {
    const email = session.user.email || ''
    return email.split('@')[0]
  }

  // Generate gradient colors based on email (theme-aware, muted)
  const getAvatarGradient = () => {
    const email = session.user.email || ''
    let hash = 0
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash)
    }

    // Muted theme color palette
    const themeGradients = [
      'linear-gradient(135deg, rgba(139, 92, 246, 0.6) 0%, rgba(167, 139, 250, 0.6) 100%)', // Purple
      'linear-gradient(135deg, rgba(236, 72, 153, 0.6) 0%, rgba(244, 114, 182, 0.6) 100%)', // Pink
      'linear-gradient(135deg, rgba(6, 182, 212, 0.6) 0%, rgba(34, 211, 238, 0.6) 100%)',   // Cyan
      'linear-gradient(135deg, rgba(139, 92, 246, 0.6) 0%, rgba(236, 72, 153, 0.6) 100%)',  // Purple to Pink
      'linear-gradient(135deg, rgba(236, 72, 153, 0.6) 0%, rgba(6, 182, 212, 0.6) 100%)',   // Pink to Cyan
      'linear-gradient(135deg, rgba(6, 182, 212, 0.6) 0%, rgba(139, 92, 246, 0.6) 100%)',   // Cyan to Purple
    ]

    const index = Math.abs(hash) % themeGradients.length
    return themeGradients[index]
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  // Get current page title for mobile
  const getPageTitle = () => {
    if (location.pathname.startsWith('/scrolls')) return 'Scrolls'
    if (location.pathname.startsWith('/trends')) return 'Trends'
    if (location.pathname.startsWith('/datasets')) return 'Datasets'
    return 'Scrolls'
  }

  return (
    <div className="dashboard-layout">
      {/* Mobile sidebar overlay */}
      {showMobileSidebar && (
        <div
          className="sidebar-overlay"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      <aside className={`dashboard-sidebar ${showMobileSidebar ? 'show-mobile' : ''}`}>
        <div className="sidebar-logo">
          <Logo size="small" />
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeView === 'scrolls' ? 'active' : ''}`}
            onClick={() => {
              navigate('/scrolls')
              setShowMobileSidebar(false)
            }}
          >
            <svg className="nav-item-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span className="nav-item-label">Scrolls</span>
          </button>
          <button
            className={`nav-item ${activeView === 'trends' ? 'active' : ''}`}
            onClick={() => {
              navigate('/trends')
              setShowMobileSidebar(false)
            }}
          >
            <svg className="nav-item-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
            <span className="nav-item-label">Trends</span>
          </button>
          <button
            className={`nav-item ${activeView === 'datasets' ? 'active' : ''}`}
            onClick={() => {
              navigate('/datasets')
              setShowMobileSidebar(false)
            }}
          >
            <svg className="nav-item-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
            <span className="nav-item-label">Datasets</span>
          </button>
        </nav>
        {sidebarAction && (
          <div className="sidebar-action">
            <button
              className="sidebar-action-button"
              onClick={() => {
                sidebarAction.onClick()
                setShowMobileSidebar(false)
              }}
            >
              {sidebarAction.label}
            </button>
          </div>
        )}
      </aside>
      <div className="dashboard-main">
        <div className="dashboard-topbar">
          <button
            className="mobile-menu-button"
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div className="topbar-title">
            {getPageTitle()}
          </div>
          <div className="topbar-spacer"></div>
          <div className="user-avatar-container" ref={menuRef}>
            <button
              className="user-avatar-button"
              style={{ background: getAvatarGradient() }}
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              {getUsername()}
            </button>
            {showUserMenu && (
              <div className="user-menu">
                <div className="user-menu-email">{session.user.email}</div>
                <button className="user-menu-signout" onClick={handleSignOut}>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="dashboard-content">
          <Outlet context={{ setSidebarAction }} />
        </div>
      </div>
    </div>
  )
}

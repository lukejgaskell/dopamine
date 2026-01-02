import { Logo } from '../../../../components/Logo'
import { ScrollResults } from '../ScrollResults'
import type { Scroll } from '../../../../types/scroll'
import type { Idea } from '../../../../types/idea'
import './FinalResultsView.css'

type FinalResultsViewProps = {
  scroll: Scroll
  ideas: Idea[]
  isAuthenticated: boolean
  onNavigateToDashboard: () => void
  onBackToSession: () => void
}

export function FinalResultsView({
  scroll,
  ideas,
  isAuthenticated,
  onNavigateToDashboard,
  onBackToSession,
}: FinalResultsViewProps) {
  return (
    <div className="public-scroll-container">
      <header className="public-scroll-header">
        <div className="public-scroll-header-left">
          <Logo size="small" />
        </div>
        <div className="public-scroll-header-center">
          <h1 className="public-scroll-title">{scroll.name}</h1>
          <div className="module-indicator">Results</div>
        </div>
        <div className="public-scroll-header-right">
          {isAuthenticated && (
            <button
              className="dashboard-link-button"
              onClick={onNavigateToDashboard}
            >
              ← Dashboard
            </button>
          )}
          {scroll.status !== 'completed' && (
            <button className="nav-btn prev" onClick={onBackToSession}>
              Back to Session
            </button>
          )}
        </div>
      </header>
      <main className="public-scroll-main">
        <ScrollResults modules={scroll.modules} ideas={ideas} />
      </main>
    </div>
  )
}

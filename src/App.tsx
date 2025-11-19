import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { Auth } from './components/Auth'
import { Scrolls } from './components/Scrolls'
import { Trends } from './components/Trends'
import { Datasets } from './components/Datasets'
import { PublicScroll } from './components/PublicScroll'
import { ScrollResultsPage } from './components/ScrollResultsPage'
import './App.css'

type DashboardView = 'scrolls' | 'trends' | 'datasets'

function Dashboard({ session }: { session: Session }) {
  const [activeView, setActiveView] = useState<DashboardView>('scrolls')

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <>
      <div className="user-info">
        <span>Logged in as: {session.user.email}</span>
        <button onClick={handleSignOut} className="sign-out-button">
          Sign Out
        </button>
      </div>
      <div className="dashboard-navigation">
        <button
          className={`nav-tab ${activeView === 'scrolls' ? 'active' : ''}`}
          onClick={() => setActiveView('scrolls')}
        >
          Scrolls
        </button>
        <button
          className={`nav-tab ${activeView === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveView('trends')}
        >
          Trends
        </button>
        <button
          className={`nav-tab ${activeView === 'datasets' ? 'active' : ''}`}
          onClick={() => setActiveView('datasets')}
        >
          Datasets
        </button>
      </div>
      {activeView === 'scrolls' && <Scrolls />}
      {activeView === 'trends' && <Trends />}
      {activeView === 'datasets' && <Datasets />}
    </>
  )
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public route for viewing active scrolls */}
        <Route path="/scroll/:id" element={<PublicScroll />} />

        {/* Results page (requires auth) */}
        <Route
          path="/results/:id"
          element={
            session ? <ScrollResultsPage /> : <Navigate to="/" replace />
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            session ? <Dashboard session={session} /> : <Auth />
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

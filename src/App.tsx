import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { Landing } from './pages/Landing'
import { Auth } from './pages/Auth'
import { DashboardLayout } from './pages/(dashboard)/Layout'
import { ScrollsPage } from './pages/(dashboard)/scrolls/page'
import { EditScrollPage } from './pages/(dashboard)/scrolls/[id]/page'
import { TrendsPage } from './pages/(dashboard)/trends/page'
import { EditTrendPage } from './pages/(dashboard)/trends/[id]/page'
import { DatasetsPage } from './pages/(dashboard)/datasets/page'
import { EditDatasetPage } from './pages/(dashboard)/datasets/[id]/page'
import { PublicScroll } from './pages/PublicScroll'
import { Results } from './pages/Results'
import './App.css'

// Re-export SidebarAction for backward compatibility
export type { SidebarAction } from './pages/(dashboard)/Layout'

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

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes - no auth required, no loading state */}
        <Route path="/" element={<Landing />} />
        <Route path="/scroll/:id" element={<PublicScroll />} />

        {/* Auth route */}
        <Route path="/auth" element={
          loading ? <div className="loading">Loading...</div> :
          !session ? <Auth /> : <Navigate to="/app/scrolls" replace />
        } />

        {/* Protected routes - show loading while checking auth */}
        <Route path="/app/results/:id" element={
          loading ? <div className="loading">Loading...</div> :
          session ? <Results /> : <Navigate to="/auth" replace />
        } />

        <Route path="/app" element={
          loading ? <div className="loading">Loading...</div> :
          session ? <DashboardLayout session={session} /> : <Navigate to="/auth" replace />
        }>
          <Route index element={<Navigate to="/app/scrolls" replace />} />
          <Route path="scrolls" element={<ScrollsPage />} />
          <Route path="scrolls/:id" element={<EditScrollPage />} />
          <Route path="trends" element={<TrendsPage />} />
          <Route path="trends/:id" element={<EditTrendPage />} />
          <Route path="datasets" element={<DatasetsPage />} />
          <Route path="datasets/:id" element={<EditDatasetPage />} />
        </Route>

        {/* Catch all - redirect to landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

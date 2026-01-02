import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { Auth } from './pages/Auth'
import { DashboardLayout } from './pages/(dashboard)/Layout'
import { ScrollsPage } from './pages/(dashboard)/scrolls/page'
import { EditScrollPage } from './pages/(dashboard)/scrolls/[id]/page'
import { TrendsPage } from './pages/(dashboard)/trends/page'
import { EditTrendPage } from './pages/(dashboard)/trends/[id]/page'
import { DatasetsPage } from './pages/(dashboard)/datasets/page'
import { EditDatasetPage } from './pages/(dashboard)/datasets/[id]/page'
import { PublicScroll } from './pages/PublicScroll'
import { ScrollResultsPage } from './pages/Dashboard/components/ScrollResultsPage'
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

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public route for viewing active scrolls */}
        <Route path="/scroll/:id" element={<PublicScroll />} />

        {/* Auth route */}
        <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/scrolls" replace />} />

        {/* Dashboard routes (requires auth) */}
        {session ? (
          <Route element={<DashboardLayout session={session} />}>
            <Route path="/scrolls" element={<ScrollsPage />} />
            <Route path="/scrolls/:id" element={<EditScrollPage />} />
            <Route path="/trends" element={<TrendsPage />} />
            <Route path="/trends/:id" element={<EditTrendPage />} />
            <Route path="/datasets" element={<DatasetsPage />} />
            <Route path="/datasets/:id" element={<EditDatasetPage />} />
            <Route path="/results/:id" element={<ScrollResultsPage />} />
            <Route path="/" element={<Navigate to="/scrolls" replace />} />
          </Route>
        ) : (
          <Route path="/" element={<Navigate to="/auth" replace />} />
        )}

        {/* Catch all - redirect based on auth state */}
        <Route path="*" element={<Navigate to={session ? "/scrolls" : "/auth"} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

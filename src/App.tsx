import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import Auth from './components/Auth'
import Scrolls from './components/Scrolls'
import PublicScroll from './components/PublicScroll'
import './App.css'

function Dashboard({ session }: { session: Session }) {
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
      <Scrolls />
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

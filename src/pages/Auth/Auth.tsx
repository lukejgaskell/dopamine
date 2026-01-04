import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Logo } from '../../components/Logo'
import './Auth.css'

export function Auth() {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      })
      if (error) throw error
      setMessage('Check your email for the password reset link!')
    } catch (error: any) {
      setError(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage('Check your email for the confirmation link!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (error: any) {
      setError(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      {/* Left side - graphic panel */}
      <div className="auth-graphic">
        <div className="auth-graphic-content">
          <div className="auth-graphic-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h2 className="auth-graphic-title">
            Make Better Decisions Together
          </h2>
          <p className="auth-graphic-subtitle">
            Collaborative brainstorming and voting for teams who want to move faster and align better.
          </p>
          <div className="auth-graphic-features">
            <div className="auth-graphic-feature">
              <div className="auth-graphic-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span>Collect ideas from your entire team</span>
            </div>
            <div className="auth-graphic-feature">
              <div className="auth-graphic-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span>Vote and rank with multiple methods</span>
            </div>
            <div className="auth-graphic-feature">
              <div className="auth-graphic-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span>Real-time collaboration and results</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - form panel */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-logo">
            <Logo size="small" />
          </div>
          <h1>{isForgotPassword ? 'Reset Password' : isSignUp ? 'Sign Up' : 'Sign In'}</h1>
          <p className="auth-subtitle">
            {isForgotPassword
              ? 'Enter your email to receive a reset link'
              : isSignUp
              ? 'Create a new account to start collaborating'
              : 'Welcome back to your collaborative space'}
          </p>

          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {error && <div className="error-message">{error}</div>}
              {message && <div className="success-message">{message}</div>}

              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
                {!isSignUp && (
                  <button
                    type="button"
                    className="forgot-password-link"
                    onClick={() => {
                      setIsForgotPassword(true)
                      setError(null)
                      setMessage(null)
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              {error && <div className="error-message">{error}</div>}
              {message && <div className="success-message">{message}</div>}

              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
            </form>
          )}

          <div className="auth-toggle">
            <button
              type="button"
              onClick={() => {
                if (isForgotPassword) {
                  setIsForgotPassword(false)
                } else {
                  setIsSignUp(!isSignUp)
                }
                setError(null)
                setMessage(null)
              }}
              className="toggle-button"
            >
              {isForgotPassword
                ? '← Back to Sign In'
                : isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

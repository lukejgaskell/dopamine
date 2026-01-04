import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import './Landing.css'

export function Landing() {
  const navigate = useNavigate()

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="landing-page">
      <header className="landing-header" role="banner">
        <div className="landing-header-content">
          <Logo size="small" />
          <nav className="landing-nav" aria-label="Main navigation">
            <button className="landing-nav-link" onClick={scrollToFeatures}>
              Features
            </button>
            <a href="#how-it-works" className="landing-nav-link">
              How it Works
            </a>
          </nav>
          <div className="landing-auth-buttons">
            <button
              className="landing-btn landing-btn-secondary"
              onClick={() => navigate('/auth')}
            >
              Log In
            </button>
            <button
              className="landing-btn landing-btn-primary"
              onClick={() => navigate('/auth')}
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero-content">
            <h1 className="landing-hero-title">
              Collaborative Decision Making Made Simple
            </h1>
            <p className="landing-hero-subtitle">
              Collect ideas, gather votes, and reach consensus with your team.
              Dopamine helps groups make better decisions together through
              structured brainstorming and voting.
            </p>
            <div className="landing-hero-ctas">
              <button
                className="landing-btn landing-btn-primary landing-btn-large"
                onClick={() => navigate('/auth')}
              >
                Get Started
              </button>
              <button
                className="landing-btn landing-btn-secondary landing-btn-large"
                onClick={scrollToFeatures}
              >
                Learn More
              </button>
            </div>
          </div>
        </section>

        <section id="features" className="landing-features" aria-labelledby="features-title">
          <h2 id="features-title" className="landing-section-title">Everything you need for group decisions</h2>
          <div className="landing-features-grid" role="list">
            <article className="landing-feature-card" role="listitem">
              <div className="landing-feature-icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h3 className="landing-feature-title">Brainstorm</h3>
              <p className="landing-feature-description">
                Collect ideas from your team in real-time. Everyone can contribute
                and see ideas as they're added.
              </p>
            </article>

            <article className="landing-feature-card" role="listitem">
              <div className="landing-feature-icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3 className="landing-feature-title">Vote & Rank</h3>
              <p className="landing-feature-description">
                Multiple voting methods including simple voting, weighted votes,
                Likert scales, and rank ordering.
              </p>
            </article>

            <article className="landing-feature-card" role="listitem">
              <div className="landing-feature-icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="landing-feature-title">Real-time Collaboration</h3>
              <p className="landing-feature-description">
                Share a link and collaborate live. See who's participating and
                watch results update instantly.
              </p>
            </article>

            <article className="landing-feature-card" role="listitem">
              <div className="landing-feature-icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <h3 className="landing-feature-title">Results & Analytics</h3>
              <p className="landing-feature-description">
                View aggregated results with clear visualizations. Understand
                how your team voted and reached consensus.
              </p>
            </article>
          </div>
        </section>

        <section id="how-it-works" className="landing-how-it-works" aria-labelledby="how-it-works-title">
          <h2 id="how-it-works-title" className="landing-section-title">How it Works</h2>
          <ol className="landing-steps">
            <li className="landing-step">
              <div className="landing-step-number" aria-hidden="true">1</div>
              <h3 className="landing-step-title">Create a Scroll</h3>
              <p className="landing-step-description">
                Set up your decision-making session with the modules you need.
              </p>
            </li>
            <li className="landing-step">
              <div className="landing-step-number" aria-hidden="true">2</div>
              <h3 className="landing-step-title">Share the Link</h3>
              <p className="landing-step-description">
                Invite participants with a simple link or QR code.
              </p>
            </li>
            <li className="landing-step">
              <div className="landing-step-number" aria-hidden="true">3</div>
              <h3 className="landing-step-title">Collaborate</h3>
              <p className="landing-step-description">
                Brainstorm ideas and vote together in real-time.
              </p>
            </li>
            <li className="landing-step">
              <div className="landing-step-number" aria-hidden="true">4</div>
              <h3 className="landing-step-title">View Results</h3>
              <p className="landing-step-description">
                See the final rankings and make your decision.
              </p>
            </li>
          </ol>
        </section>

        <section className="landing-cta-section">
          <h2 className="landing-cta-title">Ready to make better decisions?</h2>
          <p className="landing-cta-subtitle">
            Start collaborating with your team today.
          </p>
          <button
            className="landing-btn landing-btn-primary landing-btn-large"
            onClick={() => navigate('/auth')}
          >
            Get Started Free
          </button>
        </section>
      </main>

      <footer className="landing-footer" role="contentinfo">
        <div className="landing-footer-content">
          <Logo size="small" />
          <p className="landing-footer-copyright">
            &copy; {new Date().getFullYear()} Dopamine. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

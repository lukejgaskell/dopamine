import './Logo.css'

type LogoProps = {
  size?: 'small' | 'medium' | 'large'
  showText?: boolean
}

export function Logo({ size = 'medium', showText = true }: LogoProps) {
  return (
    <div className={`logo-container logo-${size}`}>
      <svg className="logo-icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logo-grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#a78bfa', stopOpacity: 1 }} />
          </linearGradient>
          <linearGradient id="logo-grad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#ec4899', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#f472b6', stopOpacity: 1 }} />
          </linearGradient>
          <linearGradient id="logo-grad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#22d3ee', stopOpacity: 1 }} />
          </linearGradient>
        </defs>

        <line x1="30" y1="35" x2="50" y2="50" stroke="#d1d5db" strokeWidth="3" opacity="0.5"/>
        <line x1="70" y1="35" x2="50" y2="50" stroke="#d1d5db" strokeWidth="3" opacity="0.5"/>
        <line x1="30" y1="65" x2="50" y2="50" stroke="#d1d5db" strokeWidth="3" opacity="0.5"/>
        <line x1="70" y1="65" x2="50" y2="50" stroke="#d1d5db" strokeWidth="3" opacity="0.5"/>

        <circle cx="30" cy="35" r="12" fill="url(#logo-grad1)" stroke="#fff" strokeWidth="2.5"/>
        <circle cx="70" cy="35" r="12" fill="url(#logo-grad2)" stroke="#fff" strokeWidth="2.5"/>
        <circle cx="30" cy="65" r="12" fill="url(#logo-grad3)" stroke="#fff" strokeWidth="2.5"/>
        <circle cx="70" cy="65" r="12" fill="url(#logo-grad1)" stroke="#fff" strokeWidth="2.5"/>
        <circle cx="50" cy="50" r="15" fill="url(#logo-grad2)" stroke="#fff" strokeWidth="3"/>
        <circle cx="50" cy="50" r="4" fill="#fff" opacity="0.9"/>
      </svg>
      {showText && (
        <span className="logo-text">dopamine</span>
      )}
    </div>
  )
}

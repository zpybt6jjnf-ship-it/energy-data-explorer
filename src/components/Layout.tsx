import { ReactNode, useState, useEffect } from 'react'
import Logo from './Logo'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [showWattTooltip, setShowWattTooltip] = useState(false)

  // Easter egg: Type "watt" anywhere
  useEffect(() => {
    let buffer = ''
    const handleKeyPress = (e: KeyboardEvent) => {
      buffer += e.key.toLowerCase()
      buffer = buffer.slice(-4) // Keep last 4 chars

      if (buffer === 'watt') {
        setShowWattTooltip(true)
        buffer = ''
        setTimeout(() => setShowWattTooltip(false), 2000)
      }
    }

    window.addEventListener('keypress', handleKeyPress)
    return () => window.removeEventListener('keypress', handleKeyPress)
  }, [])

  return (
    <>
      <header className="site-header">
        <div className="header-left">
          <Logo size={44} />
          <div className="header-brand">
            <a href="/" className="brand-name">Bottlenecks Labs</a>
            <span className="site-title">Energy Data Explorer</span>
          </div>
        </div>
      </header>

      {showWattTooltip && (
        <div className="watt-tooltip">⚡ Watt are you looking for? ⚡</div>
      )}

      {children}

      <footer>
        <p>Energy Data Explorer · Bottlenecks Labs · Updated Jan 2025</p>
        <p className="footer-disclaimer">Demo project for portfolio purposes only</p>
      </footer>
    </>
  )
}

import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      <header className="site-header">
        <div className="header-left">
          <Link to="/" className="header-logo-link" aria-label="Go to homepage">
            <Logo size={44} />
          </Link>
          <div className="header-brand">
            <a href="/" className="brand-name">Bottlenecks Labs</a>
            <Link to="/" className="site-title">Energy Data Explorer</Link>
          </div>
        </div>
        <div className="header-right">
          <ThemeToggle />
        </div>
      </header>

      {children}

      <footer>
        <p>Energy Data Explorer · Bottlenecks Labs · Updated Jan 2026</p>
        <p className="footer-disclaimer">Demo project for portfolio purposes only</p>
      </footer>
    </>
  )
}

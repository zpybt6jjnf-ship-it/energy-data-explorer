import { ReactNode } from 'react'
import Logo from './Logo'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
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

      {children}

      <footer>
        <p>Energy Data Explorer · Bottlenecks Labs · Updated Jan 2026</p>
        <p className="footer-disclaimer">Demo project for portfolio purposes only</p>
      </footer>
    </>
  )
}

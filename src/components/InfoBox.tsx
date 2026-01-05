import { ReactNode } from 'react'

interface InfoBoxProps {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}

export default function InfoBox({ title, defaultOpen = true, children }: InfoBoxProps) {
  return (
    <details className="description-box" open={defaultOpen}>
      <summary className="description-toggle">
        <span>{title}</span>
        <span className="toggle-hint">Click to expand/collapse</span>
      </summary>
      <div className="description-content">
        {children}
      </div>
    </details>
  )
}

import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Content for the advanced/collapsible section */
  advancedContent?: ReactNode
  /** Label for the advanced toggle (default: "Advanced options") */
  advancedLabel?: string
  /** Whether advanced section is open by default */
  advancedDefaultOpen?: boolean
}

/**
 * Wrapper component for chart controls with consistent styling.
 * Provides main control row plus optional advanced collapsible section.
 */
export default function ChartControlsWrapper({
  children,
  advancedContent,
  advancedLabel = 'Advanced options',
  advancedDefaultOpen = false
}: Props) {
  return (
    <div className="controls-unified">
      <div className="control-row">
        {children}
      </div>

      {advancedContent && (
        <details open={advancedDefaultOpen}>
          <summary className="control-advanced-toggle">
            {advancedLabel}
          </summary>
          <div className="control-row">
            {advancedContent}
          </div>
        </details>
      )}
    </div>
  )
}

// ============================================
// Design System Constants (matching index.css)
// ============================================

// Core colors (from CSS variables)
export const COLORS = {
  ink: '#1a1a2e',
  inkLight: '#4a4a5a',
  inkMuted: '#8a8a9a',
  paper: '#ffffff',
  cream: '#faf8f5',
  border: '#e8e6e1',
  borderDark: '#d4d2cd',
  // Accent colors
  teal: '#2a9d8f',
  coral: '#e76f51',
  gold: '#e9c46a',
  navy: '#264653',
  sage: '#a7c4a0',
} as const

// Retro-inspired color palette for year-based coloring
export const RETRO_COLORS = [
  COLORS.teal,
  COLORS.coral,
  COLORS.gold,
  COLORS.navy,
  COLORS.sage,
  '#f4a261', // sandy
  '#9b5de5', // violet
  '#00bbf9', // sky
  '#00f5d4', // mint
  '#fee440', // yellow
  '#f15bb5', // pink
]

// Line chart colors (using accent palette)
export const LINE_COLORS = RETRO_COLORS

// Standard hover template for data points
export function buildHoverTemplate(fields: {
  state?: boolean
  year?: boolean
  saidi?: boolean
  vre?: boolean
  breakdown?: boolean
}) {
  const parts: string[] = []

  if (fields.state && fields.year) {
    parts.push('<b>%{customdata.state}</b> (%{customdata.year})<br><br>')
  } else if (fields.state) {
    parts.push('<b>%{customdata.state}</b><br><br>')
  }

  if (fields.saidi) {
    parts.push('SAIDI: %{customdata.saidi:.1f} min<br>')
  }

  if (fields.vre) {
    parts.push('VRE: %{customdata.vrePenetration:.1f}%<br>')
  }

  if (fields.breakdown) {
    parts.push('  ├ Wind: %{customdata.windPenetration:.1f}%<br>')
    parts.push('  └ Solar: %{customdata.solarPenetration:.1f}%')
  }

  parts.push('<extra></extra>')
  return parts.join('')
}

// Typography
const FONT_SANS = 'DM Sans, sans-serif'

// Standard layout configuration
export const baseLayout = {
  hovermode: 'closest' as const,
  hoverlabel: {
    bgcolor: COLORS.paper,
    bordercolor: COLORS.borderDark,
    font: { family: FONT_SANS, size: 12, color: COLORS.ink }
  },
  legend: {
    orientation: 'h' as const,
    y: -0.18,
    x: 0.5,
    xanchor: 'center' as const,
    font: { family: FONT_SANS, size: 11, color: COLORS.inkLight },
    bgcolor: 'transparent',
    borderwidth: 0
  },
  margin: { t: 10, r: 20, b: 100, l: 65 },
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  dragmode: 'zoom' as const
}

// Axis styling
export const axisStyle = {
  tickfont: { family: FONT_SANS, size: 11, color: COLORS.inkMuted },
  zeroline: false,
  gridcolor: COLORS.border,
  linecolor: COLORS.borderDark,
  showline: true
}

export const axisTitleStyle = {
  font: { family: FONT_SANS, size: 13, color: COLORS.inkLight }
}

// Standard Plotly config
export const baseConfig = {
  responsive: true,
  displayModeBar: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'] as ('lasso2d' | 'select2d' | 'autoScale2d')[]
}

// ============================================
// Formatting helpers for enhanced tooltips
// ============================================

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getRankSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

/**
 * Format a rank as ordinal (e.g., "#3 most reliable of 51")
 */
export function formatRank(rank: number, total: number, descriptor: string): string {
  const suffix = getRankSuffix(rank)
  return `#${rank}${suffix} ${descriptor} of ${total}`
}

/**
 * Format a percent delta with sign (e.g., "+15% vs avg" or "-8% vs avg")
 */
export function formatPercentDelta(value: number, average: number): string {
  if (average === 0) return '—'
  const delta = ((value - average) / average) * 100
  if (Math.abs(delta) < 0.5) return 'at avg'
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(0)}% vs avg`
}

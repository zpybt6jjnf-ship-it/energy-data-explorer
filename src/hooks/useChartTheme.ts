import { useMemo } from 'react'
import { useTheme } from '../context/ThemeContext'
import { getBaseLayout, getAxisStyle, getAxisTitleStyle, getThemeColors } from '../utils/plotly'

/**
 * Hook that provides theme-aware Plotly chart configuration.
 * Returns layout and style objects that update when theme changes.
 */
export function useChartTheme() {
  const { theme } = useTheme()

  return useMemo(() => ({
    baseLayout: getBaseLayout(),
    axisStyle: getAxisStyle(),
    axisTitleStyle: getAxisTitleStyle(),
    colors: getThemeColors(),
    isDark: theme === 'dark'
  }), [theme])
}

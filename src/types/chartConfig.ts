import { StateDataPoint, ChartFilters } from '../types'

/**
 * Configuration for a chart axis
 */
export interface AxisConfig {
  /** Field name from data point (e.g., 'vrePenetration', 'saidi') */
  field: keyof StateDataPoint | string
  /** Display label for the axis */
  label: string
  /** Suffix for tick labels (e.g., '%', '¢') */
  suffix?: string
  /** Number format (e.g., '.1f', '.2f') */
  format?: string
}

/**
 * Configuration for metric toggle options
 */
export interface MetricOption {
  value: string
  label: string
  shortLabel?: string
  description: string
  unit: string
  format?: string // Number format for this metric
}

/**
 * Configuration for color-by options
 */
export interface ColorByOption {
  value: 'year' | 'region' | string
  label: string
}

/**
 * Feature flags for chart capabilities
 */
export interface ChartFeatures {
  /** Show trend line toggle */
  trendLine?: boolean
  /** Enable state/utility aggregation */
  aggregation?: boolean
  /** Enable utility-level view mode */
  utilityView?: boolean
  /** Enable axis swap */
  swapAxes?: boolean
  /** Show stats panel when trend line is enabled */
  statsPanel?: boolean
}

/**
 * Configuration for scatter chart
 */
export interface ScatterChartConfig {
  /** Unique chart identifier */
  id: string
  /** Chart title */
  title: string
  /** Chart subtitle - explanatory sentence under title */
  subtitle?: string
  /** Chart subtitle template (can include {count}, {yearStart}, {yearEnd}, {correlation}) */
  subtitleTemplate?: string
  /** X-axis configuration */
  xAxis: AxisConfig
  /** Y-axis configuration */
  yAxis: AxisConfig
  /** Color-by options (region, year, etc.) */
  colorByOptions?: ColorByOption[]
  /** Metric toggle options (for charts with multiple Y metrics) */
  metrics?: MetricOption[]
  /** Default metric value */
  defaultMetric?: string
  /** Feature flags */
  features: ChartFeatures
  /** Description content for the "About this chart" section */
  description?: {
    whatMeasuring: { term: string; definition: string }[]
    whyCompare: string
    caveat?: string
  }
  /** Export filename prefix */
  exportFilename?: string
}

/**
 * Configuration for line/time series chart
 */
export interface LineChartConfig {
  /** Unique chart identifier */
  id: string
  /** Chart title */
  title: string
  /** Chart subtitle */
  subtitle?: string
  /** X-axis configuration (typically year) */
  xAxis: AxisConfig
  /** Y-axis configuration */
  yAxis: AxisConfig
  /** Metric toggle options */
  metrics?: MetricOption[]
  /** Default metric value */
  defaultMetric?: string
  /** Feature flags */
  features: ChartFeatures
  /** Description content */
  description?: {
    whatMeasuring: { term: string; definition: string }[]
    whyCompare: string
    caveat?: string
  }
  /** Export filename prefix */
  exportFilename?: string
}

/**
 * Configuration for a series in stacked area charts
 */
export interface SeriesConfig {
  field: keyof StateDataPoint | string
  label: string
  color: string
}

/**
 * Configuration for stacked area chart
 */
export interface StackedAreaChartConfig {
  /** Unique chart identifier */
  id: string
  /** Chart title */
  title: string
  /** Chart subtitle */
  subtitle?: string
  /** X-axis configuration (typically year) */
  xAxis: AxisConfig
  /** Y-axis configuration */
  yAxis: AxisConfig
  /** Series definitions for stacking */
  series: SeriesConfig[]
  /** Whether to show as percentage (stacked 100%) or absolute values */
  showAsPercentage?: boolean
  /** Feature flags */
  features: ChartFeatures
  /** Description content */
  description?: {
    whatMeasuring: { term: string; definition: string }[]
    whyCompare: string
    caveat?: string
  }
  /** Export filename prefix */
  exportFilename?: string
}

/**
 * Common props passed to chart components
 */
export interface BaseChartProps<TConfig> {
  config: TConfig
  data: { points: StateDataPoint[]; metadata: { yearsAvailable: number[]; states: string[] } }
  filters: ChartFilters
  onFilterChange: (updates: Partial<ChartFilters>) => void
  onResetViewport?: () => void
}

/**
 * Helper type for extracting metric value from a data point
 */
export type MetricGetter<T> = (point: T, metricKey: string) => number | null

/**
 * Centralized metric definitions for the data explorer.
 * Provides consistent labels, units, and descriptions across all charts.
 */

export interface MetricDefinition {
  id: string
  label: string
  shortLabel: string
  unit: string
  description: string
  format: string // d3-format string
}

/**
 * Reliability metrics (SAIDI, SAIFI)
 */
export const RELIABILITY_METRICS: Record<string, MetricDefinition> = {
  saidi: {
    id: 'saidi',
    label: 'SAIDI',
    shortLabel: 'SAIDI',
    unit: 'minutes',
    description: 'System Average Interruption Duration Index - average outage duration per customer per year',
    format: '.1f'
  },
  saifi: {
    id: 'saifi',
    label: 'SAIFI',
    shortLabel: 'SAIFI',
    unit: 'interruptions',
    description: 'System Average Interruption Frequency Index - average number of interruptions per customer per year',
    format: '.2f'
  }
}

/**
 * Rate/price metrics
 */
export const RATE_METRICS: Record<string, MetricDefinition> = {
  residential: {
    id: 'residential',
    label: 'Residential Rate',
    shortLabel: 'Residential',
    unit: '¢/kWh',
    description: 'Average retail electricity rate for residential customers',
    format: '.2f'
  },
  commercial: {
    id: 'commercial',
    label: 'Commercial Rate',
    shortLabel: 'Commercial',
    unit: '¢/kWh',
    description: 'Average retail electricity rate for commercial customers',
    format: '.2f'
  },
  industrial: {
    id: 'industrial',
    label: 'Industrial Rate',
    shortLabel: 'Industrial',
    unit: '¢/kWh',
    description: 'Average retail electricity rate for industrial customers',
    format: '.2f'
  },
  average: {
    id: 'average',
    label: 'Average Rate',
    shortLabel: 'Average',
    unit: '¢/kWh',
    description: 'Average retail electricity rate across all sectors',
    format: '.2f'
  }
}

/**
 * Generation/penetration metrics
 */
export const GENERATION_METRICS: Record<string, MetricDefinition> = {
  vre: {
    id: 'vre',
    label: 'VRE Penetration',
    shortLabel: 'VRE',
    unit: '%',
    description: 'Variable Renewable Energy (wind + solar) as share of total generation',
    format: '.1f'
  },
  wind: {
    id: 'wind',
    label: 'Wind Penetration',
    shortLabel: 'Wind',
    unit: '%',
    description: 'Wind generation as share of total generation',
    format: '.1f'
  },
  solar: {
    id: 'solar',
    label: 'Solar Penetration',
    shortLabel: 'Solar',
    unit: '%',
    description: 'Solar generation as share of total generation',
    format: '.1f'
  },
  naturalGas: {
    id: 'naturalGas',
    label: 'Natural Gas',
    shortLabel: 'Gas',
    unit: '%',
    description: 'Natural gas generation as share of total generation',
    format: '.1f'
  },
  coal: {
    id: 'coal',
    label: 'Coal',
    shortLabel: 'Coal',
    unit: '%',
    description: 'Coal generation as share of total generation',
    format: '.1f'
  },
  nuclear: {
    id: 'nuclear',
    label: 'Nuclear',
    shortLabel: 'Nuclear',
    unit: '%',
    description: 'Nuclear generation as share of total generation',
    format: '.1f'
  },
  hydro: {
    id: 'hydro',
    label: 'Hydroelectric',
    shortLabel: 'Hydro',
    unit: '%',
    description: 'Hydroelectric generation as share of total generation',
    format: '.1f'
  }
}

/**
 * Get metric definition by ID from any category
 */
export function getMetricById(id: string): MetricDefinition | undefined {
  return RELIABILITY_METRICS[id] || RATE_METRICS[id] || GENERATION_METRICS[id]
}

/**
 * Format a value using the metric's defined format
 */
export function formatMetricValue(value: number, metricId: string): string {
  const metric = getMetricById(metricId)
  if (!metric) return String(value)

  // Basic formatting based on format string
  const decimals = metric.format.includes('.') ?
    parseInt(metric.format.match(/\.(\d)/)?.[1] || '0') : 0

  return value.toFixed(decimals)
}

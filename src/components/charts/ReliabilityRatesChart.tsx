import BaseScatterChart from './BaseScatterChart'
import { ScatterChartConfig } from '../../types/chartConfig'
import { ChartData, ChartFilters } from '../../types'

interface Props {
  data: ChartData
  filters: ChartFilters
  onFilterChange: (filters: Partial<ChartFilters>) => void
  onResetViewport?: () => void
}

// Configuration for the Reliability vs Rates scatter chart
const RELIABILITY_RATES_CONFIG: ScatterChartConfig = {
  id: 'reliability-rates',
  title: 'Grid Reliability vs. Electricity Prices',
  subtitle: 'Do states with more expensive electricity have more reliable grids? Explore the relationship.',
  xAxis: {
    field: 'rateResidential',  // Default to residential rates
    label: 'Electricity Rate',
    suffix: '¢/kWh'
  },
  yAxis: {
    field: 'saidi',
    label: 'Outage Duration (minutes/customer/year)'
  },
  colorByOptions: [
    { value: 'region', label: 'Region' },
    { value: 'year', label: 'Year' }
  ],
  metrics: [
    {
      value: 'saidi',
      label: 'Outage Duration',
      shortLabel: 'Duration',
      description: 'Average outage minutes per customer per year (SAIDI)',
      unit: 'minutes',
      format: '.1f'
    },
    {
      value: 'saifi',
      label: 'Outage Frequency',
      shortLabel: 'Frequency',
      description: 'Average number of outages per customer per year (SAIFI)',
      unit: 'interruptions',
      format: '.2f'
    },
    {
      value: 'rateResidential',
      label: 'Residential Rate',
      shortLabel: 'Residential',
      description: 'Average retail electricity price for residential customers',
      unit: '¢/kWh',
      format: '.2f'
    },
    {
      value: 'rateCommercial',
      label: 'Commercial Rate',
      shortLabel: 'Commercial',
      description: 'Average retail electricity price for commercial customers',
      unit: '¢/kWh',
      format: '.2f'
    },
    {
      value: 'rateIndustrial',
      label: 'Industrial Rate',
      shortLabel: 'Industrial',
      description: 'Average retail electricity price for industrial customers',
      unit: '¢/kWh',
      format: '.2f'
    },
    {
      value: 'rateAll',
      label: 'All-Sector Rate',
      shortLabel: 'All Sectors',
      description: 'Average retail electricity price across all customer sectors',
      unit: '¢/kWh',
      format: '.2f'
    }
  ],
  defaultMetric: 'saidi',
  features: {
    trendLine: true,
    aggregation: false,
    utilityView: false,
    swapAxes: true,
    statsPanel: true
  },
  description: {
    whatMeasuring: [
      {
        term: 'SAIDI (System Average Interruption Duration Index)',
        definition: 'The average number of minutes per year that a customer experiences a power outage. Lower values indicate more reliable grid service.'
      },
      {
        term: 'SAIFI (System Average Interruption Frequency Index)',
        definition: 'The average number of power interruptions per customer per year. Lower values indicate fewer outage events.'
      },
      {
        term: 'Electricity Rate',
        definition: 'The average retail price of electricity in cents per kilowatt-hour. Rates vary by customer sector (residential, commercial, industrial).'
      }
    ],
    whyCompare: 'One might expect states with higher electricity rates to invest more in grid infrastructure, potentially leading to better reliability. Alternatively, high rates could reflect aging infrastructure requiring costly maintenance. This visualization explores whether any relationship exists.',
    caveat: 'Note: Correlation does not imply causation. Many factors affect both electricity prices and reliability including geography, fuel mix, regulation, and weather.'
  },
  exportFilename: 'reliability-rates'
}

export default function ReliabilityRatesChart({ data, filters, onFilterChange, onResetViewport }: Props) {
  // Filter out points with missing rate data
  const filteredData = {
    ...data,
    points: data.points.filter(p => p.rateResidential !== null)
  }

  return (
    <BaseScatterChart
      config={RELIABILITY_RATES_CONFIG}
      data={filteredData}
      filters={filters}
      onFilterChange={onFilterChange}
      onResetViewport={onResetViewport}
    />
  )
}

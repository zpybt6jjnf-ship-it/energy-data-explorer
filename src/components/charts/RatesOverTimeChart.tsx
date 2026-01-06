import BaseLineChart from './BaseLineChart'
import { LineChartConfig } from '../../types/chartConfig'
import { ChartData, ChartFilters } from '../../types'

interface Props {
  data: ChartData
  filters: ChartFilters
  onFilterChange: (filters: Partial<ChartFilters>) => void
  onResetViewport?: () => void
}

// Configuration for the Rates Over Time line chart
const RATES_TIME_CONFIG: LineChartConfig = {
  id: 'rates-time',
  title: 'Electricity Rate Trends by State',
  subtitle: 'How have electricity prices changed over time? Select states to compare.',
  xAxis: {
    field: 'year',
    label: 'Year'
  },
  yAxis: {
    field: 'rateResidential',
    label: '{metric} Rate (¢/kWh)',
    suffix: '¢',
    format: '.2f'
  },
  metrics: [
    {
      value: 'rateResidential',
      label: 'Residential',
      shortLabel: 'Residential',
      description: 'Average price paid by households',
      unit: '¢/kWh',
      format: '.2f'
    },
    {
      value: 'rateCommercial',
      label: 'Commercial',
      shortLabel: 'Commercial',
      description: 'Average price paid by businesses',
      unit: '¢/kWh',
      format: '.2f'
    },
    {
      value: 'rateIndustrial',
      label: 'Industrial',
      shortLabel: 'Industrial',
      description: 'Average price paid by industrial users',
      unit: '¢/kWh',
      format: '.2f'
    },
    {
      value: 'rateAll',
      label: 'All Sectors',
      shortLabel: 'All',
      description: 'Average price across all customer types',
      unit: '¢/kWh',
      format: '.2f'
    }
  ],
  defaultMetric: 'rateResidential',
  features: {},
  description: {
    whatMeasuring: [
      {
        term: 'Residential Rate',
        definition: 'The average retail price of electricity in cents per kilowatt-hour (¢/kWh) paid by residential customers—households and apartments. This is typically the highest rate due to lower volume and higher distribution costs per customer.'
      },
      {
        term: 'Commercial & Industrial Rates',
        definition: 'Average prices paid by businesses (commercial) and manufacturing/industrial facilities. These rates are typically lower due to higher volume usage and often include demand charges based on peak consumption.'
      }
    ],
    whyCompare: 'Tracking electricity rates over time helps identify trends in energy costs and how they vary across states. This can reveal the impact of fuel price changes, regulatory policies, infrastructure investments, and shifts in generation mix.',
    caveat: 'Note: Rates are influenced by many factors including fuel costs, infrastructure age, market structure, labor costs, weather patterns, and state regulatory policies. State averages may mask significant variation between utilities within a state.'
  },
  exportFilename: 'rates-time'
}

export default function RatesOverTimeChart({ data, filters, onFilterChange, onResetViewport }: Props) {
  return (
    <BaseLineChart
      config={RATES_TIME_CONFIG}
      data={data}
      filters={filters}
      onFilterChange={onFilterChange}
      onResetViewport={onResetViewport}
      defaultStateCount={5}
    />
  )
}

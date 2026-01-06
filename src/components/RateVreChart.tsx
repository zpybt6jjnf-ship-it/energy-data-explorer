import BaseScatterChart from './charts/BaseScatterChart'
import { ScatterChartConfig } from '../types/chartConfig'
import { ChartData, ChartFilters } from '../types'

interface Props {
  data: ChartData
  filters: ChartFilters
  onFilterChange: (filters: Partial<ChartFilters>) => void
  onResetViewport?: () => void
}

// Configuration for the Rates vs VRE scatter chart
const RATES_CONFIG: ScatterChartConfig = {
  id: 'rate-vre',
  title: 'Electricity Rates vs. Renewable Energy',
  subtitle: 'Does more renewable energy mean higher electricity prices? See what the data shows.',
  xAxis: {
    field: 'vrePenetration',
    label: 'Renewable Energy Share',
    suffix: '%'
  },
  yAxis: {
    field: 'rateResidential',
    label: 'Electricity Rate (¢/kWh)',
    suffix: '¢',
    format: '.1f'
  },
  colorByOptions: [
    { value: 'region', label: 'Region' },
    { value: 'year', label: 'Year' }
  ],
  // No metrics switching for rates chart - just uses residential rate
  features: {
    trendLine: true,
    aggregation: true,
    utilityView: true,
    swapAxes: true,
    statsPanel: true
  },
  description: {
    whatMeasuring: [
      {
        term: 'Electricity Rate (¢/kWh)',
        definition: 'Average retail price of electricity in cents per kilowatt-hour. This chart shows residential rates by default—the price households pay for electricity. Rates vary significantly by state due to differences in fuel mix, infrastructure costs, and regulatory policies.'
      },
      {
        term: 'VRE Penetration (Variable Renewable Energy)',
        definition: 'The percentage of a state\'s electricity generation from wind and solar sources. States like Iowa and Kansas exceed 40% VRE, while others remain below 5%.'
      }
    ],
    whyCompare: 'A common question is whether renewable energy is related to electricity costs. This visualization allows you to explore the relationship between renewable penetration and retail electricity rates across U.S. states.',
    caveat: 'Note: Electricity rates are influenced by many factors including fuel costs, infrastructure age, market structure, labor costs, weather patterns, and state regulatory policies. Correlation does not imply causation.'
  },
  exportFilename: 'rates-vre'
}

export default function RateVreChart({ data, filters, onFilterChange, onResetViewport }: Props) {
  return (
    <BaseScatterChart
      config={RATES_CONFIG}
      data={data}
      filters={filters}
      onFilterChange={onFilterChange}
      onResetViewport={onResetViewport}
    />
  )
}

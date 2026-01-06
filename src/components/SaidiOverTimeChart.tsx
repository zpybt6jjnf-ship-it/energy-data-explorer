import BaseLineChart from './charts/BaseLineChart'
import { LineChartConfig } from '../types/chartConfig'
import { ChartData, ChartFilters } from '../types'

interface Props {
  data: ChartData
  filters: ChartFilters
  onFilterChange: (filters: Partial<ChartFilters>) => void
  onResetViewport?: () => void
}

// Configuration for the Reliability Over Time line chart
const RELIABILITY_TIME_CONFIG: LineChartConfig = {
  id: 'saidi-time',
  title: 'Reliability Trends by State',
  subtitle: 'How has outage duration changed over time? Select states to compare.',
  xAxis: {
    field: 'year',
    label: 'Year'
  },
  yAxis: {
    field: 'saidi',
    label: '{metric} — Higher = worse reliability'
  },
  metrics: [
    {
      value: 'saidi',
      label: 'SAIDI (Duration)',
      shortLabel: 'Duration',
      description: 'Outage minutes per customer',
      unit: 'minutes',
      format: '.1f'
    },
    {
      value: 'saifi',
      label: 'SAIFI (Frequency)',
      shortLabel: 'Frequency',
      description: 'Outages per customer',
      unit: 'interruptions',
      format: '.2f'
    }
  ],
  defaultMetric: 'saidi',
  features: {},
  description: {
    whatMeasuring: [
      {
        term: 'SAIDI (System Average Interruption Duration Index)',
        definition: 'The average number of minutes per year that a customer experiences a power outage. Lower values indicate more reliable grid service.'
      },
      {
        term: 'SAIFI (System Average Interruption Frequency Index)',
        definition: 'The average number of power interruptions per customer per year. Lower values indicate fewer outage events, regardless of duration.'
      }
    ],
    whyCompare: 'Understanding how grid reliability evolves helps identify whether states are improving or declining in service quality, and whether changes correlate with policy decisions, infrastructure investments, or shifts in generation mix.',
    caveat: 'Note: Grid reliability is affected by many factors including infrastructure age, weather patterns, investment levels, and grid management practices.'
  },
  exportFilename: 'reliability-time'
}

export default function SaidiOverTimeChart({ data, filters, onFilterChange, onResetViewport }: Props) {
  return (
    <BaseLineChart
      config={RELIABILITY_TIME_CONFIG}
      data={data}
      filters={filters}
      onFilterChange={onFilterChange}
      onResetViewport={onResetViewport}
      defaultStateCount={5}
    />
  )
}

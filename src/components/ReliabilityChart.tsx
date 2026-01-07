import { useState, useCallback } from 'react'
import BaseScatterChart from './charts/BaseScatterChart'
import { ScatterChartConfig } from '../types/chartConfig'
import { ChartData, ChartFilters, StateDataPoint } from '../types'

interface Props {
  data: ChartData
  filters: ChartFilters
  onFilterChange: (filters: Partial<ChartFilters>) => void
  onResetViewport?: () => void
}

// Configuration for the Reliability vs VRE scatter chart
const RELIABILITY_CONFIG: ScatterChartConfig = {
  id: 'saidi-vre',
  title: 'Grid Reliability vs. Renewable Energy',
  subtitle: 'Do states with more wind and solar experience more outages? Explore the data.',
  xAxis: {
    field: 'vrePenetration',
    label: 'Renewable Energy Share',
    suffix: '%'
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
    }
  ],
  defaultMetric: 'saidi',
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
        term: 'SAIDI (System Average Interruption Duration Index)',
        definition: 'The average number of minutes per year that a customer experiences a power outage. Lower values indicate more reliable grid service.'
      },
      {
        term: 'SAIFI (System Average Interruption Frequency Index)',
        definition: 'The average number of power interruptions per customer per year. Lower values indicate fewer outage events, regardless of duration.'
      },
      {
        term: 'VRE Penetration (Variable Renewable Energy)',
        definition: 'The percentage of a state\'s electricity generation from wind and solar sources.'
      }
    ],
    whyCompare: 'A common question is whether integrating variable sources like wind and solar affects grid stability. This visualization explores whether states with higher renewable penetration actually experience different reliability outcomes.',
    caveat: 'Note: Correlation does not imply causation. Grid reliability is affected by many factors including infrastructure age, weather patterns, and investment levels.'
  },
  exportFilename: 'reliability-vre'
}

export default function ReliabilityChart({ data, filters, onFilterChange, onResetViewport }: Props) {
  // Easter egg state: Texas 2021 winter storm
  const [showSnowflake, setShowSnowflake] = useState(false)

  // Handle point click to trigger easter egg
  const handlePointClick = useCallback((stateCode: string, year: number, _point: StateDataPoint) => {
    if (stateCode === 'TX' && year === 2021) {
      setShowSnowflake(true)
      setTimeout(() => setShowSnowflake(false), 5000)
    }
  }, [])

  // Render easter egg overlay
  const renderAfterChart = useCallback(() => {
    if (!showSnowflake) return null

    return (
      <div className="snowflake-overlay">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`snowflake snowflake-${i}`}>❄</div>
        ))}
        <div className="brrr-text">brrrr</div>
      </div>
    )
  }, [showSnowflake])

  return (
    <BaseScatterChart
      config={RELIABILITY_CONFIG}
      data={data}
      filters={filters}
      onFilterChange={onFilterChange}
      onResetViewport={onResetViewport}
      onPointClick={handlePointClick}
      renderAfterChart={renderAfterChart}
    />
  )
}

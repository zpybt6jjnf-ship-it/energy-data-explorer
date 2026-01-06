import { useState } from 'react'
import BaseStackedAreaChart from './BaseStackedAreaChart'
import { StackedAreaChartConfig } from '../../types/chartConfig'
import { ChartData, ChartFilters } from '../../types'

interface Props {
  data: ChartData
  filters: ChartFilters
  onFilterChange: (filters: Partial<ChartFilters>) => void
  onResetViewport?: () => void
}

// OWID-inspired color palette for energy sources
const ENERGY_COLORS = {
  coal: '#4d4d4d',      // Dark gray
  gas: '#eb6b6b',       // Red/pink (natural gas)
  nuclear: '#f18e5b',   // Orange
  hydro: '#4c97d0',     // Blue
  wind: '#65c295',      // Green
  solar: '#f9d057',     // Yellow
  other: '#9d8ec7'      // Purple (geothermal, biomass, etc.)
}

// Configuration for the Energy Mix stacked area chart
const ENERGY_MIX_CONFIG: StackedAreaChartConfig = {
  id: 'energy-mix',
  title: 'Energy Generation Mix',
  subtitle: 'How has the electricity generation mix changed over time?',
  xAxis: {
    field: 'year',
    label: 'Year'
  },
  yAxis: {
    field: 'totalGeneration',
    label: 'Generation (MWh)'
  },
  series: [
    { field: 'generationCoal', label: 'Coal', color: ENERGY_COLORS.coal },
    { field: 'generationGas', label: 'Natural Gas', color: ENERGY_COLORS.gas },
    { field: 'generationNuclear', label: 'Nuclear', color: ENERGY_COLORS.nuclear },
    { field: 'generationHydro', label: 'Hydroelectric', color: ENERGY_COLORS.hydro },
    { field: 'generationWind', label: 'Wind', color: ENERGY_COLORS.wind },
    { field: 'generationSolar', label: 'Solar', color: ENERGY_COLORS.solar },
    { field: 'generationOther', label: 'Other', color: ENERGY_COLORS.other }
  ],
  showAsPercentage: true, // Default to showing percentages
  features: {},
  description: {
    whatMeasuring: [
      {
        term: 'Generation Mix',
        definition: 'The share of electricity generation from different fuel sources. This shows how a state produces its electricity and how that mix changes over time as new generation sources are added and old plants retire.'
      },
      {
        term: 'Renewable vs. Fossil',
        definition: 'Wind, solar, and hydroelectric are considered renewable sources. Natural gas and coal are fossil fuels. Nuclear is carbon-free but not renewable. The transition from coal to natural gas and renewables is a major trend in U.S. electricity generation.'
      }
    ],
    whyCompare: 'Understanding a state\'s energy mix reveals its progress toward decarbonization, energy independence, and the reliability challenges it may face with different generation technologies.',
    caveat: 'Note: Generation mix varies significantly by state based on natural resources, historical infrastructure, and policy decisions. Some states have no nuclear or limited renewable potential.'
  },
  exportFilename: 'energy-mix'
}

export default function EnergyMixChart({ data, filters, onFilterChange, onResetViewport }: Props) {
  // Default to first state or CA as a common example
  const [selectedState, setSelectedState] = useState<string>(() => {
    const states = [...new Set(data.points.map(p => p.stateCode))].sort()
    return states.includes('CA') ? 'CA' : states[0] || 'CA'
  })

  return (
    <BaseStackedAreaChart
      config={ENERGY_MIX_CONFIG}
      data={data}
      filters={filters}
      onFilterChange={onFilterChange}
      onResetViewport={onResetViewport}
      selectedState={selectedState}
      onStateChange={setSelectedState}
    />
  )
}

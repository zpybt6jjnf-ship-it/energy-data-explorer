import { useState } from 'react'
import BaseStackedAreaChart, { AdvancedOptions } from './BaseStackedAreaChart'
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
  subtitle: 'How has the electricity generation mix changed over time? Select a region to explore.',
  xAxis: {
    field: 'year',
    label: 'Year'
  },
  yAxis: {
    field: 'totalGeneration',
    label: 'Generation (TWh)'
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
    whyCompare: 'Electricity generation mix determines grid emissions, fuel cost exposure, and infrastructure requirements.',
    caveat: 'Note: Generation mix varies significantly by state based on natural resources, historical infrastructure, and policy decisions. Some states have no nuclear or limited renewable potential.'
  },
  exportFilename: 'energy-mix'
}

export default function EnergyMixChart({ data, filters, onFilterChange, onResetViewport }: Props) {
  // Default to U.S. Total for national overview
  const [selectedRegion, setSelectedRegion] = useState<string>('US')

  // Display options state
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedOptions>({
    displayMode: 'percentage',
    groupBy: null
  })

  const handleAdvancedOptionsChange = (options: Partial<AdvancedOptions>) => {
    setAdvancedOptions(prev => ({ ...prev, ...options }))
  }

  return (
    <BaseStackedAreaChart
      config={ENERGY_MIX_CONFIG}
      data={data}
      filters={filters}
      onFilterChange={onFilterChange}
      onResetViewport={onResetViewport}
      selectedRegion={selectedRegion}
      onRegionChange={setSelectedRegion}
      advancedOptions={advancedOptions}
      onAdvancedOptionsChange={handleAdvancedOptionsChange}
    />
  )
}

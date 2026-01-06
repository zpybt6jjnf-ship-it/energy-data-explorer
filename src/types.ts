export interface StateDataPoint {
  state: string
  stateCode: string
  year: number
  saidi: number | null // System Average Interruption Duration Index (minutes)
  saifi: number | null // System Average Interruption Frequency Index
  vrePenetration: number // % of generation from wind + solar
  windPenetration: number
  solarPenetration: number
  totalGeneration: number // MWh
  customerCount: number
  region: string
  // Retail electricity rates (cents per kWh)
  rateResidential: number | null
  rateCommercial: number | null
  rateIndustrial: number | null
  rateAll: number | null
  // Generation by fuel type (MWh) for Energy Mix chart
  generationWind: number
  generationSolar: number
  generationGas: number
  generationCoal: number
  generationNuclear: number
  generationHydro: number
  generationOther: number
}

export interface UtilityDataPoint {
  utilityId: number
  utilityName: string
  state: string
  stateCode: string
  region: string
  ownership: string
  nercRegion: string
  primaryRto: string | null
  rtos: string[]
  year: number
  saidi: number | null
  saifi: number | null
  customers: number | null
  // State-level VRE for context
  stateVrePenetration: number
  stateWindPenetration: number
  stateSolarPenetration: number
}

export interface UtilityData {
  utilities: UtilityDataPoint[]
  metadata: {
    lastUpdated: string
    yearsAvailable: number[]
    ownershipTypes: string[]
    rtos: string[]
    totalUtilities: number
    dataSource: string
  }
}

export interface AggregatedDataPoint {
  groupId: string
  groupName: string
  year: number
  saidi: number | null
  saifi: number | null
  vrePenetration: number
  windPenetration: number
  solarPenetration: number
  totalCustomers: number
  memberCount: number // Number of states or utilities in the group
  members: string[] // State codes or utility IDs
}

export interface ChartData {
  points: StateDataPoint[]
  metadata: {
    lastUpdated: string
    yearsAvailable: number[]
    states: string[]
    regions: string[]
    dataSource: string
  }
}

export interface ChartFilters {
  yearStart: number
  yearEnd: number
  selectedStates: string[]
  colorBy: 'year' | 'region'
  showTrendLine: boolean
  reliabilityMetric: 'saidi' | 'saifi' | 'rateResidential' | 'rateCommercial' | 'rateIndustrial' | 'rateAll'
  swapAxes: boolean
  // View mode: states (default), utilities (individual utility points)
  viewMode: 'states' | 'utilities'
  // Aggregation settings
  groupBy: string | null           // Group category ID (e.g., 'rto-regions', 'market-structure')
  groupLevel: 'state' | 'utility'  // Whether grouping at state or utility level
  showGroupMembers: boolean        // Show individual state/utility points behind aggregated
  // Viewport state for shareable zoom/pan (scatter chart)
  xAxisRange: [number, number] | null
  yAxisRange: [number, number] | null
  // Viewport state for time chart
  timeXRange: [number, number] | null
  timeYRange: [number, number] | null
}

export interface TooltipData {
  state: string
  year: number
  saidi: number
  vrePenetration: number
  x: number
  y: number
}

// State to region mapping
export const STATE_REGIONS: Record<string, string> = {
  // Northeast
  CT: 'Northeast', ME: 'Northeast', MA: 'Northeast', NH: 'Northeast',
  RI: 'Northeast', VT: 'Northeast', NJ: 'Northeast', NY: 'Northeast', PA: 'Northeast',
  // Midwest
  IL: 'Midwest', IN: 'Midwest', MI: 'Midwest', OH: 'Midwest', WI: 'Midwest',
  IA: 'Midwest', KS: 'Midwest', MN: 'Midwest', MO: 'Midwest', NE: 'Midwest',
  ND: 'Midwest', SD: 'Midwest',
  // South
  DE: 'South', FL: 'South', GA: 'South', MD: 'South', NC: 'South',
  SC: 'South', VA: 'South', DC: 'South', WV: 'South', AL: 'South',
  KY: 'South', MS: 'South', TN: 'South', AR: 'South', LA: 'South',
  OK: 'South', TX: 'South',
  // West
  AZ: 'West', CO: 'West', ID: 'West', MT: 'West', NV: 'West',
  NM: 'West', UT: 'West', WY: 'West', AK: 'West', CA: 'West',
  HI: 'West', OR: 'West', WA: 'West'
}

export const REGION_COLORS: Record<string, string> = {
  Northeast: '#1f77b4',
  Midwest: '#ff7f0e',
  South: '#2ca02c',
  West: '#d62728'
}

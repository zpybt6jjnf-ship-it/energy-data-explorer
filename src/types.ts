export interface StateDataPoint {
  state: string
  stateCode: string
  year: number
  saidi: number // System Average Interruption Duration Index (minutes)
  saifi: number // System Average Interruption Frequency Index
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

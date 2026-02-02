import { describe, it, expect } from 'vitest'
import { aggregateStatesByGroup, aggregateUtilitiesByField, aggregateCategory, aggregateCategoryOverTime } from '../aggregation'
import { StateDataPoint, UtilityDataPoint } from '../../types'
import { GroupCategory, StateGroup } from '../../data/groups/stateGroups'

// Mock state data with all required fields
const mockStateData: StateDataPoint[] = [
  {
    state: 'California',
    stateCode: 'CA',
    year: 2022,
    region: 'Pacific',
    saidi: 120,
    saifi: 1.2,
    saidiWithMED: null,
    saifiWithMED: null,
    vrePenetration: 30,
    windPenetration: 10,
    solarPenetration: 20,
    totalGeneration: 200000,
    customerCount: 15000000,
    rateResidential: 22,
    rateCommercial: 18,
    rateIndustrial: 14,
    rateAll: 18,
    generationWind: 20000,
    generationSolar: 40000,
    generationGas: 80000,
    generationCoal: 10000,
    generationNuclear: 20000,
    generationHydro: 15000,
    generationOther: 15000
  },
  {
    state: 'Texas',
    stateCode: 'TX',
    year: 2022,
    region: 'Southwest',
    saidi: 150,
    saifi: 1.5,
    saidiWithMED: null,
    saifiWithMED: null,
    vrePenetration: 25,
    windPenetration: 20,
    solarPenetration: 5,
    totalGeneration: 450000,
    customerCount: 12000000,
    rateResidential: 12,
    rateCommercial: 10,
    rateIndustrial: 7,
    rateAll: 10,
    generationWind: 90000,
    generationSolar: 22500,
    generationGas: 180000,
    generationCoal: 90000,
    generationNuclear: 45000,
    generationHydro: 5000,
    generationOther: 17500
  },
  {
    state: 'California',
    stateCode: 'CA',
    year: 2023,
    region: 'Pacific',
    saidi: 110,
    saifi: 1.1,
    saidiWithMED: null,
    saifiWithMED: null,
    vrePenetration: 35,
    windPenetration: 12,
    solarPenetration: 23,
    totalGeneration: 210000,
    customerCount: 15500000,
    rateResidential: 24,
    rateCommercial: 20,
    rateIndustrial: 16,
    rateAll: 20,
    generationWind: 25200,
    generationSolar: 48300,
    generationGas: 75600,
    generationCoal: 8400,
    generationNuclear: 21000,
    generationHydro: 16800,
    generationOther: 14700
  }
]

// Mock utility data with all required fields
const mockUtilityData: UtilityDataPoint[] = [
  {
    utilityId: 1,
    utilityName: 'Utility A',
    state: 'California',
    stateCode: 'CA',
    region: 'Pacific',
    ownership: 'IOU',
    nercRegion: 'WECC',
    primaryRto: 'CAISO',
    rtos: ['CAISO'],
    year: 2022,
    saidi: 100,
    saifi: 1.0,
    saidiWithMED: null,
    saifiWithMED: null,
    customers: 5000000,
    stateVrePenetration: 30,
    stateWindPenetration: 10,
    stateSolarPenetration: 20
  },
  {
    utilityId: 2,
    utilityName: 'Utility B',
    state: 'California',
    stateCode: 'CA',
    region: 'Pacific',
    ownership: 'Municipal',
    nercRegion: 'WECC',
    primaryRto: 'CAISO',
    rtos: ['CAISO'],
    year: 2022,
    saidi: 150,
    saifi: 1.5,
    saidiWithMED: null,
    saifiWithMED: null,
    customers: 3000000,
    stateVrePenetration: 30,
    stateWindPenetration: 10,
    stateSolarPenetration: 20
  },
  {
    utilityId: 3,
    utilityName: 'Utility C',
    state: 'Texas',
    stateCode: 'TX',
    region: 'Southwest',
    ownership: 'IOU',
    nercRegion: 'TRE',
    primaryRto: 'ERCOT',
    rtos: ['ERCOT'],
    year: 2022,
    saidi: 200,
    saifi: 2.0,
    saidiWithMED: null,
    saifiWithMED: null,
    customers: 6000000,
    stateVrePenetration: 25,
    stateWindPenetration: 20,
    stateSolarPenetration: 5
  }
]

// Mock group definitions
const mockStateGroup: StateGroup = {
  id: 'west-coast',
  name: 'West Coast',
  description: 'West coast states',
  states: ['CA', 'OR', 'WA']
}

const mockCategory: GroupCategory = {
  id: 'test-regions',
  name: 'Test Regions',
  description: 'Test category',
  groups: [
    { id: 'west', name: 'West', description: 'Western states', states: ['CA'] },
    { id: 'south', name: 'South', description: 'Southern states', states: ['TX'] }
  ]
}

describe('aggregateStatesByGroup', () => {
  it('returns null for empty group', () => {
    const emptyGroup: StateGroup = { id: 'empty', name: 'Empty', description: 'Empty group', states: [] }
    const result = aggregateStatesByGroup(mockStateData, emptyGroup, 2022)
    expect(result).toBeNull()
  })

  it('returns null when no data matches year', () => {
    const result = aggregateStatesByGroup(mockStateData, mockStateGroup, 2020)
    expect(result).toBeNull()
  })

  it('aggregates single state correctly', () => {
    const singleStateGroup: StateGroup = { id: 'ca', name: 'California', description: 'CA only', states: ['CA'] }
    const result = aggregateStatesByGroup(mockStateData, singleStateGroup, 2022)

    expect(result).not.toBeNull()
    expect(result!.groupId).toBe('ca')
    expect(result!.groupName).toBe('California')
    expect(result!.year).toBe(2022)
    expect(result!.saidi).toBe(120)
    expect(result!.saifi).toBe(1.2)
    expect(result!.memberCount).toBe(1)
  })

  it('calculates customer-weighted average for SAIDI', () => {
    const twoStateGroup: StateGroup = { id: 'ca-tx', name: 'CA+TX', description: 'CA and TX', states: ['CA', 'TX'] }
    const result = aggregateStatesByGroup(mockStateData, twoStateGroup, 2022)

    expect(result).not.toBeNull()
    // CA: 120 * 15M, TX: 150 * 12M
    const expectedSaidi = (120 * 15000000 + 150 * 12000000) / (15000000 + 12000000)
    expect(result!.saidi).toBeCloseTo(expectedSaidi, 2)
  })

  it('calculates generation-weighted average for VRE', () => {
    const twoStateGroup: StateGroup = { id: 'ca-tx', name: 'CA+TX', description: 'CA and TX', states: ['CA', 'TX'] }
    const result = aggregateStatesByGroup(mockStateData, twoStateGroup, 2022)

    expect(result).not.toBeNull()
    // CA: 30% * 200k, TX: 25% * 450k
    const expectedVre = (30 * 200000 + 25 * 450000) / (200000 + 450000)
    expect(result!.vrePenetration).toBeCloseTo(expectedVre, 2)
  })

  it('tracks member states', () => {
    const twoStateGroup: StateGroup = { id: 'ca-tx', name: 'CA+TX', description: 'CA and TX', states: ['CA', 'TX'] }
    const result = aggregateStatesByGroup(mockStateData, twoStateGroup, 2022)

    expect(result).not.toBeNull()
    expect(result!.members).toContain('CA')
    expect(result!.members).toContain('TX')
    expect(result!.memberCount).toBe(2)
  })

  it('calculates total customers', () => {
    const twoStateGroup: StateGroup = { id: 'ca-tx', name: 'CA+TX', description: 'CA and TX', states: ['CA', 'TX'] }
    const result = aggregateStatesByGroup(mockStateData, twoStateGroup, 2022)

    expect(result).not.toBeNull()
    expect(result!.totalCustomers).toBe(27000000)
  })
})

describe('aggregateUtilitiesByField', () => {
  it('returns null for empty result', () => {
    const result = aggregateUtilitiesByField(
      mockUtilityData,
      'ownership',
      'NonExistent',
      'none',
      'None',
      2022
    )
    expect(result).toBeNull()
  })

  it('aggregates by ownership type', () => {
    const result = aggregateUtilitiesByField(
      mockUtilityData,
      'ownership',
      'IOU',
      'iou',
      'IOUs',
      2022
    )

    expect(result).not.toBeNull()
    expect(result!.groupId).toBe('iou')
    expect(result!.groupName).toBe('IOUs')
    expect(result!.memberCount).toBe(2)
  })

  it('calculates customer-weighted SAIDI', () => {
    const result = aggregateUtilitiesByField(
      mockUtilityData,
      'ownership',
      'IOU',
      'iou',
      'IOUs',
      2022
    )

    expect(result).not.toBeNull()
    // Utility A: 100 * 5M, Utility C: 200 * 6M
    const expectedSaidi = (100 * 5000000 + 200 * 6000000) / (5000000 + 6000000)
    expect(result!.saidi).toBeCloseTo(expectedSaidi, 2)
  })

  it('handles null field values', () => {
    const dataWithNull: UtilityDataPoint[] = [
      ...mockUtilityData,
      {
        utilityId: 4,
        utilityName: 'Utility D',
        state: 'Nevada',
        stateCode: 'NV',
        region: 'West',
        ownership: 'Coop',
        nercRegion: 'WECC',
        primaryRto: null,
        rtos: [],
        year: 2022,
        saidi: 180,
        saifi: 1.8,
        saidiWithMED: null,
        saifiWithMED: null,
        customers: 2000000,
        stateVrePenetration: 15,
        stateWindPenetration: 5,
        stateSolarPenetration: 10
      }
    ]

    const result = aggregateUtilitiesByField(
      dataWithNull,
      'primaryRto',
      null,
      'no-rto',
      'No RTO',
      2022
    )

    expect(result).not.toBeNull()
    expect(result!.memberCount).toBe(1)
  })
})

describe('aggregateCategory', () => {
  it('aggregates all groups in category', () => {
    const results = aggregateCategory(mockStateData, mockCategory, 2022)

    expect(results).toHaveLength(2)
    expect(results.map(r => r.groupId)).toContain('west')
    expect(results.map(r => r.groupId)).toContain('south')
  })

  it('filters out groups with no data', () => {
    const categoryWithEmpty: GroupCategory = {
      ...mockCategory,
      groups: [
        ...mockCategory.groups,
        { id: 'midwest', name: 'Midwest', description: 'Midwest states', states: ['IL', 'OH'] }
      ]
    }

    const results = aggregateCategory(mockStateData, categoryWithEmpty, 2022)
    expect(results).toHaveLength(2)
    expect(results.map(r => r.groupId)).not.toContain('midwest')
  })
})

describe('aggregateCategoryOverTime', () => {
  it('aggregates across multiple years', () => {
    const results = aggregateCategoryOverTime(mockStateData, mockCategory, [2022, 2023])

    expect(results.length).toBeGreaterThan(0)
    const years = [...new Set(results.map(r => r.year))]
    expect(years).toContain(2022)
    expect(years).toContain(2023)
  })

  it('handles years with partial data', () => {
    // 2022 has both CA and TX, 2023 only has CA
    const results = aggregateCategoryOverTime(mockStateData, mockCategory, [2022, 2023])

    const results2022 = results.filter(r => r.year === 2022)
    const results2023 = results.filter(r => r.year === 2023)

    expect(results2022).toHaveLength(2) // west and south
    expect(results2023).toHaveLength(1) // only west (CA)
  })
})

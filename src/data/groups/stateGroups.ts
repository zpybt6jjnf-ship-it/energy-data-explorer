/**
 * State-level group definitions for aggregation
 *
 * Sources:
 * - Market structure: EIA, FERC, state PUC data
 * - Census regions: US Census Bureau
 */

export interface StateGroup {
  id: string;
  name: string;
  description: string;
  states: string[]; // State codes
}

export interface GroupCategory {
  id: string;
  name: string;
  description: string;
  groups: StateGroup[];
}

/**
 * Market structure classification
 * Restructured states have retail choice and/or unbundled utilities
 * Vertically integrated states have traditional regulated utilities
 */
export const MARKET_STRUCTURE: GroupCategory = {
  id: 'market-structure',
  name: 'Market Structure',
  description: 'Classification by electricity market deregulation status',
  groups: [
    {
      id: 'restructured',
      name: 'Restructured/Deregulated',
      description: 'States with retail choice or competitive wholesale markets',
      states: [
        'CT', 'DE', 'DC', 'IL', 'ME', 'MD', 'MA', 'MI', 'NH', 'NJ',
        'NY', 'OH', 'PA', 'RI', 'TX'
      ]
    },
    {
      id: 'vertically-integrated',
      name: 'Vertically Integrated',
      description: 'States with traditional regulated utility structure',
      states: [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'FL', 'GA', 'HI', 'ID',
        'IN', 'IA', 'KS', 'KY', 'LA', 'MN', 'MS', 'MO', 'MT', 'NE',
        'NV', 'NM', 'NC', 'ND', 'OK', 'OR', 'SC', 'SD', 'TN', 'UT',
        'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
      ]
    }
  ]
};

/**
 * Census regions (US Census Bureau standard)
 */
export const CENSUS_REGIONS: GroupCategory = {
  id: 'census-regions',
  name: 'Census Regions',
  description: 'Standard US Census Bureau regional classifications',
  groups: [
    {
      id: 'northeast',
      name: 'Northeast',
      description: 'New England and Middle Atlantic states',
      states: ['CT', 'ME', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT']
    },
    {
      id: 'midwest',
      name: 'Midwest',
      description: 'East North Central and West North Central states',
      states: ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI']
    },
    {
      id: 'south',
      name: 'South',
      description: 'South Atlantic, East South Central, and West South Central states',
      states: [
        'AL', 'AR', 'DE', 'DC', 'FL', 'GA', 'KY', 'LA', 'MD', 'MS',
        'NC', 'OK', 'SC', 'TN', 'TX', 'VA', 'WV'
      ]
    },
    {
      id: 'west',
      name: 'West',
      description: 'Mountain and Pacific states',
      states: ['AK', 'AZ', 'CA', 'CO', 'HI', 'ID', 'MT', 'NV', 'NM', 'OR', 'UT', 'WA', 'WY']
    }
  ]
};

/**
 * RTO/ISO regions (state-level approximation)
 * Note: Many states span multiple RTOs. This uses primary RTO assignment.
 */
export const RTO_REGIONS: GroupCategory = {
  id: 'rto-regions',
  name: 'RTO/ISO Regions',
  description: 'Regional Transmission Organization membership (state-level approximation)',
  groups: [
    {
      id: 'pjm',
      name: 'PJM',
      description: 'PJM Interconnection (Mid-Atlantic, Midwest)',
      states: ['DE', 'DC', 'IL', 'IN', 'KY', 'MD', 'MI', 'NJ', 'NC', 'OH', 'PA', 'TN', 'VA', 'WV']
    },
    {
      id: 'miso',
      name: 'MISO',
      description: 'Midcontinent Independent System Operator',
      states: ['AR', 'IL', 'IN', 'IA', 'KY', 'LA', 'MI', 'MN', 'MS', 'MO', 'MT', 'ND', 'SD', 'TX', 'WI']
    },
    {
      id: 'ercot',
      name: 'ERCOT',
      description: 'Electric Reliability Council of Texas',
      states: ['TX']
    },
    {
      id: 'spp',
      name: 'SPP',
      description: 'Southwest Power Pool',
      states: ['AR', 'KS', 'LA', 'MO', 'NE', 'NM', 'ND', 'OK', 'SD', 'TX']
    },
    {
      id: 'caiso',
      name: 'CAISO',
      description: 'California Independent System Operator',
      states: ['CA']
    },
    {
      id: 'nyiso',
      name: 'NYISO',
      description: 'New York Independent System Operator',
      states: ['NY']
    },
    {
      id: 'isone',
      name: 'ISO-NE',
      description: 'ISO New England',
      states: ['CT', 'ME', 'MA', 'NH', 'RI', 'VT']
    },
    {
      id: 'non-rto',
      name: 'Non-RTO',
      description: 'States not primarily in an RTO (SERC, WECC)',
      states: ['AL', 'AK', 'AZ', 'CO', 'FL', 'GA', 'HI', 'ID', 'NV', 'NM', 'NC', 'OR', 'SC', 'TN', 'UT', 'WA', 'WY']
    }
  ]
};

/**
 * All state group categories
 */
export const STATE_GROUP_CATEGORIES: GroupCategory[] = [
  MARKET_STRUCTURE,
  CENSUS_REGIONS,
  RTO_REGIONS
];


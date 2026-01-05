/**
 * Utility-level group definitions for aggregation
 *
 * These groups work with the utility-level data from Form 861
 */

export interface UtilityGroupCategory {
  id: string;
  name: string;
  description: string;
  field: 'ownership' | 'primaryRto' | 'nercRegion';
  groups: UtilityGroup[];
}

export interface UtilityGroup {
  id: string;
  name: string;
  description: string;
  values: (string | null)[]; // Values to match in the field
}

/**
 * Ownership type classification
 */
export const OWNERSHIP_TYPES: UtilityGroupCategory = {
  id: 'ownership',
  name: 'Ownership Type',
  description: 'Classification by utility ownership structure',
  field: 'ownership',
  groups: [
    {
      id: 'iou',
      name: 'Investor-Owned Utilities',
      description: 'Privately owned, for-profit utilities',
      values: ['Investor Owned']
    },
    {
      id: 'cooperative',
      name: 'Cooperatives',
      description: 'Member-owned rural and suburban utilities',
      values: ['Cooperative']
    },
    {
      id: 'municipal',
      name: 'Municipal Utilities',
      description: 'City or town-owned public utilities',
      values: ['Municipal']
    },
    {
      id: 'public-other',
      name: 'Other Public',
      description: 'Political subdivisions, state, and federal utilities',
      values: ['Political Subdivision', 'State', 'Federal']
    }
  ]
};

/**
 * RTO membership classification (utility-level)
 */
export const RTO_MEMBERSHIP: UtilityGroupCategory = {
  id: 'rto',
  name: 'RTO/ISO Membership',
  description: 'Regional Transmission Organization membership',
  field: 'primaryRto',
  groups: [
    {
      id: 'pjm',
      name: 'PJM',
      description: 'PJM Interconnection',
      values: ['PJM']
    },
    {
      id: 'miso',
      name: 'MISO',
      description: 'Midcontinent ISO',
      values: ['MISO']
    },
    {
      id: 'ercot',
      name: 'ERCOT',
      description: 'ERCOT (Texas)',
      values: ['ERCOT']
    },
    {
      id: 'spp',
      name: 'SPP',
      description: 'Southwest Power Pool',
      values: ['SPP']
    },
    {
      id: 'caiso',
      name: 'CAISO',
      description: 'California ISO',
      values: ['CAISO']
    },
    {
      id: 'nyiso',
      name: 'NYISO',
      description: 'New York ISO',
      values: ['NYISO']
    },
    {
      id: 'isone',
      name: 'ISO-NE',
      description: 'ISO New England',
      values: ['ISO-NE']
    },
    {
      id: 'non-rto',
      name: 'Non-RTO',
      description: 'Utilities not in an RTO',
      values: [null, ''] // null or empty string
    }
  ]
};

/**
 * NERC region classification
 */
export const NERC_REGIONS: UtilityGroupCategory = {
  id: 'nerc',
  name: 'NERC Region',
  description: 'North American Electric Reliability Corporation regions',
  field: 'nercRegion',
  groups: [
    {
      id: 'mro',
      name: 'MRO',
      description: 'Midwest Reliability Organization',
      values: ['MRO']
    },
    {
      id: 'npcc',
      name: 'NPCC',
      description: 'Northeast Power Coordinating Council',
      values: ['NPCC']
    },
    {
      id: 'rfc',
      name: 'RFC',
      description: 'ReliabilityFirst Corporation',
      values: ['RFC']
    },
    {
      id: 'serc',
      name: 'SERC',
      description: 'SERC Reliability Corporation',
      values: ['SERC']
    },
    {
      id: 'tre',
      name: 'TRE',
      description: 'Texas Reliability Entity',
      values: ['TRE']
    },
    {
      id: 'wecc',
      name: 'WECC',
      description: 'Western Electricity Coordinating Council',
      values: ['WECC']
    }
  ]
};

/**
 * All utility group categories
 */
export const UTILITY_GROUP_CATEGORIES: UtilityGroupCategory[] = [
  OWNERSHIP_TYPES,
  RTO_MEMBERSHIP,
  NERC_REGIONS
];

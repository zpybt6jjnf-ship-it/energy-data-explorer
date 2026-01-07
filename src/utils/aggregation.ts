/**
 * Aggregation utilities for state and utility-level data
 *
 * Supports weighted averaging:
 * - SAIDI/SAIFI: Customer-weighted
 * - Rates: Sales-weighted (approximated by customer count)
 * - VRE penetration: Generation-weighted
 */

import { StateDataPoint, UtilityDataPoint, AggregatedDataPoint } from '../types';
import { StateGroup, GroupCategory } from '../data/groups/stateGroups';

/**
 * Calculate customer-weighted average for reliability metrics
 */
function weightedAverage(
  values: (number | null)[],
  weights: (number | null)[]
): number | null {
  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    const weight = weights[i] ?? 1; // Default weight of 1 if not available

    if (value !== null && value !== undefined && !isNaN(value)) {
      weightedSum += value * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return null;
  return weightedSum / totalWeight;
}

/**
 * Aggregate state-level data points by a state group definition
 */
export function aggregateStatesByGroup(
  data: StateDataPoint[],
  group: StateGroup,
  year: number
): AggregatedDataPoint | null {
  // Filter data to group members and specific year
  const groupData = data.filter(
    d => group.states.includes(d.stateCode) && d.year === year
  );

  if (groupData.length === 0) return null;

  // Calculate weighted averages
  // Use totalGeneration as weight for VRE (generation-weighted)
  // Use customerCount as weight for SAIDI (customer-weighted), but fall back to equal weights
  const hasCustomerData = groupData.some(d => d.customerCount > 0);
  const saidiWeights = hasCustomerData
    ? groupData.map(d => d.customerCount || 1)
    : groupData.map(() => 1);

  const generationWeights = groupData.map(d => d.totalGeneration || 1);

  return {
    groupId: group.id,
    groupName: group.name,
    year,
    saidi: weightedAverage(
      groupData.map(d => d.saidi),
      saidiWeights
    ),
    saifi: weightedAverage(
      groupData.map(d => d.saifi),
      saidiWeights
    ),
    vrePenetration: weightedAverage(
      groupData.map(d => d.vrePenetration),
      generationWeights
    ) ?? 0,
    windPenetration: weightedAverage(
      groupData.map(d => d.windPenetration),
      generationWeights
    ) ?? 0,
    solarPenetration: weightedAverage(
      groupData.map(d => d.solarPenetration),
      generationWeights
    ) ?? 0,
    totalCustomers: groupData.reduce((sum, d) => sum + (d.customerCount || 0), 0),
    memberCount: groupData.length,
    members: groupData.map(d => d.stateCode)
  };
}

/**
 * Aggregate utility-level data by ownership type, RTO, or other field
 */
export function aggregateUtilitiesByField(
  data: UtilityDataPoint[],
  fieldName: keyof UtilityDataPoint,
  fieldValue: string | null,
  groupId: string,
  groupName: string,
  year: number
): AggregatedDataPoint | null {
  // Filter by field value and year
  const groupData = data.filter(d => {
    if (d.year !== year) return false;

    const value = d[fieldName];

    // Handle null matching
    if (fieldValue === null || fieldValue === '') {
      return value === null || value === '' || value === undefined;
    }

    return value === fieldValue;
  });

  if (groupData.length === 0) return null;

  // Use customer counts for weighting
  const weights = groupData.map(d => d.customers ?? 1);

  return {
    groupId,
    groupName,
    year,
    saidi: weightedAverage(
      groupData.map(d => d.saidi),
      weights
    ),
    saifi: weightedAverage(
      groupData.map(d => d.saifi),
      weights
    ),
    // For utilities, use state-level VRE (customer-weighted)
    vrePenetration: weightedAverage(
      groupData.map(d => d.stateVrePenetration),
      weights
    ) ?? 0,
    windPenetration: weightedAverage(
      groupData.map(d => d.stateWindPenetration),
      weights
    ) ?? 0,
    solarPenetration: weightedAverage(
      groupData.map(d => d.stateSolarPenetration),
      weights
    ) ?? 0,
    totalCustomers: groupData.reduce((sum, d) => sum + (d.customers ?? 0), 0),
    memberCount: groupData.length,
    members: groupData.map(d => String(d.utilityId))
  };
}

/**
 * Aggregate all groups in a category for a specific year
 */
export function aggregateCategory(
  data: StateDataPoint[],
  category: GroupCategory,
  year: number
): AggregatedDataPoint[] {
  return category.groups
    .map(group => aggregateStatesByGroup(data, group, year))
    .filter((result): result is AggregatedDataPoint => result !== null);
}

/**
 * Aggregate data for multiple years
 */
export function aggregateCategoryOverTime(
  data: StateDataPoint[],
  category: GroupCategory,
  years: number[]
): AggregatedDataPoint[] {
  const results: AggregatedDataPoint[] = [];

  for (const year of years) {
    results.push(...aggregateCategory(data, category, year));
  }

  return results;
}


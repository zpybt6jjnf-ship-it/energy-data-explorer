/**
 * GroupSelector component for state/utility aggregation
 *
 * Allows users to select preset groups at either state or utility level
 * and see aggregated data points on charts.
 */

import { useMemo } from 'react'
import { STATE_GROUP_CATEGORIES, GroupCategory } from '../../data/groups/stateGroups'
import { UTILITY_GROUP_CATEGORIES, UtilityGroupCategory } from '../../data/groups/utilityGroups'

export type AggregationLevel = 'state' | 'utility'

export interface GroupSelection {
  categoryId: string | null  // null = no grouping (show individual states)
  level: AggregationLevel    // Whether this is a state or utility level group
  showMembers: boolean       // Show individual state/utility points behind aggregated
}

interface Props {
  selection: GroupSelection
  onChange: (selection: GroupSelection) => void
}

// Combined option type for both state and utility groups
interface GroupOption {
  value: string        // categoryId
  label: string        // Display name
  description: string  // Tooltip text
  groupCount: number   // Number of groups in category
  level: AggregationLevel
}

export default function GroupSelector({ selection, onChange }: Props) {
  // Combine state and utility options
  const options: GroupOption[] = useMemo(() => {
    const stateOptions = STATE_GROUP_CATEGORIES.map(cat => ({
      value: cat.id,
      label: cat.name,
      description: cat.description,
      groupCount: cat.groups.length,
      level: 'state' as const
    }))

    const utilityOptions = UTILITY_GROUP_CATEGORIES.map(cat => ({
      value: cat.id,
      label: cat.name,
      description: cat.description,
      groupCount: cat.groups.length,
      level: 'utility' as const
    }))

    return [...stateOptions, ...utilityOptions]
  }, [])

  // Get current category info for showing group details
  const currentCategory = useMemo((): { category: GroupCategory | UtilityGroupCategory; level: AggregationLevel } | null => {
    if (!selection.categoryId) return null

    const stateCategory = STATE_GROUP_CATEGORIES.find(c => c.id === selection.categoryId)
    if (stateCategory) return { category: stateCategory, level: 'state' }

    const utilityCategory = UTILITY_GROUP_CATEGORIES.find(c => c.id === selection.categoryId)
    if (utilityCategory) return { category: utilityCategory, level: 'utility' }

    return null
  }, [selection.categoryId])

  const handleCategoryChange = (value: string) => {
    if (!value) {
      onChange({ categoryId: null, level: 'state', showMembers: false })
      return
    }

    // Find which level this category belongs to
    const option = options.find(o => o.value === value)
    if (option) {
      onChange({
        categoryId: value,
        level: option.level,
        showMembers: selection.showMembers
      })
    }
  }

  return (
    <div className="group-selector">
      <div className="control-group">
        <label>Compare</label>
        <select
          value={selection.categoryId || ''}
          onChange={(e) => handleCategoryChange(e.target.value)}
          title="Compare groups of states or utilities"
        >
          <option value="">Individual states</option>
          <optgroup label="State-Level Groups">
            {options.filter(o => o.level === 'state').map(opt => (
              <option
                key={opt.value}
                value={opt.value}
                title={opt.description}
              >
                {opt.label} ({opt.groupCount} groups)
              </option>
            ))}
          </optgroup>
          <optgroup label="Utility-Level Groups">
            {options.filter(o => o.level === 'utility').map(opt => (
              <option
                key={opt.value}
                value={opt.value}
                title={opt.description}
              >
                {opt.label} ({opt.groupCount} groups)
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {selection.categoryId && (
        <div className="control-group">
          <label>&nbsp;</label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={selection.showMembers}
              onChange={(e) => onChange({
                ...selection,
                showMembers: e.target.checked
              })}
            />
            Show {selection.level === 'utility' ? 'utilities' : 'states'}
          </label>
        </div>
      )}

      {currentCategory && (
        <div className="group-info">
          <span className="control-hint">
            {currentCategory.level === 'utility' ? '⚡ ' : '🗺️ '}
            {currentCategory.category.groups.map(g => g.name).join(', ')}
          </span>
        </div>
      )}
    </div>
  )
}

// Helper to get state group by category and group ID
export function getStateGroupById(categoryId: string, groupId: string) {
  const category = STATE_GROUP_CATEGORIES.find(c => c.id === categoryId)
  if (!category) return null
  return category.groups.find(g => g.id === groupId) || null
}

// Helper to get utility group by category and group ID
export function getUtilityGroupById(categoryId: string, groupId: string) {
  const category = UTILITY_GROUP_CATEGORIES.find(c => c.id === categoryId)
  if (!category) return null
  return category.groups.find(g => g.id === groupId) || null
}

// Helper to check if a category ID is a utility-level group
export function isUtilityCategory(categoryId: string): boolean {
  return UTILITY_GROUP_CATEGORIES.some(c => c.id === categoryId)
}

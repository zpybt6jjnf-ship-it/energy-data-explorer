/**
 * GroupSelector component for state/utility aggregation
 *
 * Allows users to select preset groups (RTO, market structure, census regions)
 * and see aggregated data points on charts.
 */

import { useMemo } from 'react'
import { STATE_GROUP_CATEGORIES, GroupCategory } from '../../data/groups/stateGroups'

export interface GroupSelection {
  categoryId: string | null  // null = no grouping (show individual states)
  showMembers: boolean       // Show individual state points behind aggregated
}

interface Props {
  selection: GroupSelection
  onChange: (selection: GroupSelection) => void
}

// Flatten all categories and groups into selectable options
interface GroupOption {
  value: string        // categoryId
  label: string        // Display name
  description: string  // Tooltip text
  groupCount: number   // Number of groups in category
}

export default function GroupSelector({ selection, onChange }: Props) {
  const options: GroupOption[] = useMemo(() => {
    return STATE_GROUP_CATEGORIES.map(cat => ({
      value: cat.id,
      label: cat.name,
      description: cat.description,
      groupCount: cat.groups.length
    }))
  }, [])

  // Get current category info for showing group details
  const currentCategory = useMemo((): GroupCategory | null => {
    if (!selection.categoryId) return null
    return STATE_GROUP_CATEGORIES.find(c => c.id === selection.categoryId) || null
  }, [selection.categoryId])

  return (
    <div className="group-selector">
      <div className="control-group">
        <label>Aggregate By</label>
        <select
          value={selection.categoryId || ''}
          onChange={(e) => onChange({
            ...selection,
            categoryId: e.target.value || null
          })}
          title="Group states and show aggregated data points"
        >
          <option value="">No grouping (show all states)</option>
          {options.map(opt => (
            <option
              key={opt.value}
              value={opt.value}
              title={opt.description}
            >
              {opt.label} ({opt.groupCount} groups)
            </option>
          ))}
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
            Show member states
          </label>
        </div>
      )}

      {currentCategory && (
        <div className="group-info">
          <span className="control-hint">
            Groups: {currentCategory.groups.map(g => g.name).join(', ')}
          </span>
        </div>
      )}
    </div>
  )
}

// Helper to get group by category and group ID
export function getGroupById(categoryId: string, groupId: string) {
  const category = STATE_GROUP_CATEGORIES.find(c => c.id === categoryId)
  if (!category) return null
  return category.groups.find(g => g.id === groupId) || null
}

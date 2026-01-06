import { useMemo } from 'react'
import { STATE_REGIONS } from '../../types'

interface Props {
  selectedStates: string[]
  availableStates: string[]
  onChange: (states: string[]) => void
}

// Group states by region for quick-select
const REGIONS = ['Northeast', 'Midwest', 'South', 'West'] as const
const REGION_ABBREVIATIONS: Record<string, string> = {
  Northeast: 'NE',
  Midwest: 'MW',
  South: 'S',
  West: 'W'
}
const REGION_DESCRIPTIONS: Record<string, string> = {
  Northeast: 'CT, DE, MA, MD, ME, NH, NJ, NY, PA, RI, VT',
  Midwest: 'IA, IL, IN, KS, MI, MN, MO, ND, NE, OH, SD, WI',
  South: 'AL, AR, DC, FL, GA, KY, LA, MS, NC, OK, SC, TN, TX, VA, WV',
  West: 'AK, AZ, CA, CO, HI, ID, MT, NM, NV, OR, UT, WA, WY'
}

function getStatesByRegion(region: string): string[] {
  return Object.entries(STATE_REGIONS)
    .filter(([, r]) => r === region)
    .map(([state]) => state)
}

export default function StateFilter({ selectedStates, availableStates, onChange }: Props) {
  // Check if all states in a region are selected
  const regionStatus = useMemo(() => {
    const status: Record<string, 'none' | 'some' | 'all'> = {}
    for (const region of REGIONS) {
      const regionStates = getStatesByRegion(region).filter(s => availableStates.includes(s))
      const selectedInRegion = regionStates.filter(s => selectedStates.includes(s))
      if (selectedInRegion.length === 0) {
        status[region] = 'none'
      } else if (selectedInRegion.length === regionStates.length) {
        status[region] = 'all'
      } else {
        status[region] = 'some'
      }
    }
    return status
  }, [selectedStates, availableStates])

  // Toggle all states in a region
  const toggleRegion = (region: string) => {
    const regionStates = getStatesByRegion(region).filter(s => availableStates.includes(s))
    const allSelected = regionStatus[region] === 'all'

    if (allSelected) {
      // Remove all states in this region
      onChange(selectedStates.filter(s => !regionStates.includes(s)))
    } else {
      // Add all states in this region
      const newStates = [...selectedStates]
      for (const state of regionStates) {
        if (!newStates.includes(state)) {
          newStates.push(state)
        }
      }
      onChange(newStates)
    }
  }

  // Remove a single state
  const removeState = (state: string) => {
    onChange(selectedStates.filter(s => s !== state))
  }

  // Toggle a single state from the dropdown
  const toggleState = (state: string) => {
    if (selectedStates.includes(state)) {
      onChange(selectedStates.filter(s => s !== state))
    } else {
      onChange([...selectedStates, state])
    }
  }

  const totalStates = availableStates.length
  const selectedCount = selectedStates.length

  return (
    <div className="state-filter">
      {/* Combined region + states control */}
      <div className="control-group">
        <label>
          States
          <span className="state-count">
            {selectedCount === 0
              ? `(all ${totalStates})`
              : `(${selectedCount})`}
          </span>
        </label>
        <div className="state-filter-stack">
          <div className="region-buttons">
            {REGIONS.map(region => (
              <button
                key={region}
                onClick={() => toggleRegion(region)}
                className={`region-btn ${regionStatus[region]}`}
                title={`${region}: ${REGION_DESCRIPTIONS[region]}`}
              >
                {REGION_ABBREVIATIONS[region]}
              </button>
            ))}
          </div>
          <select
            multiple
            size={4}
            value={selectedStates}
            onMouseDown={(e) => {
              // Handle clicks on options for toggle behavior
              const target = e.target as HTMLElement
              if (target.tagName === 'OPTION') {
                e.preventDefault()
                const option = target as HTMLOptionElement
                toggleState(option.value)
              }
            }}
            onChange={() => {
              // Prevent default multi-select behavior - we handle it in onMouseDown
            }}
          >
            {availableStates.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected state chips */}
      {selectedCount > 0 && (
        <div className="control-group">
          <label>&nbsp;</label>
          <div className="state-chips">
            {selectedStates.length <= 6 ? (
              selectedStates.map(state => (
                <button
                  key={state}
                  className="state-chip"
                  onClick={() => removeState(state)}
                  title={`Remove ${state}`}
                >
                  {state} ×
                </button>
              ))
            ) : (
              <>
                {selectedStates.slice(0, 5).map(state => (
                  <button
                    key={state}
                    className="state-chip"
                    onClick={() => removeState(state)}
                    title={`Remove ${state}`}
                  >
                    {state} ×
                  </button>
                ))}
                <span className="chip-overflow">+{selectedStates.length - 5}</span>
              </>
            )}
            <button
              className="clear-all-btn"
              onClick={() => onChange([])}
              title="Clear all"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

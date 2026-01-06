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
      {/* Region quick-select buttons */}
      <div className="control-group">
        <label>Regions</label>
        <div className="region-buttons">
          {REGIONS.map(region => {
            const stateCount = getStatesByRegion(region).filter(s => availableStates.includes(s)).length
            return (
              <button
                key={region}
                onClick={() => toggleRegion(region)}
                className={`region-btn ${regionStatus[region]}`}
                title={`${region} (${stateCount} states): ${REGION_DESCRIPTIONS[region]}`}
              >
                {REGION_ABBREVIATIONS[region]}
              </button>
            )
          })}
        </div>
      </div>

      {/* State dropdown */}
      <div className="control-group">
        <label>
          States
          <span className="state-count">
            {selectedCount === 0
              ? `(all ${totalStates})`
              : `(${selectedCount} of ${totalStates})`}
          </span>
        </label>
        <select
          multiple
          size={5}
          value={selectedStates}
          onChange={(e) => {
            const clickedState = e.target.value
            // For multi-select, we handle individual clicks
            if (e.nativeEvent instanceof MouseEvent && !e.nativeEvent.ctrlKey && !e.nativeEvent.metaKey) {
              toggleState(clickedState)
            } else {
              onChange(Array.from(e.target.selectedOptions, opt => opt.value))
            }
          }}
          onClick={(e) => {
            // Handle single clicks without modifier keys
            const target = e.target as HTMLOptionElement
            if (target.tagName === 'OPTION') {
              e.preventDefault()
              toggleState(target.value)
            }
          }}
        >
          {availableStates.map(state => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>
        <span className="control-hint">Click to toggle · Ctrl-click for range</span>
      </div>

      {/* Selected state chips */}
      {selectedCount > 0 && (
        <div className="control-group">
          <label>&nbsp;</label>
          <div className="state-chips">
            {selectedStates.length <= 8 ? (
              selectedStates.map(state => (
                <button
                  key={state}
                  className="state-chip"
                  onClick={() => removeState(state)}
                  title={`Remove ${state}`}
                >
                  {state} <span className="chip-remove">×</span>
                </button>
              ))
            ) : (
              <>
                {selectedStates.slice(0, 6).map(state => (
                  <button
                    key={state}
                    className="state-chip"
                    onClick={() => removeState(state)}
                    title={`Remove ${state}`}
                  >
                    {state} <span className="chip-remove">×</span>
                  </button>
                ))}
                <span className="chip-overflow">+{selectedStates.length - 6} more</span>
              </>
            )}
            <button
              className="clear-all-btn"
              onClick={() => onChange([])}
              title="Clear all selected states"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import Plot from 'react-plotly.js'
import { ChartData, StateDataPoint } from '../../types'
import { COLORS, baseLayout, baseConfig } from '../../utils/plotly'
import { downloadGenericCSV, downloadGenericJSON } from '../../utils/exportUtils'
import { ChartControlsWrapper } from '../controls'

interface Props {
  data: ChartData
  yearStart: number
  yearEnd: number
  yearsAvailable: number[]
  onYearStartChange: (year: number) => void
  onYearEndChange: (year: number) => void
}

// Fuel type definitions with colors
const FUEL_TYPES = [
  { key: 'generationCoal', label: 'Coal', color: '#4a4a4a' },
  { key: 'generationGas', label: 'Natural Gas', color: '#ff7f0e' },
  { key: 'generationNuclear', label: 'Nuclear', color: '#9467bd' },
  { key: 'generationHydro', label: 'Hydro', color: '#17becf' },
  { key: 'generationWind', label: 'Wind', color: '#2ca02c' },
  { key: 'generationSolar', label: 'Solar', color: '#ffbb00' },
  { key: 'generationOther', label: 'Other', color: '#7f7f7f' }
] as const

/**
 * Sankey diagram showing how generation sources shift between two years.
 * Left nodes show Year 1 fuel mix, right nodes show Year 2.
 * Flows visualize the transition magnitude.
 */
export default function GenerationSankeyChart({
  data,
  yearStart,
  yearEnd,
  yearsAvailable,
  onYearStartChange,
  onYearEndChange
}: Props) {
  const [selectedState, setSelectedState] = useState<string>('all')

  // Get unique states
  const states = useMemo(() => {
    const stateSet = new Set(data.points.map(p => p.stateCode))
    return ['all', ...Array.from(stateSet).sort()]
  }, [data.points])

  // Calculate generation totals for each year
  const generationData = useMemo(() => {
    const filterPoints = (year: number) => {
      return data.points.filter(p => {
        if (p.year !== year) return false
        if (selectedState !== 'all' && p.stateCode !== selectedState) return false
        return true
      })
    }

    const sumGeneration = (points: StateDataPoint[]) => {
      const totals: Record<string, number> = {}
      FUEL_TYPES.forEach(ft => {
        totals[ft.key] = points.reduce((sum, p) => {
          const value = p[ft.key as keyof StateDataPoint] as number
          return sum + (value || 0)
        }, 0)
      })
      return totals
    }

    const year1Points = filterPoints(yearStart)
    const year2Points = filterPoints(yearEnd)

    const year1Totals = sumGeneration(year1Points)
    const year2Totals = sumGeneration(year2Points)

    return { year1Totals, year2Totals }
  }, [data.points, yearStart, yearEnd, selectedState])

  // Build Sankey diagram data
  const sankeyData = useMemo(() => {
    const { year1Totals, year2Totals } = generationData

    // Nodes: Year 1 sources on left, Year 2 sources on right
    const nodeLabels: string[] = []
    const nodeColors: string[] = []
    const nodeX: number[] = []
    const nodeY: number[] = []

    // Add Year 1 nodes (left side)
    FUEL_TYPES.forEach((ft, i) => {
      nodeLabels.push(`${ft.label} (${yearStart})`)
      nodeColors.push(ft.color)
      nodeX.push(0.01)
      nodeY.push((i + 0.5) / FUEL_TYPES.length)
    })

    // Add Year 2 nodes (right side)
    FUEL_TYPES.forEach((ft, i) => {
      nodeLabels.push(`${ft.label} (${yearEnd})`)
      nodeColors.push(ft.color)
      nodeX.push(0.99)
      nodeY.push((i + 0.5) / FUEL_TYPES.length)
    })

    // Links: Connect each fuel type from Year 1 to Year 2
    const linkSource: number[] = []
    const linkTarget: number[] = []
    const linkValue: number[] = []
    const linkColor: string[] = []

    const numFuels = FUEL_TYPES.length

    FUEL_TYPES.forEach((ft, i) => {
      const year1Val = year1Totals[ft.key] || 0
      const year2Val = year2Totals[ft.key] || 0

      // Flow from Year 1 to Year 2 for same fuel
      const flowValue = Math.min(year1Val, year2Val)
      if (flowValue > 0) {
        linkSource.push(i)
        linkTarget.push(numFuels + i)
        linkValue.push(flowValue)
        linkColor.push(ft.color + 'aa') // Semi-transparent
      }
    })

    return {
      nodeLabels,
      nodeColors,
      nodeX,
      nodeY,
      linkSource,
      linkTarget,
      linkValue,
      linkColor
    }
  }, [generationData, yearStart, yearEnd])

  // Calculate summary statistics
  const summary = useMemo(() => {
    const { year1Totals, year2Totals } = generationData

    const year1Total = Object.values(year1Totals).reduce((s, v) => s + v, 0)
    const year2Total = Object.values(year2Totals).reduce((s, v) => s + v, 0)

    const changes = FUEL_TYPES.map(ft => ({
      label: ft.label,
      year1: year1Totals[ft.key] || 0,
      year2: year2Totals[ft.key] || 0,
      change: (year2Totals[ft.key] || 0) - (year1Totals[ft.key] || 0),
      year1Share: year1Total > 0 ? ((year1Totals[ft.key] || 0) / year1Total) * 100 : 0,
      year2Share: year2Total > 0 ? ((year2Totals[ft.key] || 0) / year2Total) * 100 : 0
    }))

    const biggest_increase = [...changes].sort((a, b) => b.change - a.change)[0]
    const biggest_decrease = [...changes].sort((a, b) => a.change - b.change)[0]

    return {
      year1Total,
      year2Total,
      totalChange: year2Total - year1Total,
      changes,
      biggest_increase,
      biggest_decrease
    }
  }, [generationData])

  const plotData = useMemo(() => [{
    type: 'sankey' as const,
    orientation: 'h' as const,
    node: {
      pad: 20,
      thickness: 30,
      line: { color: COLORS.ink, width: 1 },
      label: sankeyData.nodeLabels,
      color: sankeyData.nodeColors,
      x: sankeyData.nodeX,
      y: sankeyData.nodeY
    },
    link: {
      source: sankeyData.linkSource,
      target: sankeyData.linkTarget,
      value: sankeyData.linkValue,
      color: sankeyData.linkColor
    }
  }], [sankeyData])

  const layout = useMemo(() => ({
    ...baseLayout,
    title: { text: '' },
    font: { size: 12, color: COLORS.ink }
  }), [])

  const plotConfig = {
    ...baseConfig,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: `generation-transition-${yearStart}-${yearEnd}`,
      height: 600,
      width: 1000,
      scale: 2
    }
  }

  // Export data
  const exportData = summary.changes.map(c => ({
    fuel: c.label,
    [`generation_${yearStart}_gwh`]: Math.round(c.year1),
    [`generation_${yearEnd}_gwh`]: Math.round(c.year2),
    change_gwh: Math.round(c.change),
    [`share_${yearStart}_pct`]: Math.round(c.year1Share * 10) / 10,
    [`share_${yearEnd}_pct`]: Math.round(c.year2Share * 10) / 10
  }))

  const stateLabel = selectedState === 'all' ? 'U.S. Total' : selectedState

  return (
    <div className="chart-container" role="figure" aria-label={`Sankey diagram showing electricity generation transition for ${stateLabel} from ${yearStart} to ${yearEnd}.`}>
      <div className="chart-header">
        <h2>Generation Source Transition</h2>
        <p>
          How has the electricity generation mix evolved between {yearStart} and {yearEnd}?
        </p>
      </div>

      <details className="chart-description" open>
        <summary>About this chart</summary>
        <div className="chart-description-content">
          <div className="description-section">
            <h3>What does this show?</h3>
            <p>
              This Sankey diagram visualizes how electricity generation sources have changed
              between two years. The left side shows the fuel mix in the starting year, and
              the right side shows the ending year. Flow width represents generation magnitude.
            </p>
          </div>
          <div className="description-section">
            <h3>Reading the diagram</h3>
            <p>
              Wider flows indicate larger amounts of generation. Compare the heights of nodes
              on each side to see which sources grew or shrank. Renewable sources like wind
              and solar typically show growth, while coal often shows decline.
            </p>
          </div>
        </div>
      </details>

      <ChartControlsWrapper>
        <div className="control-group">
          <label>From Year</label>
          <select
            value={yearStart}
            onChange={(e) => onYearStartChange(parseInt(e.target.value))}
          >
            {yearsAvailable
              .filter(y => y < yearEnd)
              .map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
          </select>
        </div>

        <div className="control-group">
          <label>To Year</label>
          <select
            value={yearEnd}
            onChange={(e) => onYearEndChange(parseInt(e.target.value))}
          >
            {yearsAvailable
              .filter(y => y > yearStart)
              .map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
          </select>
        </div>

        <div className="control-group">
          <label>State</label>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
          >
            <option value="all">All States (U.S. Total)</option>
            {states.filter(s => s !== 'all').map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Export</label>
          <div className="button-group">
            <button onClick={() => downloadGenericCSV(exportData, `generation-transition-${selectedState}-${yearStart}-${yearEnd}`)}>
              CSV
            </button>
            <button onClick={() => downloadGenericJSON(exportData, `generation-transition-${selectedState}-${yearStart}-${yearEnd}`)}>
              JSON
            </button>
          </div>
        </div>
      </ChartControlsWrapper>

      <div className="stats-panel">
        <div className="stats-summary">
          <p className="summary-main">
            <strong>{stateLabel}</strong>: Total generation {summary.totalChange >= 0 ? 'increased' : 'decreased'} by{' '}
            <strong>{Math.abs(Math.round(summary.totalChange)).toLocaleString()} GWh</strong> ({yearStart}–{yearEnd})
          </p>
          <p className="summary-detail">
            Biggest increase: <strong>{summary.biggest_increase.label}</strong> (+{Math.round(summary.biggest_increase.change).toLocaleString()} GWh)
            {' '} · {' '}
            Biggest decrease: <strong>{summary.biggest_decrease.label}</strong> ({Math.round(summary.biggest_decrease.change).toLocaleString()} GWh)
          </p>
        </div>
      </div>

      <div className="chart-plot-wrapper">
        <Plot
          data={plotData}
          layout={layout}
          config={plotConfig}
          style={{ width: '100%', height: '500px' }}
        />
      </div>

      <details className="stats-technical">
        <summary>Detailed breakdown</summary>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fuel Source</th>
              <th>{yearStart} (GWh)</th>
              <th>{yearEnd} (GWh)</th>
              <th>Change</th>
              <th>Share Change</th>
            </tr>
          </thead>
          <tbody>
            {summary.changes.map(c => (
              <tr key={c.label}>
                <td>{c.label}</td>
                <td>{Math.round(c.year1).toLocaleString()}</td>
                <td>{Math.round(c.year2).toLocaleString()}</td>
                <td className={c.change >= 0 ? 'positive' : 'negative'}>
                  {c.change >= 0 ? '+' : ''}{Math.round(c.change).toLocaleString()}
                </td>
                <td>
                  {c.year1Share.toFixed(1)}% → {c.year2Share.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

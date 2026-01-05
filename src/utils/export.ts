import { StateDataPoint } from '../types'

/**
 * Download filtered data as CSV file
 */
export function downloadCSV(data: StateDataPoint[], filename: string): void {
  const headers = [
    'State',
    'State Code',
    'Year',
    'Region',
    'SAIDI (min)',
    'SAIFI',
    'VRE Penetration (%)',
    'Wind Penetration (%)',
    'Solar Penetration (%)',
    'Total Generation (MWh)'
  ]

  const rows = data.map(p => [
    p.state,
    p.stateCode,
    p.year,
    p.region,
    p.saidi.toFixed(1),
    p.saifi.toFixed(2),
    p.vrePenetration.toFixed(2),
    p.windPenetration.toFixed(2),
    p.solarPenetration.toFixed(2),
    p.totalGeneration
  ])

  // Escape fields that might contain commas or quotes
  const escapeField = (field: string | number): string => {
    const str = String(field)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const csvContent = [
    headers.map(escapeField).join(','),
    ...rows.map(row => row.map(escapeField).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()

  URL.revokeObjectURL(url)
}

/**
 * Download filtered data as JSON file
 */
export function downloadJSON(data: StateDataPoint[], filename: string): void {
  const exportData = {
    exportedAt: new Date().toISOString(),
    recordCount: data.length,
    data: data.map(p => ({
      state: p.state,
      stateCode: p.stateCode,
      year: p.year,
      region: p.region,
      saidi: p.saidi,
      saifi: p.saifi,
      vrePenetration: p.vrePenetration,
      windPenetration: p.windPenetration,
      solarPenetration: p.solarPenetration,
      totalGeneration: p.totalGeneration
    }))
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.json`
  link.click()

  URL.revokeObjectURL(url)
}

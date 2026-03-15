import * as XLSX from 'xlsx'

type Rule = {
  id: string
  description?: string
  ports?: string
  action: string
  priority: number
  active: boolean
  sourceZoneId?: string
  sourceNetworkId?: string
  sourceClientId?: string
  destZoneId?: string
  destNetworkId?: string
  destClientId?: string
}

type TopologyData = {
  zones: any[]
}

function resolveEntityName(id: string | undefined | null, topologyData: TopologyData): string {
  if (!id) return ''
  for (const zone of topologyData.zones || []) {
    if (zone.id === id) return zone.name
    for (const net of zone.networks || []) {
      if (net.id === id) return `${zone.name} → ${net.name}`
      for (const client of net.clients || []) {
        if (client.id === id) return `${zone.name} → ${net.name} → ${client.name}`
      }
    }
  }
  return id
}

function buildRulesRows(rules: Rule[], topologyData: TopologyData) {
  return rules.map(rule => {
    const sourceId = rule.sourceClientId || rule.sourceNetworkId || rule.sourceZoneId
    const destId = rule.destClientId || rule.destNetworkId || rule.destZoneId

    return {
      'Description': rule.description || '',
      'Action': rule.action,
      'Source': resolveEntityName(sourceId, topologyData),
      'Destination': resolveEntityName(destId, topologyData),
      'Ports': rule.ports || 'any',
      'Priority': rule.priority,
      'Active': rule.active ? 'Yes' : 'No',
    }
  })
}

export function exportRulesCsv(rules: Rule[], topologyData: TopologyData) {
  const rows = buildRulesRows(rules, topologyData)
  if (rows.length === 0) return

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Firewall Rules')
  
  XLSX.writeFile(workbook, `firewall-rules-${new Date().toISOString().slice(0, 10)}.csv`, { bookType: 'csv' })
}

export function exportRulesXlsx(rules: Rule[], topologyData: TopologyData) {
  const rows = buildRulesRows(rules, topologyData)
  if (rows.length === 0) return

  const worksheet = XLSX.utils.json_to_sheet(rows)

  // Auto-size columns
  const colWidths = Object.keys(rows[0]).map(key => {
    const maxLen = Math.max(
      key.length,
      ...rows.map(r => String((r as any)[key]).length)
    )
    return { wch: Math.min(maxLen + 2, 50) }
  })
  worksheet['!cols'] = colWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Firewall Rules')

  XLSX.writeFile(workbook, `firewall-rules-${new Date().toISOString().slice(0, 10)}.xlsx`, { bookType: 'xlsx' })
}

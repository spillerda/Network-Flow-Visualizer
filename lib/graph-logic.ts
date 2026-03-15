import { Node, Edge } from '@xyflow/react'
import dagre from 'dagre'
import { isNetworkInCidr } from './cidr-utils'

type TopologyData = {
  zones: any[]
  rules: any[]
}

export function generateGraph(data: TopologyData, hiddenNodes: Record<string, boolean>, hiddenRules: Record<string, boolean>, showAutoFlow: boolean, ruleConflicts: Record<string, any> = {}, storedPositions: Record<string, { x: number; y: number }> = {}, storedSizes: Record<string, { width: number; height: number }> = {}) {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const { zones, rules } = data

  const ZONE_PADDING_X = 40
  const ZONE_PADDING_TOP = 50
  const ZONE_PADDING_BOTTOM = 20
  const NETWORK_GAP = 20
  const NETWORK_PADDING_X = 20
  const NETWORK_PADDING_TOP = 45
  const NETWORK_PADDING_BOTTOM = 10
  const CLIENT_WIDTH = 150
  const CLIENT_HEIGHT = 40
  const CLIENT_GAP = 10
  const MIN_NETWORK_WIDTH = 250
  const MIN_ZONE_WIDTH = 300
  
  // Create Nodes with dynamic sizing
  zones.forEach((zone: any) => {
    if (hiddenNodes[zone.id]) return

    const visibleNetworks = zone.networks.filter((n: any) => !hiddenNodes[n.id])
    
    // Calculate each network's dimensions first
    let maxNetworkWidth = 0
    let totalNetworkHeight = 0
    const networkDimensions: { width: number; height: number }[] = []

    visibleNetworks.forEach((network: any) => {
      const visibleClients = network.clients.filter((c: any) => !hiddenNodes[c.id])
      
      // Calculate clients grid dimensions (4 columns max)
      const cols = Math.min(visibleClients.length, 4)
      const rows = Math.ceil(visibleClients.length / 4)

      // Network width based on number of columns
      const clientsRowWidth = cols > 0
        ? cols * CLIENT_WIDTH + (cols - 1) * CLIENT_GAP + NETWORK_PADDING_X * 2
        : MIN_NETWORK_WIDTH
        
      const computedNetworkWidth = Math.max(MIN_NETWORK_WIDTH, clientsRowWidth)
      
      // Network height based on number of rows
      const computedNetworkHeight = rows > 0
        ? NETWORK_PADDING_TOP + (rows * CLIENT_HEIGHT) + ((rows - 1) * CLIENT_GAP) + NETWORK_PADDING_BOTTOM
        : NETWORK_PADDING_TOP + NETWORK_PADDING_BOTTOM

      const storedNetSize = storedSizes[network.id]
      const networkWidth = storedNetSize ? Math.max(storedNetSize.width, computedNetworkWidth) : computedNetworkWidth
      const networkHeight = storedNetSize ? Math.max(storedNetSize.height, computedNetworkHeight) : computedNetworkHeight

      networkDimensions.push({ width: networkWidth, height: networkHeight })
      maxNetworkWidth = Math.max(maxNetworkWidth, networkWidth)
      totalNetworkHeight += networkHeight
    })

    // Zone dimensions — use stored sizes if user resized, else compute
    const computedWidth = Math.max(MIN_ZONE_WIDTH, maxNetworkWidth + ZONE_PADDING_X * 2)
    const computedHeight = visibleNetworks.length > 0
      ? ZONE_PADDING_TOP + totalNetworkHeight + (visibleNetworks.length - 1) * NETWORK_GAP + ZONE_PADDING_BOTTOM
      : ZONE_PADDING_TOP + ZONE_PADDING_BOTTOM + 60

    const storedSize = storedSizes[zone.id]
    const zoneWidth = storedSize ? Math.max(storedSize.width, computedWidth) : computedWidth
    const zoneHeight = storedSize ? Math.max(storedSize.height, computedHeight) : computedHeight

    nodes.push({
      id: zone.id,
      type: 'ZoneNode',
      data: { label: zone.name, color: zone.color, borderColor: zone.borderColor, description: zone.description },
      position: { x: 0, y: 0 },
      style: { width: zoneWidth, height: zoneHeight },
    })

    let networkYOffset = ZONE_PADDING_TOP
    visibleNetworks.forEach((network: any, idx: number) => {
      const { width: networkWidth, height: networkHeight } = networkDimensions[idx]
      const visibleClients = network.clients.filter((c: any) => !hiddenNodes[c.id])
      
      nodes.push({
        id: network.id,
        type: 'NetworkNode',
        data: { label: network.name, cidr: network.cidr, color: network.color, description: network.description, clientIsolation: network.clientIsolation },
        position: { x: ZONE_PADDING_X / 2, y: networkYOffset },
        parentId: zone.id,
        extent: 'parent',
        style: { width: networkWidth, height: networkHeight }
      })

      // Place clients in a 4-column grid within the network
      visibleClients.forEach((client: any, cIdx: number) => {
        const col = cIdx % 4
        const row = Math.floor(cIdx / 4)
        
        const clientXOffset = NETWORK_PADDING_X + col * (CLIENT_WIDTH + CLIENT_GAP)
        const clientYOffset = NETWORK_PADDING_TOP + row * (CLIENT_HEIGHT + CLIENT_GAP)
        
        const storedClientSize = storedSizes[client.id]
        const cWidth = storedClientSize ? storedClientSize.width : undefined
        const cHeight = storedClientSize ? storedClientSize.height : undefined

        nodes.push({
          id: client.id,
          type: 'ClientNode',
          data: { label: client.name, ip: client.ip, color: client.color, description: client.description },
          position: { x: clientXOffset, y: clientYOffset },
          parentId: network.id,
          extent: 'parent',
          style: cWidth && cHeight ? { width: cWidth, height: cHeight } : undefined
        })
      })

      networkYOffset += networkHeight + NETWORK_GAP
    })
  })

  // Entity Map for quick lookup and routing
  const entityMap = new Map()
  zones.forEach((z: any) => {
    entityMap.set(z.id, { ...z, type: 'zone' })
    z.networks.forEach((n: any) => {
      entityMap.set(n.id, { ...n, type: 'network', parent: z.id })
      n.clients.forEach((c: any) => {
        entityMap.set(c.id, { ...c, type: 'client', parent: n.id })
      })
    })
  })

  // Returns the ID of the highest visible parent
  const getVisibleEntityId = (id: string | null): string | null => {
    if (!id) return null
    let currentId: string = id
    while (hiddenNodes[currentId]) {
      const entity = entityMap.get(currentId)
      if (!entity || !entity.parent) return null
      currentId = entity.parent
    }
    // Return the node if it exists in the visible graph
    return nodes.some(n => n.id === currentId) ? currentId : null
  }

  const activeRules = rules.filter((r: any) => r.active)

  const getAnySources = (): string[] => {
    return [
      ...nodes.filter(n => n.type === 'ZoneNode').map(n => n.id),
      ...nodes.filter(n => n.type === 'NetworkNode').map(n => n.id)
    ]
  }

  const getAnyTargets = (srcId: string | null): string[] => {
    const targets: string[] = []
    const allZones = nodes.filter(n => n.type === 'ZoneNode')
    const allNetworks = nodes.filter(n => n.type === 'NetworkNode')
    
    if (!srcId) {
      targets.push(...allZones.map(z => z.id))
      targets.push(...allNetworks.map(n => n.id))
    } else {
      const srcEntity = entityMap.get(srcId)
      if (!srcEntity) return []
      
      const srcZoneId = srcEntity.type === 'zone' ? srcEntity.id : (srcEntity.type === 'network' ? srcEntity.parent : entityMap.get(srcEntity.parent)?.parent)
      const srcNetId = srcEntity.type === 'network' ? srcEntity.id : (srcEntity.type === 'client' ? srcEntity.parent : null)
      
      // Target all OTHER zones
      allZones.forEach(z => {
        if (z.id !== srcZoneId) targets.push(z.id)
      })
      
      // Target all OTHER networks in the SAME zone
      allNetworks.forEach(n => {
        if (n.parentId === srcZoneId && n.id !== srcNetId) {
          targets.push(n.id)
        }
      })
    }
    return targets
  }



  // Helper: get human-readable name for an entity
  const getEntityName = (id: string | null): string => {
    if (!id) return 'any'
    const entity = entityMap.get(id)
    if (!entity) return 'Unknown'
    return entity.name || entity.label || 'Unknown'
  }

  // Resolve sources for a rule considering CIDR restrictions
  const resolveTargetIds = (targets: any[], isSource: boolean): string[] => {
    if (!targets || targets.length === 0) {
      if (isSource) return getAnySources()
      return [] // We'll handle 'any' destination separately 
    }

    const resolvedIds = new Set<string>()

    targets.forEach(target => {
      const targetId = target.clientId || target.networkId || target.zoneId
      if (!targetId) return

      const entity = entityMap.get(targetId)
      if (!entity) return

      if (entity.type === 'zone') {
        const zoneId = getVisibleEntityId(targetId)
        if (zoneId) {
          if (target.cidr) {
            // Apply CIDR filter: only target networks within this zone that match the CIDR
            const visibleNetworksInZone = nodes.filter(n => n.type === 'NetworkNode' && n.parentId === targetId)
            let matchFound = false
            visibleNetworksInZone.forEach(net => {
              // Extract the full network object to get its actual CIDR
              const netEntity = entityMap.get(net.id)
              if (netEntity && netEntity.cidr) {
                if (isNetworkInCidr(netEntity.cidr, target.cidr)) {
                  resolvedIds.add(net.id)
                  matchFound = true
                }
              }
            })
            // If no networks matched the CIDR, or if there are no visible networks,
            // we probably still want to draw a line to the zone itself to indicate the rule exists,
            // or perhaps not. Let's draw it to the Zone if no specific networks matched so it's not invisible.
            if (!matchFound) {
               resolvedIds.add(zoneId)
            }
          } else {
            // No CIDR, target the entire zone
            resolvedIds.add(zoneId)
          }
        }
      } else {
        // Network or Client
        const vid = getVisibleEntityId(targetId)
        if (vid) resolvedIds.add(vid)
      }
    })

    return Array.from(resolvedIds)
  }

  const isRuleOverridden = (rule: any): boolean => {
    return ruleConflicts?.[rule.id]?.isFullyShadowed || false
  }

  // Explicit rules
  activeRules.forEach((rule: any) => {
    const overridden = isRuleOverridden(rule)
    
    // Fallbacks for backwards compatibility if they don't have sources/destinations array
    // Our seed and update migrated them, but just in case:
    const sources = rule.sources || []
    const destinations = rule.destinations || []

    const sourceIds = resolveTargetIds(sources, true)
    
    sourceIds.forEach(sourceId => {
      let destIds: string[] = []
      if (destinations.length === 0) {
        destIds = getAnyTargets(sourceId)
      } else {
        destIds = resolveTargetIds(destinations, false)
      }

      destIds.forEach(destId => {
        if (sourceId && destId && sourceId !== destId) {
          if (!hiddenRules[rule.id]) {
            edges.push({
              id: `${rule.id}-${sourceId}-${destId}`,
              type: 'RuleEdge',
              source: sourceId,
              target: destId,
              data: {
                action: rule.action,
                ports: rule.ports,
                description: rule.description,
                priority: rule.priority,
                isAuto: false,
                isOverridden: overridden,
                sourceName: sources.map((s:any) => getEntityName(s.clientId || s.networkId || s.zoneId)).join(', ') || 'any',
                destName: destinations.map((d:any) => getEntityName(d.clientId || d.networkId || d.zoneId)).join(', ') || 'any',
                // Keep these empty or array to not break PropertiesPanel
                sources,
                destinations
              },
              animated: rule.action === 'ALLOW' && !overridden,
            })
          }
        }
      })
    })
  })

  // Client Isolation Logic
  const visibleNetworks2 = nodes.filter(n => n.type === 'NetworkNode')
  visibleNetworks2.forEach(netNode => {
    const network = zones.flatMap(z => z.networks).find(n => n.id === netNode.id)
    if (network && network.clientIsolation) {
      const visibleClients = nodes.filter(n => n.type === 'ClientNode' && n.parentId === network.id)
      for (let i = 0; i < visibleClients.length; i++) {
        for (let j = i + 1; j < visibleClients.length; j++) {
           edges.push({
             id: `isolation-${network.id}-${visibleClients[i].id}-${visibleClients[j].id}`,
             type: 'RuleEdge',
             source: visibleClients[i].id,
             target: visibleClients[j].id,
             data: {
               action: 'BLOCK',
               ports: 'Isolation',
               description: 'Client Isolation block',
               isAuto: false,
               isOverridden: false
             },
             animated: false,
           })
        }
      }
    }
  })

  // Auto-Flow Logic
  if (showAutoFlow) {
    const visibleEndpoints = nodes.filter(n => n.type === 'NetworkNode' || n.type === 'ClientNode')
    
    // Helper to get hierarchy for matching rules
    const getHierarchy = (node: any) => {
      if (node.type === 'NetworkNode') return { clientId: null, networkId: node.id, zoneId: node.parentId! };
      if (node.type === 'ClientNode') {
        const parentNet = nodes.find(n => n.id === node.parentId);
        return { clientId: node.id, networkId: node.parentId!, zoneId: parentNet?.parentId! };
      }
      return { clientId: null, networkId: null, zoneId: null };
    }

    for (let i = 0; i < visibleEndpoints.length; i++) {
        for (let j = i + 1; j < visibleEndpoints.length; j++) {
            const epA = visibleEndpoints[i]
            const epB = visibleEndpoints[j]

            const hA = getHierarchy(epA)
            const hB = getHierarchy(epB)

            // Skip if they are in the same network (handled by intra-network logic or doesn't make sense)
            if (hA.networkId === hB.networkId) continue

            const isBlocked = activeRules.some(rule => {
                if (rule.action !== 'BLOCK') return false
                
                const sources = rule.sources || []
                const destinations = rule.destinations || []
                
                const matchEntity = (h: any, targetArray: any[]) => {
                    if (targetArray.length === 0) return true; // ANY
                    return targetArray.some(t => {
                        if (t.clientId) return h.clientId === t.clientId;
                        if (t.networkId) return h.networkId === t.networkId;
                        if (t.zoneId) {
                            if (t.cidr && h.networkId) {
                                const netEntity = entityMap.get(h.networkId);
                                if (netEntity && netEntity.cidr) {
                                  // Use the imported isNetworkInCidr utility
                                  if (!isNetworkInCidr(netEntity.cidr, t.cidr)) {
                                      return false;
                                  }
                                }
                            }
                            return h.zoneId === t.zoneId;
                        }
                        return false;
                    });
                }

                const srcMatchesA = matchEntity(hA, sources)
                const dstMatchesB = matchEntity(hB, destinations)
                
                const srcMatchesB = matchEntity(hB, sources)
                const dstMatchesA = matchEntity(hA, destinations)

                const blocksAtoB = srcMatchesA && dstMatchesB
                const blocksBtoA = srcMatchesB && dstMatchesA
                
                return blocksAtoB || blocksBtoA
            })

            const hasExplicitEdge = edges.some(e => 
                (e.source === epA.id && e.target === epB.id) || 
                (e.source === epB.id && e.target === epA.id)
            )

            if (!isBlocked && !hasExplicitEdge) {
                edges.push({
                    id: `auto-${epA.id}-${epB.id}`,
                    type: 'RuleEdge',
                    source: epA.id,
                    target: epB.id,
                    data: {
                      action: 'ALLOW',
                      ports: 'auto/possible',
                      description: 'Auto Discovered Path',
                      isAuto: true
                    },
                    animated: false,
                })
            }
        }
    }

    // Intra-Network Client Auto-Flows
    visibleNetworks2.forEach(netNode => {
      const network = zones.flatMap(z => z.networks).find(n => n.id === netNode.id)
      if (network && !network.clientIsolation) {
        const visibleClients = nodes.filter(n => n.type === 'ClientNode' && n.parentId === network.id)
        for (let i = 0; i < visibleClients.length; i++) {
          for (let j = i + 1; j < visibleClients.length; j++) {
            const hasExplicitEdge = edges.some(e => 
              (e.source === visibleClients[i].id && e.target === visibleClients[j].id) || 
              (e.source === visibleClients[j].id && e.target === visibleClients[i].id)
            )
            
            if (!hasExplicitEdge) {
              edges.push({
                 id: `auto-intra-${network.id}-${visibleClients[i].id}-${visibleClients[j].id}`,
                 type: 'RuleEdge',
                 source: visibleClients[i].id,
                 target: visibleClients[j].id,
                 data: {
                   action: 'ALLOW',
                   ports: 'auto/possible',
                   description: 'Local Network Communication',
                   isAuto: true
                 },
                 animated: false,
              })
            }
          }
        }
      }
    })
  }

  // Group edges by source+target pair to prevent overlap
  const edgePairCounts = new Map<string, number>()
  const edgePairIndices = new Map<string, number>()
  
  edges.forEach(edge => {
    // Normalize pair key so A→B and B→A are in the same group
    const pairKey = [edge.source, edge.target].sort().join('::')
    edgePairCounts.set(pairKey, (edgePairCounts.get(pairKey) || 0) + 1)
  })
  
  edges.forEach(edge => {
    const pairKey = [edge.source, edge.target].sort().join('::')
    const currentIndex = edgePairIndices.get(pairKey) || 0
    const total = edgePairCounts.get(pairKey) || 1
    
    edge.data = {
      ...edge.data,
      edgeIndex: currentIndex,
      edgeTotalBetweenPair: total,
    }
    
    edgePairIndices.set(pairKey, currentIndex + 1)
  })

  // Apply Dagre layout to top-level Zones
  const zoneNodes = nodes.filter(n => n.type === 'ZoneNode')
  const hasStoredPositions = Object.keys(storedPositions).length > 0

  // Check which zones need layout (new ones without stored positions)
  const zonesNeedingLayout = zoneNodes.filter(n => !storedPositions[n.id])
  
  if (zonesNeedingLayout.length > 0 && !hasStoredPositions) {
    // First time: use dagre for all zones
    const g = new dagre.graphlib.Graph()
    g.setGraph({ rankdir: 'LR', align: 'UL', nodesep: 150, edgesep: 50, ranksep: 250 })
    g.setDefaultEdgeLabel(() => ({}))

    zoneNodes.forEach(node => {
      g.setNode(node.id, { width: node.style?.width as number || 500, height: node.style?.height as number || 200 })
    })

    const getZoneId = (id: string) => {
      let currentId: string = id
      while (true) {
        const entity = entityMap.get(currentId)
        if (!entity || !entity.parent) return currentId
        currentId = entity.parent
      }
    }

    edges.forEach(edge => {
      const sourceZone = getZoneId(edge.source)
      const targetZone = getZoneId(edge.target)
      if (sourceZone && targetZone && sourceZone !== targetZone) {
        if (g.hasNode(sourceZone) && g.hasNode(targetZone)) {
          g.setEdge(sourceZone, targetZone)
        }
      }
    })

    dagre.layout(g)

    nodes.forEach(node => {
      if (node.type === 'ZoneNode') {
        const nodeWithPos = g.node(node.id)
        if (nodeWithPos) {
          node.position = {
            x: nodeWithPos.x - nodeWithPos.width / 2,
            y: nodeWithPos.y - nodeWithPos.height / 2
          }
        }
      }
    })
  } else {
    // Subsequent times: use stored positions, place new zones at a reasonable position
    let maxX = 0
    let maxY = 0
    nodes.forEach(node => {
      if (node.type === 'ZoneNode') {
        if (storedPositions[node.id]) {
          node.position = { ...storedPositions[node.id] }
          maxX = Math.max(maxX, node.position.x + (node.style?.width as number || 500))
          maxY = Math.max(maxY, node.position.y)
        }
      }
    })
    // Place new zones that don't have stored positions
    let offsetY = maxY
    nodes.forEach(node => {
      if (node.type === 'ZoneNode' && !storedPositions[node.id]) {
        offsetY += 50
        node.position = { x: 0, y: offsetY }
        offsetY += (node.style?.height as number || 200)
      }
    })
  }

  // Edge handles are computed dynamically in page.tsx via recomputeEdgeHandles()
  return { nodes, edges }
}

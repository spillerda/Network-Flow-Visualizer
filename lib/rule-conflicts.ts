import { isNetworkInCidr } from './cidr-utils'

export type ConflictInfo = {
  isFullyShadowed: boolean;
  shadowingRuleNames: string[];
  shadowedPorts: string[]; // specific ports shadowed, or 'any' if all ports shadowed
}

// Parses "80, 443, 8080-8082" into a list of numbers/strings or "any"
export function parsePorts(portsStr: string | null | undefined): Set<number> | 'any' {
  if (!portsStr || portsStr.toLowerCase().trim() === 'any' || portsStr.trim() === '') {
    return 'any';
  }
  const ports = new Set<number>();
  const parts = portsStr.split(',').map(p => p.trim());
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          ports.add(i);
        }
      }
    } else {
      const p = Number(part);
      if (!isNaN(p)) {
        ports.add(p);
      }
    }
  }
  return ports;
}

// Check if A covers B
export function portCovers(portsA: Set<number> | 'any', portsB: Set<number> | 'any'): boolean {
  if (portsA === 'any') return true;
  if (portsB === 'any') return false; // A is specific, B is any
  // Check if B's ports are subset of A's
  for (const port of portsB) {
    if (!portsA.has(port)) return false;
  }
  return true;
}

// Get the intersection of ports. If A intersects B, return the intersecting ports in B.
export function getShadowedPorts(portsA: Set<number> | 'any', portsB: Set<number> | 'any'): string[] {
  if (portsA === 'any') {
    if (portsB === 'any') return ['any'];
    return Array.from(portsB).map(String);
  }
  if (portsB === 'any') {
    // A only shadows specific ports, not the whole 'any'
    return Array.from(portsA).map(String);
  }
  // Intersect
  const shadowed: string[] = [];
  for (const port of portsB) {
    if (portsA.has(port)) {
      shadowed.push(String(port));
    }
  }
  return shadowed;
}

// Helper: Check if setB is a subset of setA
function isEntitySubset(setB: Set<string>, setA: Set<string>): boolean {
  if (setB.size === 0) {
      // If B has no targets, it means "ANY".
      // If B is ANY, A must also be ANY to cover it.
      return setA.size === 0;
  }
  if (setA.size === 0) {
      // If A is ANY, it covers any B
      return true;
  }

  for (const item of setB) {
    if (!setA.has(item)) return false;
  }
  return true;
}

// Flattens a target list to the terminal entity IDs (networks and clients) and zone IDs 
function getFlatEntities(targets: any[], topologyData: any, isSource: boolean): Set<string> {
  const { zones } = topologyData;
  const result = new Set<string>();

  if (!targets || targets.length === 0) {
      // ANY source/destination
      // For conflict detection, ANY is just represented as an empty set to denote "everything".
      return result;
  }

  targets.forEach(target => {
    if (target.clientId) {
      result.add(`client-${target.clientId}`);
    } else if (target.networkId) {
      result.add(`network-${target.networkId}`);
      // also add its clients
      const zone = zones.find((z: any) => z.networks.some((n: any) => n.id === target.networkId));
      const net = zone?.networks.find((n: any) => n.id === target.networkId);
      net?.clients.forEach((c: any) => result.add(`client-${c.id}`));
    } else if (target.zoneId) {
      result.add(`zone-${target.zoneId}`);
      const zone = zones.find((z: any) => z.id === target.zoneId);
      zone?.networks.forEach((n: any) => {
        let includeNet = true;
        if (target.cidr && n.cidr) {
          includeNet = isNetworkInCidr(n.cidr, target.cidr);
        }
        if (includeNet) {
          result.add(`network-${n.id}`);
          n.clients.forEach((c: any) => result.add(`client-${c.id}`));
        }
      });
    }
  });

  return result;
}

export function detectRuleConflicts(rules: any[], topologyData: any): Record<string, ConflictInfo> {
  const conflicts: Record<string, ConflictInfo> = {};

  // Sort active rules by priority (lowest number = highest priority)
  const activeRules = rules.filter(r => r.active).sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));

  // Pre-calculate flat sets for performance
  const flatSrc: Record<string, Set<string>> = {};
  const flatDst: Record<string, Set<string>> = {};
  const parsedPorts: Record<string, Set<number> | 'any'> = {};

  activeRules.forEach(r => {
    flatSrc[r.id] = getFlatEntities(r.sources, topologyData, true);
    flatDst[r.id] = getFlatEntities(r.destinations, topologyData, false);
    parsedPorts[r.id] = parsePorts(r.ports);
    
    // Initialize default conflict state
    conflicts[r.id] = {
      isFullyShadowed: false,
      shadowingRuleNames: [],
      shadowedPorts: []
    };
  });

  // For each rule, check if any higher priority rule shadows it
  for (let i = 0; i < activeRules.length; i++) {
    const rule = activeRules[i];
    const myPorts = parsedPorts[rule.id];
    let fullyShadowed = false;
    const shadowingRuleNames = new Set<string>();
    const shadowedPorts = new Set<string>();

    for (let j = 0; j < i; j++) {
      const higher = activeRules[j];

      const srcCovers = isEntitySubset(flatSrc[rule.id], flatSrc[higher.id]);
      const dstCovers = isEntitySubset(flatDst[rule.id], flatDst[higher.id]);

      // If the higher priority rule's paths cover our possible paths
      if (srcCovers && dstCovers) {
        const higherPorts = parsedPorts[higher.id];
        const sp = getShadowedPorts(higherPorts, myPorts);
        
        if (sp.length > 0) {
          shadowingRuleNames.add(higher.description || higher.name || 'Unnamed Rule');
          sp.forEach(p => shadowedPorts.add(p));
        }

        if (portCovers(higherPorts, myPorts)) {
          fullyShadowed = true;
          break; // Optimization: we are completely shadowed by this single rule
        }
      }
    }

    // Check if the combination of partially shadowing rules fully covers this rule
    if (!fullyShadowed && myPorts !== 'any' && shadowedPorts.size === myPorts.size && myPorts.size > 0) {
      fullyShadowed = true;
    }

    conflicts[rule.id] = {
      isFullyShadowed: fullyShadowed,
      shadowingRuleNames: Array.from(shadowingRuleNames),
      shadowedPorts: Array.from(shadowedPorts)
    };
  }

  // Assign empty conflict info for inactive rules
  rules.filter(r => !r.active).forEach(r => {
    conflicts[r.id] = {
      isFullyShadowed: false,
      shadowingRuleNames: [],
      shadowedPorts: []
    };
  });

  return conflicts;
}

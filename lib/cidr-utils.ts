import ipaddr from 'ipaddr.js'

/**
 * Checks if a target CIDR (e.g. "192.168.1.0/24") is completely contained within
 * or matches a filter CIDR (e.g. "192.168.0.0/16").
 * It can also be used to just check if they overlap, but containment is safer for rules.
 * For this firewall tool, we usually want to know if the target network is affected by the filter.
 */
export function isNetworkInCidr(targetCidr: string | null | undefined, filterCidr: string | null | undefined): boolean {
  if (!targetCidr || !filterCidr) return false;

  try {
    // Both must be valid CIDR strings in the format "ip/prefix"
    const [targetIpStr, targetPrefixStr] = targetCidr.split('/');
    const [filterIpStr, filterPrefixStr] = filterCidr.split('/');

    if (!targetIpStr || !targetPrefixStr || !filterIpStr || !filterPrefixStr) {
      return false;
    }

    const targetPrefix = parseInt(targetPrefixStr, 10);
    const filterPrefix = parseInt(filterPrefixStr, 10);

    const targetAddr = ipaddr.parse(targetIpStr);
    const filterAddr = ipaddr.parse(filterIpStr);

    // If one is IPv4 and the other is IPv6, they don't match
    if (targetAddr.kind() !== filterAddr.kind()) {
      return false;
    }

    // A target is within a filter if:
    // 1. The filter prefix is equal or smaller (smaller prefix = larger network)
    // 2. The target's IP matches the filter's prefix
    if (targetPrefix < filterPrefix) {
      // The target network is LARGER than the filter network.
      // So it's not strictly contained. (Though it overlaps). We will return true only if we want overlap.
      // For firewall zones, if I filter by 192.168.0.0/24, a network 192.168.0.0/16 should not be automatically fully included.
      // Wait, if a zone has a big network, and we restrict the rule to a subset, we probably only want networks that fit *inside* the restriction, or we just match if their IPs overlap.
      // Let's implement containment: target must be inside filter.
      return false;
    }

    return targetAddr.match(filterAddr, filterPrefix);
  } catch (err) {
    // If parsing fails, they don't match.
    return false;
  }
}

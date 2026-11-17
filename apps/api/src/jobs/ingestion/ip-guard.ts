import { isIPv4, isIPv6 } from 'node:net';

/**
 * Address classification for the URL importer's SSRF guard.
 * Anything that is not a plain public unicast address is rejected: loopback,
 * private (RFC 1918), link-local (incl. cloud metadata 169.254.169.254),
 * CGNAT, multicast, reserved/documentation ranges and the IPv6 equivalents,
 * including IPv4-mapped / NAT64 / 6to4 forms that smuggle an IPv4 address.
 */

function parseIPv4(ip: string): number[] | null {
  if (!isIPv4(ip)) return null;
  return ip.split('.').map(Number);
}

/** [network, prefixLength] pairs for blocked IPv4 space. */
const BLOCKED_V4: readonly (readonly [string, number])[] = [
  ['0.0.0.0', 8], // "this" network
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // CGNAT (also Alibaba metadata 100.100.100.200)
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, cloud metadata
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.88.99.0', 24], // 6to4 relay anycast
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved + broadcast
];

function v4ToInt(octets: number[]): number {
  return (
    ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0
  );
}

export function isBlockedIPv4(ip: string): boolean {
  const octets = parseIPv4(ip);
  if (!octets) return true; // unparseable: fail closed
  const value = v4ToInt(octets);
  return BLOCKED_V4.some(([network, bits]) => {
    const base = v4ToInt(network.split('.').map(Number));
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (value & mask) >>> 0 === (base & mask) >>> 0;
  });
}

/** Expand any valid IPv6 text form (incl. embedded dotted IPv4) to 8 groups. */
function expandIPv6(ip: string): number[] | null {
  let text = ip.split('%')[0].toLowerCase(); // drop zone id
  if (!isIPv6(text)) return null;
  const lastColon = text.lastIndexOf(':');
  const tail = text.slice(lastColon + 1);
  if (tail.includes('.')) {
    const v4 = parseIPv4(tail);
    if (!v4) return null;
    const hi = ((v4[0] << 8) | v4[1]).toString(16);
    const lo = ((v4[2] << 8) | v4[3]).toString(16);
    text = `${text.slice(0, lastColon + 1)}${hi}:${lo}`;
  }
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const head = halves[0];
  const rest = halves.length > 1 ? halves[1] : '';
  const headGroups = head === '' ? [] : head.split(':');
  const restGroups = rest === '' ? [] : rest.split(':');
  let groups: string[];
  if (halves.length === 1) {
    groups = headGroups;
  } else {
    const missing = 8 - headGroups.length - restGroups.length;
    if (missing < 0) return null;
    groups = [
      ...headGroups,
      ...Array<string>(missing).fill('0'),
      ...restGroups,
    ];
  }
  if (groups.length !== 8) return null;
  const numbers = groups.map((g) => parseInt(g, 16));
  if (numbers.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff)) return null;
  return numbers;
}

function embeddedV4(hi: number, lo: number): string {
  return `${String(hi >> 8)}.${String(hi & 0xff)}.${String(lo >> 8)}.${String(lo & 0xff)}`;
}

export function isBlockedIPv6(ip: string): boolean {
  const g = expandIPv6(ip);
  if (!g) return true; // unparseable: fail closed
  const allZeroUntil = (n: number) => g.slice(0, n).every((x) => x === 0);

  // :: (unspecified) and ::1 (loopback)
  if (allZeroUntil(7) && (g[7] === 0 || g[7] === 1)) return true;
  // ::ffff:a.b.c.d (IPv4-mapped) and ::a.b.c.d (deprecated IPv4-compatible)
  if (allZeroUntil(5) && (g[5] === 0xffff || g[5] === 0)) {
    return isBlockedIPv4(embeddedV4(g[6], g[7]));
  }
  // ::ffff:0:a.b.c.d (IPv4-translated, RFC 2765)
  if (allZeroUntil(4) && g[4] === 0xffff && g[5] === 0) {
    return isBlockedIPv4(embeddedV4(g[6], g[7]));
  }
  // 64:ff9b::/96 NAT64: judge by the embedded IPv4 address
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) {
    return isBlockedIPv4(embeddedV4(g[6], g[7]));
  }
  // 64:ff9b:1::/48 local-use NAT64
  if (g[0] === 0x64 && g[1] === 0xff9b && g[2] === 1) return true;
  // 2002::/16 6to4: judge by the embedded IPv4 address
  if (g[0] === 0x2002) return isBlockedIPv4(embeddedV4(g[1], g[2]));
  // 2001::/32 Teredo, 2001:db8::/32 documentation
  if (g[0] === 0x2001 && (g[1] === 0 || g[1] === 0x0db8)) return true;
  // 100::/64 discard-only
  if (g[0] === 0x100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return true;
  // fc00::/7 unique local (includes AWS metadata fd00:ec2::254)
  if ((g[0] & 0xfe00) === 0xfc00) return true;
  // fe80::/10 link-local, fec0::/10 site-local (deprecated)
  if ((g[0] & 0xffc0) === 0xfe80 || (g[0] & 0xffc0) === 0xfec0) return true;
  // ff00::/8 multicast
  if ((g[0] & 0xff00) === 0xff00) return true;
  return false;
}

export function isBlockedAddress(ip: string): boolean {
  if (isIPv4(ip)) return isBlockedIPv4(ip);
  if (isIPv6(ip)) return isBlockedIPv6(ip);
  return true;
}

import { isIPv4, isIPv6 } from 'node:net';

/**
 * Address classification for the URL importer's SSRF guard. This is the ONLY
 * place IP text is parsed and classified; the fetcher just calls
 * isBlockedAddress().
 *
 * Contract: an address is acceptable only if it is a public unicast host
 * address that an ordinary outbound HTTP(S) request could legitimately reach.
 * Everything else is rejected, and anything unparseable fails closed.
 *
 * IPv4 is a deny-list of the IANA special-purpose IPv4 registry (all of IPv4
 * outside those blocks is public unicast).
 *
 * IPv6 is an ALLOW-list, because the unallocated and reserved space is far
 * larger than the special-purpose registry and a deny-list can never be
 * complete (a previous version let 4000::1 and 3ffe::1 through). An IPv6
 * address is accepted only when ALL of these hold:
 *   1. it lies inside a block IANA has ALLOCATED to a Regional Internet
 *      Registry (IPV6_ALLOCATED_GLOBAL_UNICAST below), and
 *   2. it is not inside a special-purpose block nested in that space
 *      (IPV6_SPECIAL_PURPOSE_IN_ALLOCATED).
 * Transition addresses that embed an IPv4 address are judged by that IPv4
 * address instead: the NAT64 well-known prefix 64:ff9b::/96 (RFC 6052) and
 * 6to4 2002::/16 (RFC 3056). Both exist so IPv6-only hosts can reach IPv4
 * servers; judging the embedded IPv4 stops them smuggling a private target.
 *
 * Deliberately rejected (not judged by an embedded IPv4), because no honest
 * DNS answer contains them: IPv4-mapped ::ffff:0:0/96, deprecated IPv4-
 * compatible ::/96 and IPv4-translated ::ffff:0:0:0/96, loopback/unspecified,
 * local-use NAT64 64:ff9b:1::/48 (RFC 8215), discard 100::/64, SRv6 5f00::/16,
 * unique-local fc00::/7 (incl. AWS metadata fd00:ec2::254), link-local
 * fe80::/10, deprecated site-local fec0::/10, multicast ff00::/8, Teredo
 * 2001::/32, benchmarking 2001:2::/48, ORCHID, documentation 2001:db8::/32 and
 * 3fff::/20, and the IANA-RESERVED space from 2d00:: upward including the
 * returned 6bone block 3ffe::/16.
 *
 * Known, deliberate exceptions: the whole of 2001::/23 (IETF protocol
 * assignments) is rejected although a few sub-blocks in it (anycast helpers,
 * AMT, AS112, ORCHIDv2) are globally reachable: none is a web host.
 * 2620:4f:8000::/48 (AS112 direct delegation) is rejected for the same reason.
 *
 * Known limitations: (a) a network-specific NAT64 prefix (RFC 6052 section
 * 2.2) inside ordinary allocated space cannot be recognised from the address
 * alone; (b) the allocated-block table is a snapshot, so a block IANA
 * allocates later is rejected (fails closed) until the table is refreshed -
 * regenerate it from the registry named below and update the snapshot date.
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

/**
 * IANA IPv6 Global Unicast Address Assignments, status ALLOCATED, minus
 * 2001::/23 (IETF special-purpose) and 2002::/16 (6to4, handled separately).
 * Source: https://www.iana.org/assignments/ipv6-unicast-address-assignments/
 * Snapshot retrieved 2026-11-18 (includes 2410::/12 added 2024-11-01).
 */
const IPV6_ALLOCATED_GLOBAL_UNICAST: readonly string[] = [
  '2001:200::/23', // APNIC
  '2001:400::/23', // ARIN
  '2001:600::/23', // RIPE NCC
  '2001:800::/22', // RIPE NCC
  '2001:c00::/23', // APNIC
  '2001:e00::/23', // APNIC
  '2001:1200::/23', // LACNIC
  '2001:1400::/22', // RIPE NCC
  '2001:1800::/23', // ARIN
  '2001:1a00::/23', // RIPE NCC
  '2001:1c00::/22', // RIPE NCC
  '2001:2000::/19', // RIPE NCC
  '2001:4000::/23', // RIPE NCC
  '2001:4200::/23', // AFRINIC
  '2001:4400::/23', // APNIC
  '2001:4600::/23', // RIPE NCC
  '2001:4800::/23', // ARIN
  '2001:4a00::/23', // RIPE NCC
  '2001:4c00::/23', // RIPE NCC
  '2001:5000::/20', // RIPE NCC
  '2001:8000::/19', // APNIC
  '2001:a000::/20', // APNIC
  '2001:b000::/20', // APNIC
  '2003::/18', // RIPE NCC
  '2400::/12', // APNIC
  '2410::/12', // APNIC
  '2600::/12', // ARIN
  '2610::/23', // ARIN
  '2620::/23', // ARIN
  '2630::/12', // ARIN
  '2800::/12', // LACNIC
  '2a00::/12', // RIPE NCC
  '2a10::/12', // RIPE NCC
  '2c00::/12', // AFRINIC
];

/**
 * Special-purpose blocks (IANA IPv6 Special-Purpose Address Registry) that sit
 * INSIDE an allocated block above and are not ordinary public hosts.
 * Source: https://www.iana.org/assignments/iana-ipv6-special-registry/
 */
const IPV6_SPECIAL_PURPOSE_IN_ALLOCATED: readonly string[] = [
  '2001:db8::/32', // documentation (RFC 3849), inside 2001:c00::/23
  '2620:4f:8000::/48', // direct delegation AS112 (RFC 7534), inside 2620::/23
];

/** NAT64 well-known prefix (RFC 6052): judged by the embedded IPv4. */
const NAT64_WELL_KNOWN = '64:ff9b::/96';
/** 6to4 (RFC 3056): judged by the IPv4 embedded in bits 16..47. */
const SIX_TO_FOUR = '2002::/16';

interface Prefix {
  readonly groups: number[];
  readonly bits: number;
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

function parsePrefix(cidr: string): Prefix {
  const [address, length] = cidr.split('/');
  const groups = expandIPv6(address);
  if (!groups) throw new Error(`invalid IPv6 prefix in ip-guard: ${cidr}`);
  return { groups, bits: Number(length) };
}

/** True if the 8-group address lies inside the prefix. */
function inPrefix(g: number[], prefix: Prefix): boolean {
  let remaining = prefix.bits;
  for (let i = 0; i < 8 && remaining > 0; i++) {
    const take = Math.min(16, remaining);
    const mask = (0xffff << (16 - take)) & 0xffff;
    if ((g[i] & mask) !== (prefix.groups[i] & mask)) return false;
    remaining -= take;
  }
  return true;
}

const ALLOCATED = IPV6_ALLOCATED_GLOBAL_UNICAST.map(parsePrefix);
const SPECIAL_IN_ALLOCATED = IPV6_SPECIAL_PURPOSE_IN_ALLOCATED.map(parsePrefix);
const NAT64 = parsePrefix(NAT64_WELL_KNOWN);
const SIX4 = parsePrefix(SIX_TO_FOUR);

function embeddedV4(hi: number, lo: number): string {
  return `${String(hi >> 8)}.${String(hi & 0xff)}.${String(lo >> 8)}.${String(lo & 0xff)}`;
}

export function isBlockedIPv6(ip: string): boolean {
  const g = expandIPv6(ip);
  if (!g) return true; // unparseable: fail closed

  // Transition mechanisms that carry an IPv4 destination: judge the IPv4.
  if (inPrefix(g, NAT64)) return isBlockedIPv4(embeddedV4(g[6], g[7]));
  if (inPrefix(g, SIX4)) return isBlockedIPv4(embeddedV4(g[1], g[2]));

  // Everything else must be IANA-allocated global unicast...
  if (!ALLOCATED.some((p) => inPrefix(g, p))) return true;
  // ...and not a special-purpose block nested inside it.
  if (SPECIAL_IN_ALLOCATED.some((p) => inPrefix(g, p))) return true;
  return false;
}

export function isBlockedAddress(ip: string): boolean {
  if (isIPv4(ip)) return isBlockedIPv4(ip);
  if (isIPv6(ip)) return isBlockedIPv6(ip);
  return true;
}

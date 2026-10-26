import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Guards the resolved versions of security-sensitive transitive dependencies
 * recorded in the pnpm lockfile. These packages are not imported directly by
 * application code, so the lockfile is the only observable source of truth.
 *
 * - body-parser: GHSA-27r3-jxmh-p828 (fixed in 2.4.0)
 * - zod: GHSA-mrhx-c7xc-m3w5 (fixed in 4.6.6)
 */
const lockfilePath = path.resolve(__dirname, '../../../pnpm-lock.yaml');
const lockfile = fs.readFileSync(lockfilePath, 'utf8');

function resolvedVersion(pkg: string): string | null {
  const re = new RegExp(`^  ${pkg}@(\\d+\\.\\d+\\.\\d+):`, 'm');
  const match = re.exec(lockfile);
  return match ? match[1] : null;
}

function requireResolvedVersion(pkg: string): string {
  const version = resolvedVersion(pkg);
  if (!version) {
    throw new Error(`Lockfile is missing a resolved ${pkg} version`);
  }
  return version;
}

function gte(actual: string, minimum: string): boolean {
  const actualParts = actual.split('.').map(Number);
  const minimumParts = minimum.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (actualParts[i] !== minimumParts[i]) {
      return actualParts[i] > minimumParts[i];
    }
  }
  return true;
}

describe('security-sensitive vendored dependency pins', () => {
  it('resolves body-parser to the CVE-fixed version (GHSA-27r3-jxmh-p828)', () => {
    expect(gte(requireResolvedVersion('body-parser'), '2.4.0')).toBe(true);
  });

  it('resolves zod to the CVE-fixed version (GHSA-mrhx-c7xc-m3w5)', () => {
    expect(gte(requireResolvedVersion('zod'), '4.6.6')).toBe(true);
  });
});

/**
 * The authenticated integration test (`test:integration`) must be explicit,
 * validated and non-destructive. These tests need no database: they prove the
 * guard refuses unsafe configuration BEFORE any network access, that the API
 * process receives only the validated URL, and that no script can create,
 * drop or terminate anything.
 */
import { spawnSync } from 'node:child_process';
import dns from 'node:dns';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import dotenv from 'dotenv';
import { Client, Pool } from 'pg';

import { resolveTestDatabaseUrl } from './testing/test-database-guard';

interface IntegrationGuard {
  GUARD_EXIT_CODE: number;
  INTEGRATION_DATABASE_ENV: string;
  IntegrationDatabaseGuardError: new (message: string) => Error;
  buildApiEnv: (
    base: Record<string, string | undefined>,
    url: string,
  ) => Record<string, string | undefined>;
  collectDeveloperUrls: (
    env: Record<string, string | undefined>,
    envFiles: string[],
  ) => (string | undefined)[];
  parseDatabaseTarget: (
    url: string,
  ) => { host: string; port: string; database: string } | null;
  resolveIntegrationDatabaseUrl: (
    env: Record<string, string | undefined>,
    developerUrls: readonly (string | undefined)[],
  ) => string;
}

const testDir = path.resolve(__dirname, '../test');
const guard = jest.requireActual<IntegrationGuard>(
  path.join(testDir, 'integration-db-guard.cjs'),
);

const DEV = 'postgresql://dev:DEVSECRET@localhost:5432/careeros?schema=public';
const url = (database: string, host = 'localhost', port = '5432') =>
  `postgresql://tester:SECRETPW@${host}:${port}/${database}`;

const resolve = (
  integrationUrl: string | undefined,
  developerUrls: (string | undefined)[] = [DEV],
) =>
  guard.resolveIntegrationDatabaseUrl(
    { INTEGRATION_DATABASE_URL: integrationUrl },
    developerUrls,
  );

/** Cases every unsafe configuration must be refused for, with a reason. */
const UNSAFE: [string, string | undefined, RegExp][] = [
  ['missing', undefined, /is not set/],
  ['empty', '', /is not set/],
  ['blank', '   ', /is not set/],
  ['not a URL', 'not a url', /not a valid postgresql/],
  [
    'wrong protocol',
    'mysql://u:SECRETPW@localhost:3306/careeros_integration',
    /not a valid postgresql/,
  ],
  [
    'http URL',
    'http://localhost/careeros_integration',
    /not a valid postgresql/,
  ],
  [
    'no database',
    'postgresql://u:SECRETPW@localhost:5432',
    /not a valid postgresql/,
  ],
  [
    'empty database',
    'postgresql://u:SECRETPW@localhost:5432/',
    /not a valid postgresql/,
  ],
  ['the developer database', url('careeros'), /developer database/],
  [
    'developer database via 127.0.0.1',
    url('careeros', '127.0.0.1'),
    /developer database/,
  ],
  [
    'developer database via ::1',
    url('careeros', '[::1]'),
    /developer database/,
  ],
  [
    'developer database via 127.0.0.9',
    url('careeros', '127.0.0.9'),
    /developer database/,
  ],
  [
    'developer database via decimal IPv4',
    url('careeros', '2130706433'),
    /developer database/,
  ],
  [
    'developer database via IPv4-mapped IPv6',
    url('careeros', '[::ffff:127.0.0.1]'),
    /developer database/,
  ],
  [
    'developer database via localhost.',
    url('careeros', 'localhost.'),
    /developer database/,
  ],
  [
    'non-disposable name: postgres',
    url('postgres'),
    /does not look disposable/,
  ],
  [
    'non-disposable name: careeros_prod',
    url('careeros_prod'),
    /does not look disposable/,
  ],
  [
    'non-disposable name: careeros_latest',
    url('careeros_latest'),
    /does not look disposable/,
  ],
];

describe('integration database guard: rules', () => {
  it.each(UNSAFE)('refuses %s', (_name, value, message) => {
    expect(() => resolve(value)).toThrow(guard.IntegrationDatabaseGuardError);
    expect(() => resolve(value)).toThrow(message);
  });

  it('has no fallback: DATABASE_URL, TEST_DATABASE_URL and other variables never substitute', () => {
    expect(() =>
      guard.resolveIntegrationDatabaseUrl(
        {
          DATABASE_URL: url('careeros_integration'),
          DIRECT_URL: url('careeros_integration'),
          TEST_DATABASE_URL: url('careeros_integration'),
        },
        [],
      ),
    ).toThrow(/INTEGRATION_DATABASE_URL is not set/);
  });

  it('also protects developer URLs held only in DIRECT_URL or in .env files', () => {
    const dev = 'postgresql://u:p@localhost:5432/careeros_integration';
    expect(() =>
      resolve(url('careeros_integration'), [undefined, dev]),
    ).toThrow(/developer database/);
  });

  it('accepts a disposable database on any other endpoint', () => {
    for (const database of [
      'careeros_integration',
      'careeros_test',
      'careeros-ci-7',
      'careeros_tmp',
      'careeros_e2e',
      'careeros_disposable',
    ]) {
      expect(resolve(url(database))).toBe(url(database));
    }
    // same name as a developer database on a different host or port
    const dev = url('careeros_integration');
    expect(
      resolve(url('careeros_integration', 'localhost', '55432'), [dev]),
    ).toBeDefined();
    expect(
      resolve(url('careeros_integration', 'db.internal'), [dev]),
    ).toBeDefined();
  });

  it('never puts credentials in an error message', () => {
    const messages: string[] = [];
    for (const [, value] of UNSAFE) {
      try {
        resolve(value, [DEV]);
      } catch (error) {
        messages.push((error as Error).message);
      }
    }
    expect(messages).toHaveLength(UNSAFE.length);
    for (const message of messages) {
      expect(message).not.toMatch(/SECRETPW|DEVSECRET/);
    }
  });

  it('collects developer URLs from the environment and .env files without touching process.env', () => {
    const file = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'guard-')),
      '.env',
    );
    fs.writeFileSync(
      file,
      'DATABASE_URL="postgresql://a:b@localhost:5432/from_file_db"\nDIRECT_URL=postgresql://a:b@localhost:5432/from_file_direct\n',
    );
    const before = { ...process.env };
    const urls = guard.collectDeveloperUrls({ DATABASE_URL: DEV }, [
      file,
      path.join(path.dirname(file), 'does-not-exist.env'),
    ]);
    expect(urls).toEqual(
      expect.arrayContaining([
        DEV,
        'postgresql://a:b@localhost:5432/from_file_db',
        'postgresql://a:b@localhost:5432/from_file_direct',
      ]),
    );
    expect(process.env).toEqual(before);
  });

  describe('agrees with the jest database guard on the shared target rules', () => {
    // Every case here is accepted or refused identically by both guards.
    const cases: [string, string, (string | undefined)[]][] = [
      ['valid', url('careeros_test'), [DEV]],
      ['developer database', url('careeros'), [DEV]],
      ['developer db via 127.0.0.1', url('careeros', '127.0.0.1'), [DEV]],
      ['developer db via ::1', url('careeros', '[::1]'), [DEV]],
      ['non-disposable', url('postgres'), [DEV]],
      ['latest is not a test marker', url('careeros_latest'), [DEV]],
      ['wrong protocol', 'mysql://u:p@localhost/careeros_test', [DEV]],
      ['no database', 'postgresql://u:p@localhost:5432', [DEV]],
      [
        'other port',
        url('careeros_test', 'localhost', '55432'),
        [url('careeros_test')],
      ],
    ];
    it.each(cases)('%s', (_name, value, developerUrls) => {
      const ours = (() => {
        try {
          resolve(value, developerUrls);
          return 'accepted';
        } catch {
          return 'refused';
        }
      })();
      const jestGuard = (() => {
        try {
          return resolveTestDatabaseUrl(
            { TEST_DATABASE_URL: value },
            developerUrls,
          )
            ? 'accepted'
            : 'refused';
        } catch {
          return 'refused';
        }
      })();
      expect(ours).toBe(jestGuard);
    });
  });
});

describe('integration database guard: every spelling of the same host', () => {
  const dev = 'postgresql://u:p@localhost:5432/careeros_integration';
  const against = (host: string, developer = dev, port = '5432') =>
    resolve(url('careeros_integration', host, port), [developer]);

  it.each([
    'localhost',
    'LOCALHOST',
    'localhost.',
    'db.localhost',
    '127.0.0.1',
    '127.0.0.2',
    '127.1.2.3',
    '127.255.255.254',
    '127.1', // short form
    '2130706433', // decimal 127.0.0.1
    '2130706434', // decimal 127.0.0.2
    '0x7f000001', // hex
    '0177.0.0.1', // octal
    '0.0.0.0',
    '[::1]',
    '[0:0:0:0:0:0:0:1]',
    '[::]',
    '[::ffff:127.0.0.1]', // IPv4-mapped loopback
    '[::ffff:7f00:1]',
    '[::ffff:127.255.0.9]',
    '[::127.0.0.1]', // IPv4-compatible loopback
  ])('%s is the same machine as localhost', (host) => {
    expect(() => against(host)).toThrow(/developer database/);
  });

  it.each([
    '128.0.0.1', // just outside 127.0.0.0/8
    '126.255.255.255',
    '127', // inet_aton: 0.0.0.127, not loopback
    '10.0.0.5',
    '[::2]',
    '[::ffff:128.0.0.1]',
    '[::ffff:10.0.0.5]',
    'db.internal',
    'localhost.example.com', // only the .localhost suffix is loopback
    'notlocalhost',
  ])('%s is a different machine', (host) => {
    expect(() => against(host)).not.toThrow();
  });

  it('works in the other direction: a developer URL spelled as another loopback form', () => {
    for (const developer of [
      'postgresql://u:p@127.0.0.2:5432/careeros_integration',
      'postgresql://u:p@2130706433/careeros_integration',
      'postgresql://u:p@[::ffff:7f00:1]/careeros_integration',
    ]) {
      expect(() => against('localhost', developer)).toThrow(
        /developer database/,
      );
    }
  });

  it('treats every numeric spelling of one non-loopback address as the same host', () => {
    const developer = 'postgresql://u:p@10.0.0.5:5432/careeros_integration';
    for (const host of [
      '10.0.0.5',
      '0xa000005',
      '012.0.0.5',
      '167772165',
      '[::ffff:10.0.0.5]',
      '[::ffff:a00:5]',
    ]) {
      expect(() => against(host, developer)).toThrow(/developer database/);
    }
    expect(() => against('10.0.0.6', developer)).not.toThrow();
  });

  it('still distinguishes ports and database names', () => {
    expect(() => against('127.0.0.2', dev, '55432')).not.toThrow();
    expect(() =>
      resolve(url('careeros_integration_2', '127.0.0.2'), [dev]),
    ).not.toThrow();
  });
});

describe('integration database guard: fails closed when developer configuration cannot be checked', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-failclosed-'));
  const validTarget = url('careeros_integration', 'localhost', '55432');
  let spies: jest.SpyInstance[] = [];
  afterEach(() => {
    for (const spy of spies) spy.mockRestore();
    spies = [];
  });

  it('a missing .env file simply contributes nothing', () => {
    expect(
      guard.collectDeveloperUrls({}, [path.join(tmp, 'does-not-exist.env')]),
    ).toEqual([]);
  });

  it('an .env path that exists but cannot be read is an error, not a skip', () => {
    const dirAsFile = path.join(tmp, 'a-directory.env');
    fs.mkdirSync(dirAsFile);
    expect(() => guard.collectDeveloperUrls({}, [dirAsFile])).toThrow(
      guard.IntegrationDatabaseGuardError,
    );
    expect(() => guard.collectDeveloperUrls({}, [dirAsFile])).toThrow(
      /Cannot read .*EISDIR.*cannot be completed/,
    );
  });

  it('a permission error is an error, and nothing from the file is leaked', () => {
    const file = path.join(tmp, 'locked.env');
    fs.writeFileSync(
      file,
      'DATABASE_URL=postgresql://dev:FILESECRET@localhost:5432/careeros\n',
    );
    const real = fs.readFileSync;
    spies.push(
      jest.spyOn(fs, 'readFileSync').mockImplementation(((
        target: unknown,
        ...rest: unknown[]
      ) => {
        if (target === file) {
          throw Object.assign(new Error('EACCES: FILESECRET'), {
            code: 'EACCES',
          });
        }
        return (real as (...a: unknown[]) => unknown)(target, ...rest);
      }) as unknown as typeof fs.readFileSync),
    );
    let message = '';
    try {
      guard.collectDeveloperUrls({}, [file]);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/Cannot read .*EACCES.*cannot be completed/);
    expect(message).not.toContain('FILESECRET');
  });

  it('a file that cannot be parsed is an error', () => {
    const file = path.join(tmp, 'garbled.env');
    fs.writeFileSync(file, 'DATABASE_URL=x\n');
    spies.push(
      jest.spyOn(dotenv, 'parse').mockImplementation(() => {
        throw new Error('boom: FILESECRET');
      }),
    );
    let message = '';
    try {
      guard.collectDeveloperUrls({}, [file]);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/Cannot parse .*cannot be completed/);
    expect(message).not.toContain('FILESECRET');
  });

  it('validation as a whole refuses instead of continuing without the collision check', () => {
    const dirAsFile = path.join(tmp, 'also-a-directory.env');
    fs.mkdirSync(dirAsFile);
    expect(() =>
      guard.resolveIntegrationDatabaseUrl(
        { INTEGRATION_DATABASE_URL: validTarget },
        guard.collectDeveloperUrls({}, [dirAsFile]),
      ),
    ).toThrow(guard.IntegrationDatabaseGuardError);
  });

  it.each([
    'postgresql:///careeros',
    'postgres://',
    'postgresql://localhost',
    'POSTGRESQL://:5432/',
  ])(
    'a developer URL that looks like PostgreSQL but cannot be understood (%s) is an error',
    (broken) => {
      for (const developerUrls of [[broken], [undefined, broken]]) {
        expect(() => resolve(validTarget, developerUrls)).toThrow(
          /cannot be understood/,
        );
      }
    },
  );

  it.each(['file:./dev.db', 'mysql://u:p@localhost/db', 'not a url', ''])(
    'a developer value that is not a PostgreSQL URL (%j) cannot collide and is ignored',
    (other) => {
      expect(resolve(validTarget, [other])).toBe(validTarget);
    },
  );

  it('an unusable integration URL is still reported first', () => {
    expect(() => resolve('not a url', ['postgresql:///careeros'])).toThrow(
      /not a valid postgresql/,
    );
  });
});

describe('integration database guard: refusal happens before any network access', () => {
  const spies: jest.SpyInstance[] = [];
  const tripwire = () => {
    throw new Error('NETWORK ACCESS ATTEMPTED');
  };
  beforeEach(() => {
    spies.push(
      jest.spyOn(net.Socket.prototype, 'connect').mockImplementation(tripwire),
      jest.spyOn(dns, 'lookup').mockImplementation(tripwire),
      jest.spyOn(Client.prototype, 'connect').mockImplementation(tripwire),
      jest.spyOn(Pool.prototype, 'connect').mockImplementation(tripwire),
    );
  });
  afterEach(() => {
    for (const spy of spies.splice(0)) spy.mockRestore();
  });

  it.each(UNSAFE)(
    '%s: refused with no socket, DNS or pg activity',
    (_name, value) => {
      expect(() => resolve(value)).toThrow(guard.IntegrationDatabaseGuardError);
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    },
  );
});

describe('integration scripts: refuse before connecting or starting a server', () => {
  const preload = path.join(testDir, 'block-network.cjs');
  const scripts = [
    'check-integration-env.mjs',
    'authenticated-tenancy.integration.mjs',
  ];
  // Only what node needs to start; no database variables are inherited.
  const inherited = (name: string) => process.env[name];
  const baseEnv: Record<string, string> = Object.fromEntries(
    ['PATH', 'SystemRoot', 'TEMP']
      .map((name) => [name, inherited(name)] as const)
      .filter((entry): entry is [string, string] => entry[1] !== undefined),
  );

  const run = (script: string, env: Record<string, string>) =>
    spawnSync(
      process.execPath,
      ['--require', preload, path.join(testDir, script)],
      {
        cwd: path.resolve(testDir, '..'),
        env: { ...baseEnv, ...env },
        encoding: 'utf8',
        timeout: 30_000,
      },
    );

  const refused: [string, Record<string, string>, RegExp][] = [
    ['missing configuration', {}, /INTEGRATION_DATABASE_URL is not set/],
    ['blank configuration', { INTEGRATION_DATABASE_URL: '  ' }, /is not set/],
    [
      'DATABASE_URL alone is not a fallback',
      { DATABASE_URL: url('careeros_integration') },
      /is not set/,
    ],
    [
      'malformed URL',
      { INTEGRATION_DATABASE_URL: 'not a url' },
      /not a valid postgresql/,
    ],
    [
      'wrong protocol',
      { INTEGRATION_DATABASE_URL: 'mysql://u:SECRETPW@h/careeros_integration' },
      /not a valid postgresql/,
    ],
    [
      'developer database (DATABASE_URL)',
      {
        INTEGRATION_DATABASE_URL: url('careeros_integration'),
        DATABASE_URL: url('careeros_integration', '127.0.0.1'),
      },
      /developer database/,
    ],
    [
      'developer database (DIRECT_URL)',
      {
        INTEGRATION_DATABASE_URL: url('careeros_integration'),
        DIRECT_URL: url('careeros_integration'),
      },
      /developer database/,
    ],
    [
      'developer database spelled as another loopback address',
      {
        INTEGRATION_DATABASE_URL: url('careeros_integration', '127.0.0.2'),
        DATABASE_URL: url('careeros_integration', '2130706433'),
      },
      /developer database/,
    ],
    [
      'developer database configured as IPv4-mapped loopback',
      {
        INTEGRATION_DATABASE_URL: url('careeros_integration', 'localhost'),
        DIRECT_URL: url('careeros_integration', '[::ffff:7f00:1]'),
      },
      /developer database/,
    ],
    [
      'a developer DATABASE_URL that cannot be understood',
      {
        INTEGRATION_DATABASE_URL: url(
          'careeros_integration',
          'localhost',
          '55432',
        ),
        DATABASE_URL: 'postgresql:///careeros',
      },
      /cannot be understood/,
    ],
    [
      'non-disposable name: careeros',
      { INTEGRATION_DATABASE_URL: url('careeros_zzz_real') },
      /does not look disposable/,
    ],
    [
      'non-disposable name: postgres',
      { INTEGRATION_DATABASE_URL: url('postgres') },
      /does not look disposable/,
    ],
  ];

  describe.each(scripts)('%s', (script) => {
    it.each(refused)('%s', (_name, env, message) => {
      const result = run(script, env);
      // exit code 2 is the guard; 99 would mean a socket/DNS/spawn attempt
      expect(result.status).toBe(guard.GUARD_EXIT_CODE);
      expect(result.stderr).toMatch(message);
      expect(result.stderr).not.toContain('NETWORK_OR_SPAWN_ATTEMPTED');
      expect(result.stdout).not.toMatch(/accepted|listening|health/i);
      expect(`${result.stdout}${result.stderr}`).not.toMatch(/SECRETPW/);
    });
  });

  it('the validation step itself accepts a good target without any network access', () => {
    const result = run('check-integration-env.mjs', {
      INTEGRATION_DATABASE_URL: url(
        'careeros_integration',
        'localhost',
        '55432',
      ),
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      'Integration database target accepted: localhost:55432/careeros_integration',
    );
    expect(result.stderr).not.toContain('NETWORK_OR_SPAWN_ATTEMPTED');
    expect(`${result.stdout}${result.stderr}`).not.toMatch(/SECRETPW/);
  });
});

describe('integration scripts: the API process only sees the validated database', () => {
  it('buildApiEnv replaces any inherited developer database and sets DIRECT_URL too', () => {
    const validated = url('careeros_integration', 'localhost', '55432');
    const env = guard.buildApiEnv(
      {
        DATABASE_URL: DEV,
        DIRECT_URL: DEV,
        CORS_ORIGIN: 'http://localhost:3000',
        PATH: 'x',
      },
      validated,
    );
    expect(env.DATABASE_URL).toBe(validated);
    expect(env.DIRECT_URL).toBe(validated);
    expect(env.CORS_ORIGIN).toBe('http://localhost:3000');
    expect(JSON.stringify(env)).not.toContain('DEVSECRET');
  });

  it('the test script launches the API with buildApiEnv and validates before importing anything that connects', () => {
    const source = fs.readFileSync(
      path.join(testDir, 'authenticated-tenancy.integration.mjs'),
      'utf8',
    );
    expect(source).toMatch(/guard\.buildApiEnv\(process\.env, databaseUrl\)/);
    const guardCall = source.indexOf('guard.resolveForProcess()');
    expect(guardCall).toBeGreaterThan(-1);
    // nothing that can connect is imported statically, nothing runs before the guard
    expect(source).not.toMatch(/^import .* from '(pg|@prisma\/adapter-pg)'/m);
    expect(source).not.toMatch(/^import .* from '\.\.\/dist\//m);
    for (const dynamicImport of [
      "import('pg')",
      "import('@prisma/adapter-pg')",
      "import('../dist/",
    ]) {
      expect(source.indexOf(dynamicImport)).toBeGreaterThan(guardCall);
    }
    expect(source.indexOf('spawn(process.execPath')).toBeGreaterThan(guardCall);
  });
});

describe('integration scripts: nothing hard-coded, nothing destructive', () => {
  const scriptFiles = fs
    .readdirSync(testDir)
    .filter((file) => /\.(mjs|cjs|ps1)$/.test(file))
    .map((file) => ({
      file,
      source: fs.readFileSync(path.join(testDir, file), 'utf8'),
    }));

  it('finds the integration scripts', () => {
    expect(scriptFiles.map((s) => s.file)).toEqual(
      expect.arrayContaining([
        'authenticated-tenancy.integration.mjs',
        'check-integration-env.mjs',
        'integration-db-guard.cjs',
        'run-integration-tests.ps1',
      ]),
    );
  });

  it('contains no hard-coded database URL, host:port or credentials', () => {
    for (const { file, source } of scriptFiles) {
      expect([
        file,
        /postgres(ql)?:\/\/[^\s'"`<]+:[^\s'"`@<]+@/.test(source),
      ]).toEqual([file, false]);
      expect([file, source.includes('localhost:5432')]).toEqual([file, false]);
    }
  });

  it('contains no CREATE/DROP DATABASE, session termination or database-lifecycle command', () => {
    for (const { file, source } of scriptFiles) {
      for (const forbidden of [
        /DROP\s+DATABASE/i,
        /CREATE\s+DATABASE/i,
        /pg_terminate_backend/i,
        /pg_cancel_backend/i,
        /DROP\s+SCHEMA/i,
        /migrate\s+reset/i,
        /db\s+push/i,
        /--cleanup/,
        /setup-integration-db/,
      ]) {
        expect([file, forbidden.test(source)]).toEqual([file, false]);
      }
    }
  });

  it('the old create/drop helper is gone and nothing references it', () => {
    expect(fs.existsSync(path.join(testDir, 'setup-integration-db.mjs'))).toBe(
      false,
    );
    const pkg = fs.readFileSync(
      path.resolve(testDir, '../package.json'),
      'utf8',
    );
    expect(pkg).not.toMatch(/setup-integration-db/);
    expect(pkg).toMatch(
      /"test:integration": "node test\/check-integration-env\.mjs && pnpm run build && node test\/authenticated-tenancy\.integration\.mjs"/,
    );
  });
});

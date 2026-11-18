import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import dotenv from 'dotenv';

import {
  collectDeveloperUrls,
  describeTarget,
  looksLikeTestDatabase,
  parseDatabaseTarget,
  resolveTestDatabaseUrl,
  TestDatabaseGuardError,
  UNSAFE_OVERRIDE_ENV,
} from './testing/test-database-guard';

const DEV =
  'postgresql://careeros:s3cret-dev-pw@localhost:5432/careeros?schema=public';
const url = (database: string, host = 'localhost', port = '5432') =>
  `postgresql://tester:s3cret-test-pw@${host}:${port}/${database}?schema=public`;

const resolve = (
  env: Record<string, string | undefined>,
  dev:
    | readonly (string | undefined)[]
    | (() => readonly (string | undefined)[]) = [DEV],
) => resolveTestDatabaseUrl(env, dev);

describe('test database guard', () => {
  describe('opt-in', () => {
    it.each([undefined, '', '   '])(
      'requests no database when TEST_DATABASE_URL is %j (DB suites must skip)',
      (value) => {
        expect(resolve({ TEST_DATABASE_URL: value })).toBeUndefined();
      },
    );

    it('ignores a developer DATABASE_URL entirely: it is never used', () => {
      expect(resolve({ DATABASE_URL: DEV })).toBeUndefined();
    });

    it('returns the requested URL when it is a safe test database', () => {
      const requested = url('careeros_test');
      expect(resolve({ TEST_DATABASE_URL: requested })).toBe(requested);
    });
  });

  describe('invalid input', () => {
    it.each([
      'not a url',
      'mysql://u:p@localhost:3306/careeros_test',
      'postgresql://u:p@localhost:5432',
      'postgresql://u:p@localhost:5432/',
      'http://localhost/careeros_test',
    ])('rejects %j', (value) => {
      expect(() => resolve({ TEST_DATABASE_URL: value })).toThrow(
        TestDatabaseGuardError,
      );
    });
  });

  describe('refuses the developer database', () => {
    it.each([
      ['identical URL', DEV.replace('careeros?', 'careeros_test?'), false],
      ['the same database', url('careeros'), true],
      [
        '127.0.0.1 is the same host as localhost',
        url('careeros', '127.0.0.1'),
        true,
      ],
      ['::1 is the same host as localhost', url('careeros', '[::1]'), true],
      ['an explicit default port', url('careeros', 'localhost', '5432'), true],
    ])('%s', (_name, requested, shouldThrow) => {
      const run = () => resolve({ TEST_DATABASE_URL: requested });
      if (shouldThrow) expect(run).toThrow(/developer database/);
      else expect(run).not.toThrow();
    });

    it('also protects a developer database named only in DIRECT_URL or the shell', () => {
      const dev = 'postgresql://u:p@localhost:5432/careeros_integration';
      expect(() =>
        resolveTestDatabaseUrl(
          { TEST_DATABASE_URL: url('careeros_integration') },
          [undefined, dev],
        ),
      ).toThrow(/developer database/);
    });

    it('allows the same database name on a different host or port', () => {
      const dev = url('careeros_test');
      expect(
        resolveTestDatabaseUrl(
          { TEST_DATABASE_URL: url('careeros_test', 'localhost', '5544') },
          [dev],
        ),
      ).toBeDefined();
      expect(
        resolveTestDatabaseUrl(
          { TEST_DATABASE_URL: url('careeros_test', 'db.internal') },
          [dev],
        ),
      ).toBeDefined();
    });
  });

  describe('refuses obviously non-test database names', () => {
    it.each([
      'careeros',
      'postgres',
      'production',
      'prod',
      'careeros_prod',
      'staging',
      'careeros_latest', // "test" inside a word does not count
      'contest',
      'attestation',
    ])('rejects %s', (database) => {
      expect(() => resolve({ TEST_DATABASE_URL: url(database) }, [])).toThrow(
        /does not look like a test database/,
      );
    });

    it.each([
      'careeros_test',
      'careeros_test_2',
      'careeros-test',
      'CAREEROS_TEST',
      'careeros_integration',
      'careeros_ci',
      'careeros-ci-42',
      'test',
      'tmp_careeros',
      'careeros_tmp',
      'careeros_e2e',
      'careeros_scratch',
      'careeros_disposable',
    ])('accepts %s', (database) => {
      expect(looksLikeTestDatabase(database)).toBe(true);
      expect(resolve({ TEST_DATABASE_URL: url(database) }, [])).toBeDefined();
    });
  });

  describe('deliberate override', () => {
    let warn: jest.SpyInstance;
    beforeEach(() => {
      warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });
    afterEach(() => {
      warn.mockRestore();
    });

    it('lets a non-test name and the developer database through, loudly', () => {
      for (const requested of [url('careeros'), url('staging')]) {
        expect(
          resolve({
            TEST_DATABASE_URL: requested,
            [UNSAFE_OVERRIDE_ENV]: '1',
          }),
        ).toBe(requested);
      }
      expect(warn).toHaveBeenCalledTimes(2);
      expect(String((warn.mock.calls as unknown[][])[0][0])).toContain(
        UNSAFE_OVERRIDE_ENV,
      );
    });

    it.each(['0', 'true', 'yes', ''])(
      'does not honour %j: only the exact value 1 counts',
      (value) => {
        expect(() =>
          resolve({
            TEST_DATABASE_URL: url('careeros'),
            [UNSAFE_OVERRIDE_ENV]: value,
          }),
        ).toThrow(TestDatabaseGuardError);
      },
    );

    it('still rejects an invalid URL even with the override', () => {
      expect(() =>
        resolve({ TEST_DATABASE_URL: 'nonsense', [UNSAFE_OVERRIDE_ENV]: '1' }),
      ).toThrow(/not a valid postgresql/);
    });

    it('the override alone does not request a database', () => {
      expect(resolve({ [UNSAFE_OVERRIDE_ENV]: '1' })).toBeUndefined();
    });
  });

  describe('never leaks credentials', () => {
    it('keeps passwords out of every error and warning', () => {
      const messages: string[] = [];
      for (const requested of [url('careeros'), url('staging'), DEV]) {
        try {
          resolve({ TEST_DATABASE_URL: requested });
        } catch (error) {
          messages.push((error as Error).message);
        }
      }
      expect(messages).toHaveLength(3);
      for (const message of messages) {
        expect(message).not.toContain('s3cret');
      }
    });
  });

  describe('parseDatabaseTarget', () => {
    it('normalises loopback hosts, default port and ignores query params', () => {
      const expected = { host: 'localhost', port: '5432', database: 'db' };
      for (const host of ['localhost', '127.0.0.1', '[::1]', 'LOCALHOST']) {
        expect(
          parseDatabaseTarget(`postgres://u:p@${host}/db?schema=public&x=1`),
        ).toEqual(expected);
      }
    });
  });
});

describe('test database guard: one implementation shared with the integration guard', () => {
  const sharedPath = path.resolve(
    __dirname,
    '../test/integration-db-guard.cjs',
  );
  const shared = jest.requireActual<{
    parseDatabaseTarget: unknown;
    describeTarget: unknown;
    looksDisposable: unknown;
  }>(sharedPath);

  it('re-exports the integration guard functions: the same references, not copies', () => {
    expect(parseDatabaseTarget).toBe(shared.parseDatabaseTarget);
    expect(describeTarget).toBe(shared.describeTarget);
    expect(looksLikeTestDatabase).toBe(shared.looksDisposable);
  });

  it('contains no second implementation of URL parsing, host normalisation or the name marker', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, 'testing/test-database-guard.ts'),
      'utf8',
    );
    // Strip comments so the explanation above cannot trip the scan.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    for (const forbidden of [
      /new URL\(/,
      /LOOPBACK/i,
      /TEST_NAME_MARKER/,
      /decodeURIComponent/,
      /127\./,
    ]) {
      expect(forbidden.test(code)).toBe(false);
    }
    expect(code).toMatch(/integration-db-guard\.cjs/);
  });
});

describe('test database guard: every spelling of the same host', () => {
  const dev = 'postgresql://u:p@localhost:5432/careeros_test';
  const against = (host: string, developer = dev, port = '5432') =>
    resolve({ TEST_DATABASE_URL: url('careeros_test', host, port) }, [
      developer,
    ]);

  it.each([
    'localhost',
    'LOCALHOST',
    'localhost.',
    'db.localhost',
    '127.0.0.1',
    '127.0.0.2',
    '127.1.2.3',
    '127.255.255.254',
    '127.1',
    '2130706433',
    '2130706434',
    '0x7f000001',
    '0177.0.0.1',
    '0.0.0.0',
    '[::1]',
    '[0:0:0:0:0:0:0:1]',
    '[::]',
    '[::ffff:127.0.0.1]',
    '[::ffff:7f00:1]',
    '[::ffff:127.255.0.9]',
    '[::127.0.0.1]',
  ])('%s is the same machine as localhost', (host) => {
    expect(() => against(host)).toThrow(/developer database/);
  });

  it.each([
    '128.0.0.1', // just outside 127.0.0.0/8
    '126.255.255.255',
    '127', // inet_aton: 0.0.0.127
    '10.0.0.5',
    '[::2]',
    '[::ffff:128.0.0.1]',
    '[::ffff:10.0.0.5]',
    'db.internal',
    'localhost.example.com', // only the .localhost suffix is loopback
    'notlocalhost',
  ])('%s is a different machine (no false positive)', (host) => {
    expect(() => against(host)).not.toThrow();
  });

  it('works when the DEVELOPER URL is the one spelled differently', () => {
    for (const developer of [
      'postgresql://u:p@127.0.0.2:5432/careeros_test',
      'postgresql://u:p@2130706433/careeros_test',
      'postgresql://u:p@[::ffff:7f00:1]/careeros_test',
    ]) {
      expect(() => against('localhost', developer)).toThrow(
        /developer database/,
      );
    }
  });

  it('treats every numeric spelling of one non-loopback address as the same host', () => {
    const developer = 'postgresql://u:p@10.0.0.5:5432/careeros_test';
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
      resolve({ TEST_DATABASE_URL: url('careeros_test_2', '127.0.0.2') }, [
        dev,
      ]),
    ).not.toThrow();
  });

  it('a malformed percent-encoded database name is refused, not an exception', () => {
    expect(() =>
      resolve({
        TEST_DATABASE_URL: 'postgresql://u:p@localhost:5432/db%E0%A4%A',
      }),
    ).toThrow(/not a valid postgresql/);
  });

  describe('the deliberate override keeps its behaviour', () => {
    let warn: jest.SpyInstance;
    beforeEach(() => {
      warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });
    afterEach(() => {
      warn.mockRestore();
    });

    it('still bypasses the developer-database and name checks, with the warning', () => {
      const requested = url('careeros_test', '127.0.0.2');
      expect(
        resolve({ TEST_DATABASE_URL: requested, [UNSAFE_OVERRIDE_ENV]: '1' }, [
          dev,
        ]),
      ).toBe(requested);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String((warn.mock.calls as unknown[][])[0][0])).toContain(
        `${UNSAFE_OVERRIDE_ENV}=1: using localhost:5432/careeros_test without safety checks`,
      );
    });
  });
});

describe('test database guard: fails closed when developer configuration cannot be checked', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jest-guard-failclosed-'));
  const requested = url('careeros_test', 'localhost', '55432');
  let spies: jest.SpyInstance[] = [];
  afterEach(() => {
    for (const spy of spies) spy.mockRestore();
    spies = [];
  });

  describe('collectDeveloperUrls', () => {
    it('reads the shell values and every .env file, and a missing file adds nothing', () => {
      const file = path.join(tmp, 'ok.env');
      fs.writeFileSync(
        file,
        'DATABASE_URL="postgresql://a:b@localhost:5432/from_file"\nDIRECT_URL=postgresql://a:b@localhost:5432/from_direct\n',
      );
      const before = { ...process.env };
      expect(
        collectDeveloperUrls({ DATABASE_URL: DEV, DIRECT_URL: undefined }, [
          file,
          path.join(tmp, 'missing.env'),
        ]),
      ).toEqual([
        DEV,
        undefined,
        'postgresql://a:b@localhost:5432/from_file',
        'postgresql://a:b@localhost:5432/from_direct',
      ]);
      expect(process.env).toEqual(before); // reading never mutates process.env
    });

    it('an .env path that exists but cannot be read is a guard error, not a skip', () => {
      const dirAsFile = path.join(tmp, 'a-directory.env');
      fs.mkdirSync(dirAsFile);
      expect(() => collectDeveloperUrls({}, [dirAsFile])).toThrow(
        TestDatabaseGuardError,
      );
      expect(() => collectDeveloperUrls({}, [dirAsFile])).toThrow(
        /^\[test database guard\] Cannot read .*EISDIR.*cannot be completed/,
      );
    });

    it('a permission error is a guard error and nothing from the file leaks', () => {
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
      let error: Error | undefined;
      try {
        collectDeveloperUrls({}, [file]);
      } catch (caught) {
        error = caught as Error;
      }
      expect(error).toBeInstanceOf(TestDatabaseGuardError);
      expect(error?.message).toMatch(
        /Cannot read .*EACCES.*cannot be completed/,
      );
      expect(error?.message).not.toContain('FILESECRET');
      expect(error?.message).not.toContain('integration database guard');
    });

    it('a file that cannot be parsed is a guard error', () => {
      const file = path.join(tmp, 'garbled.env');
      fs.writeFileSync(file, 'DATABASE_URL=x\n');
      spies.push(
        jest.spyOn(dotenv, 'parse').mockImplementation(() => {
          throw new Error('boom: FILESECRET');
        }),
      );
      let error: Error | undefined;
      try {
        collectDeveloperUrls({}, [file]);
      } catch (caught) {
        error = caught as Error;
      }
      expect(error).toBeInstanceOf(TestDatabaseGuardError);
      expect(error?.message).toMatch(/Cannot parse .*cannot be completed/);
      expect(error?.message).not.toContain('FILESECRET');
    });
  });

  describe('resolveTestDatabaseUrl', () => {
    const unreadable = () => {
      throw new TestDatabaseGuardError(
        'Cannot read x.env (EACCES), so the check cannot be completed.',
      );
    };

    it('refuses when the developer configuration cannot be read, instead of continuing', () => {
      expect(() =>
        resolve({ TEST_DATABASE_URL: requested }, unreadable),
      ).toThrow(/Cannot read x\.env/);
    });

    it('reads the configuration lazily: only when a database was requested, and not under the override', () => {
      const thunk = jest.fn(() => [DEV]);
      // no opt-in: a plain run needs no database and must not depend on .env
      expect(resolve({}, thunk)).toBeUndefined();
      expect(resolve({ TEST_DATABASE_URL: '  ' }, thunk)).toBeUndefined();
      expect(thunk).not.toHaveBeenCalled();
      // an unreadable .env therefore cannot break a plain run
      expect(resolve({}, unreadable)).toBeUndefined();

      // deliberate override: it never consults the developer configuration
      const warn = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      expect(
        resolve(
          { TEST_DATABASE_URL: requested, [UNSAFE_OVERRIDE_ENV]: '1' },
          unreadable,
        ),
      ).toBe(requested);
      warn.mockRestore();
      expect(thunk).not.toHaveBeenCalled();

      // opted in: consulted exactly once
      expect(resolve({ TEST_DATABASE_URL: requested }, thunk)).toBe(requested);
      expect(thunk).toHaveBeenCalledTimes(1);
    });

    it.each([
      'postgresql:///careeros',
      'postgres://',
      'postgresql://localhost',
      'POSTGRESQL://:5432/',
    ])(
      'a developer URL that looks like PostgreSQL but cannot be understood (%s) is refused',
      (broken) => {
        for (const configured of [
          [broken],
          [undefined, broken],
          () => [broken],
        ]) {
          expect(() =>
            resolve({ TEST_DATABASE_URL: requested }, configured),
          ).toThrow(/cannot be understood/);
        }
      },
    );

    it.each(['file:./dev.db', 'mysql://u:p@localhost/db', 'not a url', ''])(
      'a developer value that is not a PostgreSQL URL (%j) cannot collide and is ignored',
      (other) => {
        expect(resolve({ TEST_DATABASE_URL: requested }, [other])).toBe(
          requested,
        );
      },
    );

    it('an unusable TEST_DATABASE_URL is still reported first', () => {
      expect(() =>
        resolve({ TEST_DATABASE_URL: 'not a url' }, ['postgresql:///careeros']),
      ).toThrow(/not a valid postgresql/);
    });
  });
});

describe('test setup: refuses unsafe configuration before any database or network activity', () => {
  jest.setTimeout(120_000);
  const apiDir = path.resolve(__dirname, '..');
  const preload = path.join(apiDir, 'test/block-network.cjs');
  const inherited = (name: string) => process.env[name];
  const baseEnv: Record<string, string> = Object.fromEntries(
    ['PATH', 'SystemRoot', 'TEMP', 'TMP']
      .map((name) => [name, inherited(name)] as const)
      .filter((entry): entry is [string, string] => entry[1] !== undefined),
  );

  /** Runs the REAL test/setup-env.ts in a fresh process; sockets, DNS and spawns are fatal. */
  const runSetup = (env: Record<string, string>) => {
    const result = spawnSync(
      process.execPath,
      [
        '--require',
        preload,
        '--require',
        'ts-node/register/transpile-only',
        '-e',
        "require('./test/setup-env.ts');process.stdout.write('RESULT='+JSON.stringify({DATABASE_URL:process.env.DATABASE_URL,DIRECT_URL:process.env.DIRECT_URL})+'\\n')",
      ],
      {
        cwd: apiDir,
        env: { ...baseEnv, ...env },
        encoding: 'utf8',
        timeout: 60_000,
      },
    );
    const match = /^RESULT=(.*)$/m.exec(result.stdout);
    return {
      status: result.status,
      stderr: result.stderr,
      output: `${result.stdout}${result.stderr}`,
      result: match
        ? (JSON.parse(match[1]) as { DATABASE_URL: string; DIRECT_URL: string })
        : null,
    };
  };

  const ok = url('careeros_test', '127.0.0.1', '55432');
  const refused: [string, Record<string, string>, RegExp][] = [
    [
      'developer database spelled as 127.0.0.2',
      {
        DATABASE_URL: url('careeros_test'),
        TEST_DATABASE_URL: url('careeros_test', '127.0.0.2'),
      },
      /developer database/,
    ],
    [
      'developer database configured as a decimal address',
      {
        DATABASE_URL: url('careeros_test', '2130706433'),
        TEST_DATABASE_URL: url('careeros_test'),
      },
      /developer database/,
    ],
    [
      'developer database configured as IPv4-mapped loopback (DIRECT_URL)',
      {
        DIRECT_URL: url('careeros_test', '[::ffff:7f00:1]'),
        TEST_DATABASE_URL: url('careeros_test'),
      },
      /developer database/,
    ],
    [
      'a developer DATABASE_URL that cannot be understood',
      { DATABASE_URL: 'postgresql:///careeros', TEST_DATABASE_URL: ok },
      /cannot be understood/,
    ],
    [
      'a non-test database name',
      { TEST_DATABASE_URL: url('careeros_zzz_real', 'localhost', '55432') },
      /does not look like a test database/,
    ],
    [
      'a malformed URL',
      { TEST_DATABASE_URL: 'not a url' },
      /not a valid postgresql/,
    ],
    [
      'an override value other than 1',
      {
        TEST_DATABASE_URL: url('careeros_zzz_real', 'localhost', '55432'),
        CAREEROS_ALLOW_UNSAFE_TEST_DATABASE: 'true',
      },
      /does not look like a test database/,
    ],
  ];

  it.each(refused)('refuses %s', (_name, env, message) => {
    const run = runSetup(env);
    expect(run.status).not.toBe(0);
    expect(run.status).not.toBe(99); // 99 = a socket, DNS or spawn attempt
    expect(run.stderr).toMatch(message);
    expect(run.stderr).toContain('[test database guard]');
    expect(run.output).not.toContain('NETWORK_OR_SPAWN_ATTEMPTED');
    expect(run.result).toBeNull(); // setup never completed
    expect(run.output).not.toMatch(/s3cret|PW@/);
  });

  it('no opt-in: DATABASE_URL and DIRECT_URL are blanked, whatever the shell holds', () => {
    const run = runSetup({
      DATABASE_URL: url('careeros'),
      DIRECT_URL: url('careeros'),
    });
    expect(run.status).toBe(0);
    expect(run.result).toEqual({ DATABASE_URL: '', DIRECT_URL: '' });
    expect(run.output).not.toContain('NETWORK_OR_SPAWN_ATTEMPTED');
  });

  it('no opt-in: a broken developer URL does not break a plain run (nothing needs the check)', () => {
    const run = runSetup({ DATABASE_URL: 'postgresql:///careeros' });
    expect(run.status).toBe(0);
    expect(run.result).toEqual({ DATABASE_URL: '', DIRECT_URL: '' });
  });

  it('explicit opt-in to a disposable database is accepted, with no network access', () => {
    const run = runSetup({
      DATABASE_URL: url('careeros'), // the developer database stays untouched
      TEST_DATABASE_URL: ok,
    });
    expect(run.status).toBe(0);
    expect(run.result).toEqual({ DATABASE_URL: ok, DIRECT_URL: ok });
    expect(run.output).not.toContain('NETWORK_OR_SPAWN_ATTEMPTED');
  });

  it('the deliberate override keeps its behaviour and warning', () => {
    const risky = url('careeros_zzz_real', 'localhost', '55432');
    const run = runSetup({
      TEST_DATABASE_URL: risky,
      CAREEROS_ALLOW_UNSAFE_TEST_DATABASE: '1',
    });
    expect(run.status).toBe(0);
    expect(run.result).toEqual({ DATABASE_URL: risky, DIRECT_URL: risky });
    expect(run.stderr).toContain(
      'CAREEROS_ALLOW_UNSAFE_TEST_DATABASE=1: using localhost:55432/careeros_zzz_real without safety checks',
    );
    expect(run.output).not.toContain('NETWORK_OR_SPAWN_ATTEMPTED');
  });
});

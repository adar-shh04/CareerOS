import {
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
  dev: (string | undefined)[] = [DEV],
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

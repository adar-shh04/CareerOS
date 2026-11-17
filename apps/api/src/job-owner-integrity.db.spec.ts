/**
 * Workspace-private job integrity against a real PostgreSQL database.
 *
 * Invariant under test: jobs.owner_organization_id IS NULL means a shared
 * catalog job (any workspace may reference it); a non-NULL owner means a job
 * private to that workspace (only it may reference it), and the owner never
 * changes after the job is created.
 *
 * These tests talk to the database through raw `pg` connections on purpose:
 * they bypass the application/service layer (which also enforces the rule) so
 * they prove the DATABASE refuses bad writes for any writer, and they use
 * several independent connections with explicit BEGIN/COMMIT so the
 * concurrency cases exercise PostgreSQL's real locking and visibility rules.
 * No mocks.
 *
 * Runs only when DATABASE_URL is set; point it at a disposable, fully migrated
 * database. Every row it creates is namespaced by random ids and removed
 * afterwards.
 */
import { randomUUID } from 'node:crypto';

import { Client } from 'pg';

const describeWithDatabase = process.env.DATABASE_URL
  ? describe
  : describe.skip;

const FOREIGN_KEY_VIOLATION = '23503';
const CHECK_VIOLATION = '23514';

type ChildKind = 'application' | 'workspaceJobState' | 'jobMatch';

/** One INSERT per child table that references a job. */
const CHILD_INSERT: Record<ChildKind, string> = {
  application:
    'insert into applications (id, organization_id, job_id, updated_at) values (gen_random_uuid(), $1, $2, now())',
  workspaceJobState:
    'insert into workspace_job_states (id, organization_id, job_id, updated_at) values (gen_random_uuid(), $1, $2, now())',
  jobMatch: `insert into job_matches
      (id, organization_id, job_id, overall_score, skill_score, role_score,
       experience_score, location_score, seniority_score, explanation, updated_at)
     values (gen_random_uuid(), $1, $2, 1, 1, 1, 1, 1, 1, 'integrity test', now())`,
};
const CHILD_TABLE: Record<ChildKind, string> = {
  application: 'applications',
  workspaceJobState: 'workspace_job_states',
  jobMatch: 'job_matches',
};
const KINDS = Object.keys(CHILD_INSERT) as ChildKind[];

describeWithDatabase('Private-job ownership integrity (PostgreSQL)', () => {
  const url = process.env.DATABASE_URL ?? '';
  const wsA = randomUUID();
  const wsB = randomUUID();
  const jobIds: string[] = [];
  const clients: Client[] = [];

  /** A new, independent connection (its own session and transactions). */
  const connect = async (): Promise<Client> => {
    const client = new Client({ connectionString: url });
    await client.connect();
    clients.push(client);
    return client;
  };

  let admin: Client;

  const createJob = async (owner: string | null): Promise<string> => {
    const id = randomUUID();
    await admin.query(
      `insert into jobs (id, company, title, location, owner_organization_id, updated_at)
       values ($1, 'Integrity Co', 'Integrity Role', 'Remote', $2::uuid, now())`,
      [id, owner],
    );
    jobIds.push(id);
    return id;
  };

  const ownerOf = async (jobId: string): Promise<string | null> =>
    (
      await admin.query<{ owner: string | null }>(
        'select owner_organization_id as owner from jobs where id = $1',
        [jobId],
      )
    ).rows[0].owner;

  const countChildren = async (
    kind: ChildKind,
    org: string,
    jobId: string,
  ): Promise<number> =>
    Number(
      (
        await admin.query<{ n: string }>(
          `select count(*) as n from ${CHILD_TABLE[kind]} where organization_id = $1 and job_id = $2`,
          [org, jobId],
        )
      ).rows[0].n,
    );

  /** Committed rows that break the invariant, across all three child tables. */
  const violationsFor = async (jobId: string): Promise<number> => {
    let total = 0;
    for (const kind of KINDS) {
      total += Number(
        (
          await admin.query<{ n: string }>(
            `select count(*) as n
               from ${CHILD_TABLE[kind]} c join jobs j on j.id = c.job_id
              where j.id = $1
                and j.owner_organization_id is not null
                and j.owner_organization_id <> c.organization_id`,
            [jobId],
          )
        ).rows[0].n,
      );
    }
    return total;
  };

  beforeAll(async () => {
    admin = await connect();
    await admin.query(
      `insert into organizations (id, name, slug, created_at) values
         ($1, 'Owner Integrity A', $3, now()),
         ($2, 'Owner Integrity B', $4, now())`,
      [wsA, wsB, `oi-a-${wsA}`, `oi-b-${wsB}`],
    );
  });

  afterAll(async () => {
    for (const kind of KINDS) {
      await admin.query(
        `delete from ${CHILD_TABLE[kind]} where organization_id in ($1, $2)`,
        [wsA, wsB],
      );
    }
    await admin.query('delete from jobs where id = any($1::uuid[])', [jobIds]);
    await admin.query('delete from organizations where id in ($1, $2)', [
      wsA,
      wsB,
    ]);
    await Promise.all(clients.map((c) => c.end().catch(() => undefined)));
  });

  // ── Reference rules ─────────────────────────────────────────────────────
  describe.each(KINDS)('%s references', (kind) => {
    it('both workspaces can reference a shared catalog job', async () => {
      const shared = await createJob(null);
      await admin.query(CHILD_INSERT[kind], [wsA, shared]);
      await admin.query(CHILD_INSERT[kind], [wsB, shared]);
      expect(await countChildren(kind, wsA, shared)).toBe(1);
      expect(await countChildren(kind, wsB, shared)).toBe(1);
    });

    it("a workspace can reference its own private job but not another workspace's", async () => {
      const privateToA = await createJob(wsA);
      await admin.query(CHILD_INSERT[kind], [wsA, privateToA]);
      await expect(
        admin.query(CHILD_INSERT[kind], [wsB, privateToA]),
      ).rejects.toMatchObject({
        code: FOREIGN_KEY_VIOLATION,
        message: expect.stringMatching(
          /private to another workspace/,
        ) as string,
      });
      expect(await countChildren(kind, wsA, privateToA)).toBe(1);
      expect(await countChildren(kind, wsB, privateToA)).toBe(0);
    });

    it("an existing row cannot be re-pointed at another workspace's private job", async () => {
      const shared = await createJob(null);
      const privateToA = await createJob(wsA);
      await admin.query(CHILD_INSERT[kind], [wsB, shared]);
      await expect(
        admin.query(
          `update ${CHILD_TABLE[kind]} set job_id = $1 where organization_id = $2 and job_id = $3`,
          [privateToA, wsB, shared],
        ),
      ).rejects.toMatchObject({ code: FOREIGN_KEY_VIOLATION });
      expect(await countChildren(kind, wsB, shared)).toBe(1);
    });

    it('a job that does not exist is rejected', async () => {
      await expect(
        admin.query(CHILD_INSERT[kind], [wsA, randomUUID()]),
      ).rejects.toMatchObject({ code: FOREIGN_KEY_VIOLATION });
    });
  });

  // ── Ownership immutability ──────────────────────────────────────────────
  describe('ownership is immutable', () => {
    it.each([
      ['shared to private', null, wsA],
      ['private to shared', wsA, null],
      ['private to another workspace', wsA, wsB],
    ] as const)(
      'rejects %s, even with no references',
      async (_name, from, to) => {
        const job = await createJob(from);
        await expect(
          admin.query(
            'update jobs set owner_organization_id = $1::uuid where id = $2',
            [to, job],
          ),
        ).rejects.toMatchObject({ code: CHECK_VIOLATION });
        expect(await ownerOf(job)).toBe(from);
      },
    );

    it('still allows writes that do not change the owner', async () => {
      const shared = await createJob(null);
      const priv = await createJob(wsA);
      // re-writing the same owner (as the ingestion upsert does) is fine
      await admin.query(
        'update jobs set owner_organization_id = null, title = $2 where id = $1',
        [shared, 'Renamed shared'],
      );
      await admin.query(
        'update jobs set owner_organization_id = $2::uuid, title = $3 where id = $1',
        [priv, wsA, 'Renamed private'],
      );
      // and ordinary updates that never mention the column
      await admin.query('update jobs set location = $2 where id = any($1)', [
        [shared, priv],
        'Berlin',
      ]);
      expect(await ownerOf(shared)).toBeNull();
      expect(await ownerOf(priv)).toBe(wsA);
    });
  });

  // ── Concurrency: real connections, real transactions ────────────────────
  describe.each(KINDS)('concurrent %s write vs ownership change', (kind) => {
    it('an owner change cannot slip in around an uncommitted valid reference', async () => {
      // The reproduced defect: T1 holds an uncommitted, currently valid
      // reference to a SHARED job while T2 tries to make the job private to
      // another workspace. Before the fix both committed.
      const shared = await createJob(null);
      const t1 = await connect();
      const t2 = await connect();

      await t1.query('BEGIN');
      await t1.query(CHILD_INSERT[kind], [wsB, shared]); // valid right now

      await t2.query('BEGIN');
      // If T2 blocked on T1 this would hit the lock_timeout (55P03) instead; it must be
      // rejected by the immutability rule, immediately and without waiting.
      await t2.query("set local lock_timeout = '5s'");
      const started = Date.now();
      await expect(
        t2.query('update jobs set owner_organization_id = $1 where id = $2', [
          wsA,
          shared,
        ]),
      ).rejects.toMatchObject({ code: CHECK_VIOLATION });
      expect(Date.now() - started).toBeLessThan(4000);
      await t2.query('ROLLBACK');

      await t1.query('COMMIT');

      // Final, committed state is valid: still shared, B's reference exists.
      expect(await ownerOf(shared)).toBeNull();
      expect(await countChildren(kind, wsB, shared)).toBe(1);
      expect(await violationsFor(shared)).toBe(0);
    });

    it('the opposite interleaving is also safe (change attempted first)', async () => {
      const shared = await createJob(null);
      const t1 = await connect();
      const t2 = await connect();

      await t2.query('BEGIN');
      await expect(
        t2.query('update jobs set owner_organization_id = $1 where id = $2', [
          wsA,
          shared,
        ]),
      ).rejects.toMatchObject({ code: CHECK_VIOLATION });
      await t2.query('ROLLBACK');

      await t1.query('BEGIN');
      await t1.query(CHILD_INSERT[kind], [wsB, shared]);
      await t1.query('COMMIT');

      expect(await ownerOf(shared)).toBeNull();
      expect(await violationsFor(shared)).toBe(0);
    });

    it("two workspaces racing to reference A's private job: only the owner commits", async () => {
      const privateToA = await createJob(wsA);
      const tOwner = await connect();
      const tOther = await connect();

      await tOwner.query('BEGIN');
      await tOwner.query(CHILD_INSERT[kind], [wsA, privateToA]); // uncommitted
      await expect(
        tOther.query(CHILD_INSERT[kind], [wsB, privateToA]),
      ).rejects.toMatchObject({ code: FOREIGN_KEY_VIOLATION });
      await tOwner.query('COMMIT');

      expect(await countChildren(kind, wsA, privateToA)).toBe(1);
      expect(await countChildren(kind, wsB, privateToA)).toBe(0);
      expect(await violationsFor(privateToA)).toBe(0);
    });

    it('a reference to a job another transaction has not committed fails closed', async () => {
      // The job exists only inside T1. The child trigger must not wave the
      // reference through just because it cannot see an owner to inspect.
      const t1 = await connect();
      const t2 = await connect();
      const pending = randomUUID();
      jobIds.push(pending);

      await t1.query('BEGIN');
      await t1.query(
        `insert into jobs (id, company, title, location, owner_organization_id, updated_at)
         values ($1, 'Pending Co', 'Pending Role', 'Remote', $2, now())`,
        [pending, wsA],
      );
      await expect(
        t2.query(CHILD_INSERT[kind], [wsB, pending]),
      ).rejects.toMatchObject({ code: FOREIGN_KEY_VIOLATION });
      await t1.query('COMMIT');

      expect(await countChildren(kind, wsB, pending)).toBe(0);
      expect(await violationsFor(pending)).toBe(0);
    });
  });

  it('the child check takes the same lock as the foreign key (no extra blocking of ordinary updates)', async () => {
    // FOR KEY SHARE must not make a child insert block a plain UPDATE of the
    // shared job row (a FOR SHARE would), so catalog ingestion is never
    // stalled behind workspace activity.
    const shared = await createJob(null);
    const t1 = await connect();
    const t2 = await connect();

    await t1.query('BEGIN');
    await t1.query(CHILD_INSERT.workspaceJobState, [wsA, shared]);

    await t2.query('BEGIN');
    await t2.query("set local lock_timeout = '2s'");
    await expect(
      t2.query('update jobs set title = $2 where id = $1', [shared, 'Updated']),
    ).resolves.toBeDefined();
    await t2.query('COMMIT');
    await t1.query('COMMIT');
  });
});

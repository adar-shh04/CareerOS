import type { MasterCareerProfile } from '../career-profile/career-profile.types';
import type { ResumeProfile } from '../resume-profile/resume-profile.types';
import { JobMatchingService } from './job-matching.service';
import type { CanonicalJob } from './jobs.types';
import { buildKeywordCoverage } from './keyword-coverage';
import { MATCHER_VERSION } from './match-freshness';
import { canonicalSkillKey } from './skill-identity';

const profile = (
  over: Partial<MasterCareerProfile> = {},
): MasterCareerProfile =>
  ({
    id: 'mcp-1',
    workspaceId: 'ws-1',
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    identity: { fullName: 'Test Person', location: 'Remote' },
    education: [],
    experiences: [],
    projects: [],
    achievements: [],
    skills: [],
    technologies: [],
    publications: [],
    hackathons: [],
    certifications: [],
    links: [],
    ...over,
  }) as MasterCareerProfile;

const job = (
  requiredSkills: string[],
  preferredSkills: string[] = [],
): CanonicalJob =>
  ({
    id: 'job-1',
    company: 'Acme',
    title: 'Backend Engineer',
    location: 'Remote',
    isRemote: true,
    source: 'manual',
    requiredSkills,
    preferredSkills,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }) as unknown as CanonicalJob;

const richProfile = profile({
  experiences: [
    {
      id: 'exp-1',
      company: 'Globex',
      title: 'Senior Engineer',
      technologies: ['Node.js', 'PostgreSQL', 'Docker'],
      bullets: ['Ran Kubernetes clusters for the platform team'],
    },
    {
      id: 'exp-2',
      company: 'Initech',
      title: 'Engineer',
      technologies: ['node', 'TypeScript'],
    },
  ],
  projects: [
    { id: 'proj-1', name: 'Radar', technologies: ['TypeScript', 'React'] },
  ],
  skills: [
    { id: 'sk-ts', name: 'TypeScript' },
    { id: 'sk-go', name: 'Go' },
  ],
  technologies: [{ id: 'tech-redis', name: 'Redis' }],
} as Partial<MasterCareerProfile>);

describe('buildKeywordCoverage', () => {
  describe('canonical identity, never substring', () => {
    it('matches spellings of one technology and does not confuse near names', () => {
      const result = buildKeywordCoverage(
        job(['NodeJS', 'Java', 'JS']),
        richProfile,
      );
      const byKey = Object.fromEntries(result.terms.map((t) => [t.key, t]));
      expect(byKey['node.js'].status).toBe('evidenced'); // "NodeJS" == "Node.js"
      expect(byKey.java.status).toBe('missing'); // JavaScript is not Java
      expect(byKey.javascript.status).toBe('missing'); // "JS" is JavaScript, profile has none
      expect(byKey.go).toBeUndefined();
    });

    it('"Go" is not found inside words and MongoDB is not Go', () => {
      const result = buildKeywordCoverage(
        job(['Go']),
        profile({
          skills: [{ id: 's1', name: 'MongoDB' }],
        } as Partial<MasterCareerProfile>),
      );
      expect(result.terms[0].status).toBe('missing');
    });

    it('uses canonical display names for known terms and keeps the posting spelling otherwise', () => {
      const result = buildKeywordCoverage(
        job(['node', 'Revenue  Accounting'], ['k8s']),
        profile(),
      );
      expect(result.terms.map((t) => t.term)).toEqual([
        'Node.js',
        'Revenue Accounting',
        'Kubernetes',
      ]);
    });
  });

  describe('status and evidence locations', () => {
    const coverage = buildKeywordCoverage(
      job(['Node.js', 'TypeScript', 'Go', 'Redis', 'Rust']),
      richProfile,
    );
    const term = (key: string) => coverage.terms.find((t) => t.key === key);

    it('evidenced: supported by an experience or project, with every location', () => {
      const ts = term('typescript');
      expect(ts?.status).toBe('evidenced');
      expect(ts?.evidence).toEqual([
        { kind: 'experience', recordId: 'exp-2', label: 'Engineer at Initech' },
        { kind: 'project', recordId: 'proj-1', label: 'Radar' },
        { kind: 'skill', recordId: 'sk-ts', label: 'TypeScript' },
      ]);
      expect(term('node.js')?.evidence.map((e) => e.recordId)).toEqual([
        'exp-1',
        'exp-2',
      ]); // "Node.js" and "node" are one identity, one reference per record
    });

    it('listed_only: in the skills or technologies list but backed by no experience or project', () => {
      expect(term('go')).toMatchObject({
        status: 'listed_only',
        evidence: [{ kind: 'skill', recordId: 'sk-go', label: 'Go' }],
      });
      expect(term('redis')).toMatchObject({
        status: 'listed_only',
        evidence: [
          { kind: 'technology', recordId: 'tech-redis', label: 'Redis' },
        ],
      });
    });

    it('missing: nothing in the profile, so no evidence is invented', () => {
      expect(term('rust')).toMatchObject({ status: 'missing', evidence: [] });
    });

    it('does not infer evidence from free text: a bullet that mentions a term is not a claim', () => {
      // exp-1 has a bullet about Kubernetes but does not list it as a technology
      const result = buildKeywordCoverage(job(['Kubernetes']), richProfile);
      expect(result.terms[0]).toMatchObject({
        status: 'missing',
        evidence: [],
      });
    });

    it('one reference per record even if a record lists a term twice', () => {
      const result = buildKeywordCoverage(
        job(['React']),
        profile({
          projects: [
            {
              id: 'p',
              name: 'App',
              technologies: ['React', 'react.js', 'ReactJS'],
            },
          ],
        } as Partial<MasterCareerProfile>),
      );
      expect(result.terms[0].evidence).toHaveLength(1);
    });
  });

  describe('required and preferred are separate', () => {
    it('summarises each importance on its own', () => {
      const result = buildKeywordCoverage(
        job(['TypeScript', 'Go', 'Rust'], ['Redis', 'Elixir']),
        richProfile,
      );
      expect(result.required).toEqual({
        total: 3,
        matched: 2,
        evidenced: 1,
        listedOnly: 1,
        missing: 1,
        percent: 67,
      });
      expect(result.preferred).toEqual({
        total: 2,
        matched: 1,
        evidenced: 0,
        listedOnly: 1,
        missing: 1,
        percent: 50,
      });
    });

    it('a preferred term the posting also requires counts once, as required', () => {
      const result = buildKeywordCoverage(
        job(['TypeScript', 'typescript', ' TS '], ['TypeScript', 'Go']),
        richProfile,
      );
      expect(result.terms.map((t) => [t.key, t.importance])).toEqual([
        ['typescript', 'required'],
        ['go', 'preferred'],
      ]);
      expect(result.required.total).toBe(1);
      expect(result.preferred.total).toBe(1);
    });

    it('reports no percentage (null) when the posting lists no terms of that kind', () => {
      const result = buildKeywordCoverage(job([]), richProfile);
      expect(result.required).toEqual({
        total: 0,
        matched: 0,
        evidenced: 0,
        listedOnly: 0,
        missing: 0,
        percent: null,
      });
      expect(result.terms).toEqual([]);
    });
  });

  describe('grouping', () => {
    it('groups by a fixed dictionary and puts everything else under domain knowledge', () => {
      const result = buildKeywordCoverage(
        job([
          'TypeScript',
          'PostgreSQL',
          'React',
          'AWS',
          'Docker',
          'Revenue Accounting',
          'LLM',
        ]),
        profile(),
      );
      const group = (term: string) =>
        result.terms.find((t) => t.term === term)?.group;
      expect(group('TypeScript')).toBe('technical_skills');
      expect(group('PostgreSQL')).toBe('technical_skills');
      expect(group('React')).toBe('tools_frameworks');
      expect(group('AWS')).toBe('tools_frameworks');
      expect(group('Docker')).toBe('tools_frameworks');
      expect(group('Revenue Accounting')).toBe('domain_knowledge');
      expect(group('LLM')).toBe('domain_knowledge');
    });
  });

  describe('selection for a resume', () => {
    const resume = {
      id: 'rp-1',
      prioritySkillIds: [],
      priorityExperienceIds: ['exp-1'],
      priorityProjectIds: [],
      priorityAchievementIds: [],
      priorityCertificationIds: [],
    } as unknown as ResumeProfile;

    it('is absent when the match is not against a resume profile', () => {
      const result = buildKeywordCoverage(job(['Node.js']), richProfile);
      expect(result.terms[0]).not.toHaveProperty('selectedForResume');
    });

    it('distinguishes "in the profile" from "selected for this resume"', () => {
      const result = buildKeywordCoverage(
        job(['Node.js', 'TypeScript', 'Redis', 'Rust']),
        richProfile,
        resume,
      );
      const by = (key: string) => result.terms.find((t) => t.key === key);
      expect(by('node.js')?.selectedForResume).toBe(true); // exp-1 is selected
      expect(by('typescript')?.selectedForResume).toBe(false); // evidenced, but nothing selected
      expect(by('redis')?.selectedForResume).toBe(false); // technology entries are not selectable
      expect(by('rust')).not.toHaveProperty('selectedForResume'); // nothing to select
    });
  });

  describe('is deterministic and does not touch its inputs', () => {
    it('returns identical output and leaves the profile unchanged', () => {
      const snapshot = JSON.stringify(richProfile);
      const j = job(['Node.js', 'Go'], ['Redis']);
      const a = buildKeywordCoverage(j, richProfile);
      const b = buildKeywordCoverage(j, richProfile);
      expect(a).toEqual(b);
      expect(JSON.stringify(richProfile)).toBe(snapshot);
    });
  });
});

describe('keyword coverage and the matcher agree', () => {
  const matcher = new JobMatchingService();
  const jobs = [
    job(['Node.js', 'Java', 'TypeScript', 'Go'], ['Redis', 'k8s']),
    job(['node', 'TS', 'Rust'], ['go', 'nodejs']),
    job([], ['Redis']),
    job(['Revenue Accounting'], []),
  ];

  it.each(jobs.map((j, i) => [i, j] as const))(
    'job %i: matched and missing terms equal the matcher evidence',
    (_i, j) => {
      const { evidence } = matcher.match({
        job: j,
        masterProfile: richProfile,
      });
      const coverage = evidence.coverage;
      expect(coverage).toBeDefined();
      const keys = (importance: 'required' | 'preferred', matched: boolean) =>
        coverage?.terms
          .filter(
            (t) =>
              t.importance === importance &&
              (t.status !== 'missing') === matched,
          )
          .map((t) => t.key);
      const asKeys = (skills: string[] | undefined) =>
        (skills ?? []).map((s) => canonicalSkillKey(s));
      expect(keys('required', true)).toEqual(asKeys(evidence.matchedSkills));
      expect(keys('required', false)).toEqual(asKeys(evidence.missingSkills));
      expect(keys('preferred', true)).toEqual(
        asKeys(evidence.matchedPreferredSkills),
      );
      expect(keys('preferred', false)).toEqual(
        asKeys(evidence.missingPreferredSkills),
      );
      expect(coverage?.required.total).toBe(evidence.requiredSkillCount);
    },
  );

  it('the matcher version was bumped so stored matches without coverage recompute', () => {
    expect(MATCHER_VERSION).toBe(3);
  });

  it('coverage is reported next to the score without being a second score', () => {
    // Both required terms are in the profile, so the skill dimension is 1 and the
    // coverage percentage is 100: the same fact, derived from the same identities.
    const result = matcher.match({
      job: job(['Node.js', 'Go']),
      masterProfile: richProfile,
    });
    expect(result.dimensionScores.skill).toBe(1);
    expect(result.evidence.coverage?.required.percent).toBe(100);
    // and it carries no weights, grades or improvement estimates
    expect(
      Object.keys(result.evidence.coverage?.required ?? {}).sort(),
    ).toEqual([
      'evidenced',
      'listedOnly',
      'matched',
      'missing',
      'percent',
      'total',
    ]);
  });
});

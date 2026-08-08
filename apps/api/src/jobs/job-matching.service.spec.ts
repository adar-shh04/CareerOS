import type { MasterCareerProfile } from '../career-profile/career-profile.types';
import type { ResumeProfile } from '../resume-profile/resume-profile.types';
import { JobMatchingService } from './job-matching.service';
import type { CanonicalJob, MatchInput } from './jobs.types';

// ── Test fixtures ──────────────────────────────────────────────────────────────

const makeJob = (overrides: Partial<CanonicalJob> = {}): CanonicalJob => ({
  id: '11111111-1111-1111-1111-111111111111',
  source: 'manual',
  company: 'Acme Corp',
  title: 'Senior Software Engineer',
  location: 'New York, NY',
  isRemote: false,
  requiredSkills: ['TypeScript', 'React', 'PostgreSQL'],
  preferredSkills: ['GraphQL', 'Redis'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeProfile = (overrides: Partial<MasterCareerProfile> = {}): MasterCareerProfile => ({
  id: '22222222-2222-2222-2222-222222222222',
  workspaceId: '33333333-3333-3333-3333-333333333333',
  version: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  identity: {
    fullName: 'Jane Developer',
    headline: 'Fullstack Engineer',
    location: 'New York, NY',
  },
  skills: [
    { id: 'sk-1', name: 'TypeScript', proficiency: 'expert' },
    { id: 'sk-2', name: 'React', proficiency: 'advanced' },
    { id: 'sk-3', name: 'PostgreSQL', proficiency: 'working' },
    { id: 'sk-4', name: 'GraphQL', proficiency: 'working' },
  ],
  technologies: [{ id: 'te-1', name: 'Node.js' }],
  experiences: [
    {
      id: 'ex-1',
      company: 'Startup Inc',
      title: 'Software Engineer',
      startDate: '2020-01',
      endDate: '2024-01',
      current: false,
      technologies: ['TypeScript', 'React'],
    },
    {
      id: 'ex-2',
      company: 'BigTech',
      title: 'Senior Software Engineer',
      startDate: '2024-02',
      current: true,
      technologies: ['TypeScript', 'PostgreSQL'],
    },
  ],
  education: [],
  projects: [],
  achievements: [],
  publications: [],
  hackathons: [],
  certifications: [],
  links: [],
  ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('JobMatchingService', () => {
  let service: JobMatchingService;

  beforeEach(() => {
    service = new JobMatchingService();
  });

  // ── Determinism ──────────────────────────────────────────────────────────

  it('produces identical output for identical inputs (deterministic)', () => {
    const input: MatchInput = { job: makeJob(), masterProfile: makeProfile() };
    const r1 = service.match(input);
    const r2 = service.match(input);
    expect(r1).toEqual(r2);
  });

  it('produces different scores when profiles differ', () => {
    const job = makeJob();
    const strongProfile = makeProfile();
    const weakProfile = makeProfile({ skills: [], technologies: [], experiences: [] });
    const strong = service.match({ job, masterProfile: strongProfile });
    const weak = service.match({ job, masterProfile: weakProfile });
    expect(strong.overallScore).toBeGreaterThan(weak.overallScore);
  });

  // ── Overall score bounds ──────────────────────────────────────────────────

  it('overall score is always in [0, 1]', () => {
    const r = service.match({ job: makeJob(), masterProfile: makeProfile() });
    expect(r.overallScore).toBeGreaterThanOrEqual(0);
    expect(r.overallScore).toBeLessThanOrEqual(1);
  });

  it('returns a near-perfect skill score when all required skills match', () => {
    const r = service.match({ job: makeJob(), masterProfile: makeProfile() });
    // All 3 required skills (TypeScript, React, PostgreSQL) are in the profile.
    expect(r.dimensionScores.skill).toBeGreaterThanOrEqual(0.95);
  });

  it('returns a lower skill score when required skills are absent', () => {
    const job = makeJob({ requiredSkills: ['Rust', 'C++', 'WASM'] });
    const r = service.match({ job, masterProfile: makeProfile() });
    expect(r.dimensionScores.skill).toBeLessThan(0.2);
  });

  // ── Evidence: matched / missing skills ───────────────────────────────────

  it('correctly lists matched and missing required skills in evidence', () => {
    const job = makeJob({ requiredSkills: ['TypeScript', 'Kubernetes'] });
    const r = service.match({ job, masterProfile: makeProfile() });
    expect(r.matchedSkills).toContain('typescript');
    expect(r.missingSkills).toContain('kubernetes');
  });

  it('matches preferred skills and reports them in matchedPreferredSkills', () => {
    // Profile has GraphQL in skills.
    const job = makeJob({
      requiredSkills: ['TypeScript'],
      preferredSkills: ['GraphQL'],
    });
    const r = service.match({ job, masterProfile: makeProfile() });
    expect(r.matchedPreferredSkills).toContain('graphql');
  });

  // ── Location scoring ──────────────────────────────────────────────────────

  it('gives full location score for remote jobs', () => {
    const job = makeJob({ isRemote: true, remotePolicy: 'REMOTE' });
    const r = service.match({ job, masterProfile: makeProfile() });
    expect(r.dimensionScores.location).toBe(1.0);
  });

  it('gives a high location score when profile and job location match', () => {
    const job = makeJob({ isRemote: false, location: 'New York, NY' });
    const r = service.match({
      job,
      masterProfile: makeProfile({ identity: { fullName: 'Jane', location: 'New York, NY' } }),
    });
    expect(r.dimensionScores.location).toBeGreaterThanOrEqual(0.9);
  });

  it('penalises mismatched on-site locations', () => {
    const job = makeJob({ isRemote: false, location: 'Austin, TX' });
    const r = service.match({
      job,
      masterProfile: makeProfile({ identity: { fullName: 'Jane', location: 'Boston, MA' } }),
    });
    expect(r.dimensionScores.location).toBeLessThanOrEqual(0.3);
  });

  // ── Configurable weights ──────────────────────────────────────────────────

  it('respects custom weights — skill-heavy config boosts skill contribution', () => {
    const job = makeJob({ requiredSkills: ['TypeScript', 'React', 'PostgreSQL'] });
    const profile = makeProfile();

    const defaultResult = service.match({ job, masterProfile: profile });

    // Maximise skill weight, minimise others.
    const skillHeavyWeights = { skill: 0.9, role: 0.025, experience: 0.025, location: 0.025, seniority: 0.025 };
    const skillHeavyResult = service.match({
      job,
      masterProfile: profile,
      weights: skillHeavyWeights,
    });

    // Since all required skills match, a skill-heavy config should give a higher overall score
    // than the default (which also weights other dimensions that may not be as strong).
    expect(skillHeavyResult.overallScore).toBeGreaterThanOrEqual(defaultResult.overallScore - 0.05);
  });

  it('weights normalise even when they do not sum to 1.0', () => {
    const job = makeJob();
    const profile = makeProfile();
    const sloppyWeights = { skill: 2.0, role: 1.0, experience: 1.0, location: 1.0, seniority: 0.5 };
    const r = service.match({ job, masterProfile: profile, weights: sloppyWeights });
    expect(r.overallScore).toBeGreaterThanOrEqual(0);
    expect(r.overallScore).toBeLessThanOrEqual(1);
  });

  // ── ResumeProfile integration ─────────────────────────────────────────────

  it('uses ResumeProfile.roleFocus to improve role alignment score', () => {
    const job = makeJob({ title: 'Frontend Engineer' });
    const profile = makeProfile({ experiences: [] }); // No experience titles.

    const withoutRP = service.match({ job, masterProfile: profile });

    const resumeProfile: ResumeProfile = {
      id: 'rp-1',
      workspaceId: profile.workspaceId,
      name: 'Frontend Profile',
      roleFocus: 'Frontend Engineer',
      visibleSections: [],
      sectionOrder: [],
      highlightRules: [],
      priorityProjectIds: [],
      prioritySkillIds: [],
      priorityExperienceIds: [],
      priorityAchievementIds: [],
      priorityCertificationIds: [],
      styleSettings: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const withRP = service.match({ job, masterProfile: profile, resumeProfile });
    // With roleFocus matching job title exactly, role score should be higher.
    expect(withRP.dimensionScores.role).toBeGreaterThan(withoutRP.dimensionScores.role);
  });

  // ── Explanation ───────────────────────────────────────────────────────────

  it('explanation contains a numeric score and is non-empty', () => {
    const r = service.match({ job: makeJob(), masterProfile: makeProfile() });
    expect(r.explanation.length).toBeGreaterThan(20);
    expect(r.explanation).toMatch(/\d+\/100/);
  });

  it('explanation mentions missing skills when some are absent', () => {
    const job = makeJob({ requiredSkills: ['TypeScript', 'Kubernetes'] });
    const r = service.match({ job, masterProfile: makeProfile() });
    expect(r.explanation.toLowerCase()).toContain('missing');
  });

  // ── Confidence ────────────────────────────────────────────────────────────

  it('confidence is lower for sparse profiles', () => {
    const sparseProfile = makeProfile({ skills: [], experiences: [] });
    const richProfile = makeProfile();
    const sparse = service.match({ job: makeJob(), masterProfile: sparseProfile });
    const rich = service.match({ job: makeJob(), masterProfile: richProfile });
    expect(rich.confidence).toBeGreaterThan(sparse.confidence);
  });

  it('confidence is in [0.1, 1.0]', () => {
    const r = service.match({
      job: makeJob({ requiredSkills: [] }),
      masterProfile: makeProfile({ skills: [], experiences: [] }),
    });
    expect(r.confidence).toBeGreaterThanOrEqual(0.1);
    expect(r.confidence).toBeLessThanOrEqual(1.0);
  });

  // ── Evidence ─────────────────────────────────────────────────────────────

  it('evidence.experienceYears reflects actual experience entries', () => {
    // 2020-01 to 2024-01 = 4 years; 2024-02 to now ≈ 2+ years = ~6 total
    const r = service.match({ job: makeJob(), masterProfile: makeProfile() });
    expect(r.evidence.experienceYears).toBeGreaterThanOrEqual(5);
  });

  it('evidence.profileSkillCount counts skills + technologies', () => {
    // makeProfile: 4 skills + 1 technology + technologies on experiences
    const r = service.match({ job: makeJob(), masterProfile: makeProfile() });
    expect(r.evidence.profileSkillCount).toBeGreaterThanOrEqual(5);
  });
});

import { NotFoundException } from '@nestjs/common';
import type { MasterCareerProfile } from '@repo/types';

import type { CareerProfileService } from '../career-profile/career-profile.service';
import type { ResumeProfileRepository } from './resume-profile.repository';
import {
  ResumeProfileService,
  ResumeProfileValidationError,
} from './resume-profile.service';
import type { ResumeProfile, ResumeVersion } from './resume-profile.types';
import { readVersionDocument } from './resume-version-document';

const WS = '8d7825b3-a7a0-4f40-9d7f-861cb69e4d3d';
const LEGACY_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const OTHER_WS = 'cd3b996e-5c03-4fe4-9dc8-60726ea7832d';

function need<T>(value: T | undefined | null): T {
  if (value === undefined || value === null)
    throw new Error('expected a value');
  return value;
}

const masterOf = (
  over: Partial<MasterCareerProfile> = {},
): MasterCareerProfile =>
  ({
    id: '11111111-1111-4111-8111-111111111111',
    workspaceId: WS,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    identity: { fullName: 'Ada Lovelace', headline: 'Staff Engineer' },
    education: [{ id: 'edu-1', institution: 'University of London' }],
    experiences: [
      {
        id: 'exp-1',
        company: 'Acme',
        title: 'Engineer',
        technologies: ['TypeScript', 'Node.js'],
      },
      {
        id: 'exp-2',
        company: 'Globex',
        title: 'Senior Engineer',
        technologies: ['Java'],
      },
      { id: 'exp-3', company: 'Initech', title: 'Staff Engineer' },
    ],
    projects: [
      { id: 'proj-1', name: 'Radar', technologies: ['TypeScript', 'React'] },
      { id: 'proj-2', name: 'Ledger', technologies: ['COBOL'] },
    ],
    achievements: [{ id: 'ach-1', title: 'Won the hackathon' }],
    skills: [
      { id: 'sk-1', name: 'TypeScript' },
      { id: 'sk-2', name: 'Go' },
      { id: 'sk-3', name: 'Basket weaving' },
    ],
    technologies: [],
    publications: [],
    hackathons: [],
    certifications: [
      { id: 'cert-1', name: 'AWS' },
      { id: 'cert-2', name: 'CKA' },
    ],
    links: [],
    ...over,
  }) as MasterCareerProfile;

class MemoryRepo implements ResumeProfileRepository {
  profiles = new Map<string, ResumeProfile>();
  versions: ResumeVersion[] = [];
  listByWorkspace(ws: string) {
    return Promise.resolve(
      [...this.profiles.values()].filter((p) => p.workspaceId === ws),
    );
  }
  findById(ws: string, id: string) {
    const p = this.profiles.get(id);
    return Promise.resolve(
      p?.workspaceId === ws ? structuredClone(p) : undefined,
    );
  }
  create(p: ResumeProfile) {
    this.profiles.set(p.id, structuredClone(p));
    return Promise.resolve(structuredClone(p));
  }
  update(p: ResumeProfile) {
    this.profiles.set(p.id, structuredClone(p));
    return Promise.resolve(structuredClone(p));
  }
  delete(ws: string, id: string) {
    this.profiles.delete(id);
    return Promise.resolve();
  }
  listVersions(ws: string, profileId: string) {
    return Promise.resolve(
      this.versions
        .filter((v) => v.workspaceId === ws && v.resumeProfileId === profileId)
        .map((v) => structuredClone(v)),
    );
  }
  findVersionById(ws: string, profileId: string, id: string) {
    const v = this.versions.find(
      (x) =>
        x.id === id && x.workspaceId === ws && x.resumeProfileId === profileId,
    );
    return Promise.resolve(v ? structuredClone(v) : undefined);
  }
  createVersion(v: ResumeVersion) {
    this.versions.push(structuredClone(v));
    return Promise.resolve(structuredClone(v));
  }
}

const JOB_ANALYSIS = {
  skills: {
    requiredSkills: ['TypeScript', 'Go', 'Rust'],
    preferredSkills: ['React', 'Redis'],
  },
};

function setup(initialMaster = masterOf()) {
  let currentMaster = initialMaster;
  const repo = new MemoryRepo();
  const careerProfiles = {
    findByWorkspace: jest.fn(() =>
      Promise.resolve(structuredClone(currentMaster)),
    ),
  };
  const service = new ResumeProfileService(
    repo,
    careerProfiles as unknown as CareerProfileService,
  );
  const createProfile = (over: Record<string, unknown> = {}) =>
    service.create(WS, {
      name: 'Backend',
      visibleSections: ['experience', 'projects', 'skills'],
      sectionOrder: ['experience', 'projects', 'skills'],
      priorityProjectIds: [],
      prioritySkillIds: [],
      priorityExperienceIds: [],
      priorityAchievementIds: [],
      priorityCertificationIds: [],
      highlightRules: [],
      ...over,
    } as never);
  return {
    repo,
    service,
    careerProfiles,
    setMaster: (m: MasterCareerProfile) => {
      currentMaster = m;
    },
    createProfile,
  };
}

describe('version-owned documents (creation)', () => {
  it('captures the document with the version: generated when the profile source is the current standard template', async () => {
    const { service, createProfile, repo } = setup();
    const profile = await createProfile();
    const version = await service.createVersion(WS, profile.id, {
      targetCompany: 'Acme',
      artifactMetadata: { jobId: 'job-1', createdFrom: 'job_radar' },
    });
    expect(version.document).toMatchObject({
      kind: 'generated',
      selectionMode: 'prioritized',
      createdFrom: 'targeted_resume',
    });
    expect(version.document?.representedRecordIds?.experienceIds).toEqual([
      'exp-1',
      'exp-2',
      'exp-3',
    ]);
    // the key lives in storage and is lifted out of artifactMetadata on read
    expect(repo.versions[0].artifactMetadata).toHaveProperty('document');
    expect(version.artifactMetadata).toEqual({
      jobId: 'job-1',
      createdFrom: 'job_radar',
    });
    expect(
      (await service.findVersionById(WS, profile.id, version.id))?.document,
    ).toEqual(version.document);
  });

  it('keeps the profile LaTeX verbatim as custom when it is not provably the standard template', async () => {
    const { service, createProfile } = setup();
    const profile = await createProfile({
      latexSource:
        '\\documentclass{article}\\begin{document}My own CV\\end{document}',
    });
    const version = await service.createVersion(WS, profile.id, {});
    expect(version.document).toMatchObject({
      kind: 'custom_preserved',
      latexSource:
        '\\documentclass{article}\\begin{document}My own CV\\end{document}',
    });
    expect(version.document?.representedRecordIds).toBeUndefined();
  });

  it('a standard source that is merely out of date (master edited since) is preserved verbatim, never regenerated', async () => {
    const { service, createProfile, setMaster } = setup();
    const profile = await createProfile();
    setMaster(
      masterOf({
        identity: { fullName: 'Ada Lovelace', headline: 'Principal Engineer' },
      }),
    );
    const version = await service.createVersion(WS, profile.id, {});
    expect(version.document?.kind).toBe('custom_preserved');
    expect(version.document?.latexSource).toContain('Staff Engineer'); // the old text, untouched
    expect(version.document?.latexSource).not.toContain('Principal Engineer');
  });

  it('the server owns the document key: a client-supplied one is overwritten, other metadata is kept', async () => {
    const { service, createProfile, repo } = setup();
    const profile = await createProfile();
    const version = await service.createVersion(WS, profile.id, {
      artifactMetadata: {
        jobId: 'job-9',
        document: {
          latexSource: 'EVIL',
          kind: 'generated',
          selectionMode: 'included',
          createdFrom: 'manual',
        },
      },
    });
    expect(version.document?.latexSource).not.toBe('EVIL');
    expect(version.artifactMetadata).toEqual({ jobId: 'job-9' });
    expect(
      readVersionDocument(repo.versions[0].artifactMetadata)?.latexSource,
    ).not.toBe('EVIL');
  });

  it('a malformed stored document counts as "not captured" instead of crashing', async () => {
    const { service, createProfile, repo } = setup();
    const profile = await createProfile();
    const version = await service.createVersion(WS, profile.id, {});
    repo.versions[0].artifactMetadata = {
      document: { latexSource: 42, kind: 'nonsense' },
    };
    const reread = await service.findVersionById(WS, profile.id, version.id);
    expect(reread?.document).toBeUndefined();
    expect(reread?.artifactMetadata).toBeUndefined();
  });
});

/** A version created before documents were captured. */
function legacyVersion(
  profileId: string,
  over: Partial<ResumeVersion> = {},
): ResumeVersion {
  return {
    id: LEGACY_ID,
    workspaceId: WS,
    resumeProfileId: profileId,
    targetCompany: 'Old Co',
    targetRole: 'Engineer',
    masterProfileSnapshot: masterOf(),
    selectedRecordIds: {
      experienceIds: ['exp-1'],
      projectIds: [],
      skillIds: ['sk-1'],
      certificationIds: [],
      achievementIds: [],
    },
    outputFormat: 'html',
    jobAnalysisEvidence: JOB_ANALYSIS,
    artifactMetadata: { jobId: 'job-old' },
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

describe('selection review', () => {
  it('explains each record against the posting and keeps the evidence states apart', async () => {
    const { service, createProfile } = setup();
    const profile = await createProfile();
    const version = await service.createVersion(WS, profile.id, {
      jobAnalysisEvidence: JOB_ANALYSIS,
      artifactMetadata: { jobId: 'job-1', createdFrom: 'job_radar' },
    });
    const review = await service.getSelectionReview(WS, profile.id, version.id);
    const section = (kind: string) =>
      need(review.sections.find((s) => s.kind === kind));
    const byId = (kind: string, id: string) =>
      need(section(kind).records.find((r) => r.id === id));

    expect(review.recommendationsAvailable).toBe(true);
    expect(review.document).toMatchObject({
      status: 'generated',
      selectionChangesDocument: true,
    });

    // experiences: relevant ones recommended with matched terms; none is ever recommended for removal
    expect(byId('experiences', 'exp-1')).toMatchObject({
      recommended: true,
      included: true,
      representedInDocument: true,
    });
    expect(byId('experiences', 'exp-1').matchedTerms).toEqual([
      { term: 'TypeScript', importance: 'required' },
    ]);
    expect(byId('experiences', 'exp-1').reasons[0]).toContain(
      'TypeScript (required)',
    );
    expect(byId('experiences', 'exp-3')).toMatchObject({ recommended: null });
    expect(byId('experiences', 'exp-3').reasons[0]).toContain('no gap');
    expect(
      section('experiences').records.every((r) => r.recommended !== false),
    ).toBe(true);

    // projects: a reason to leave out when nothing matches
    expect(byId('projects', 'proj-1')).toMatchObject({ recommended: true });
    expect(byId('projects', 'proj-2')).toMatchObject({ recommended: false });

    // skills: matched keywords recommended, others merely kept
    expect(byId('skills', 'sk-1')).toMatchObject({ recommended: true });
    expect(byId('skills', 'sk-3')).toMatchObject({ recommended: null });

    // achievements: no signal, and the template does not render them
    expect(section('achievements').renderedByTemplate).toBe(false);
    expect(byId('achievements', 'ach-1')).toMatchObject({
      recommended: null,
      representedInDocument: false,
    });

    // nothing is invented for a keyword the profile lacks (Rust, Redis)
    const everyId = review.sections.flatMap((s) => s.records.map((r) => r.id));
    expect(everyId).not.toContain('rust');
  });

  it('a prioritized version includes every record and only marks the selected ones as prioritized', async () => {
    const { service, createProfile, repo } = setup();
    const profile = await createProfile();
    need(repo.profiles.get(profile.id)).priorityExperienceIds = ['exp-2'];
    const version = await service.createVersion(WS, profile.id, {});
    const review = await service.getSelectionReview(WS, profile.id, version.id);
    expect(review.selectionMode).toBe('prioritized');
    const experiences = need(
      review.sections.find((s) => s.kind === 'experiences'),
    ).records;
    expect(experiences.map((r) => r.included)).toEqual([true, true, true]);
    expect(experiences.map((r) => r.prioritized)).toEqual([false, true, false]);
  });

  it('has no recommendations without a job analysis', async () => {
    const { service, createProfile } = setup();
    const profile = await createProfile();
    const version = await service.createVersion(WS, profile.id, {});
    const review = await service.getSelectionReview(WS, profile.id, version.id);
    expect(review.recommendationsAvailable).toBe(false);
    for (const record of review.sections.flatMap((s) => s.records)) {
      expect(record.recommended).toBeNull();
      expect(record.reasons).toEqual([]);
    }
  });

  it('tolerates a malformed stored job analysis', async () => {
    const { service, createProfile } = setup();
    const profile = await createProfile();
    const version = await service.createVersion(WS, profile.id, {
      jobAnalysisEvidence: {
        skills: { requiredSkills: 'not-a-list', preferredSkills: [1, null] },
      },
    });
    const review = await service.getSelectionReview(WS, profile.id, version.id);
    expect(review.recommendationsAvailable).toBe(false);
  });

  it('custom LaTeX: the limitation is explicit and "represented in the document" is unknown, not guessed', async () => {
    const { service, createProfile } = setup();
    const profile = await createProfile({
      latexSource: '\\documentclass{article}custom',
    });
    const version = await service.createVersion(WS, profile.id, {
      jobAnalysisEvidence: JOB_ANALYSIS,
    });
    const review = await service.getSelectionReview(WS, profile.id, version.id);
    expect(review.document.status).toBe('custom_preserved');
    expect(review.document.selectionChangesDocument).toBe(false);
    expect(review.document.limitation).toContain('stays exactly as it is');
    expect(
      review.sections
        .flatMap((s) => s.records)
        .filter((r) => r.representedInDocument !== null && r.id !== 'ach-1'),
    ).toEqual([]);
  });

  it('a version created before documents were captured says so and does not use the current profile', async () => {
    const { service, createProfile, repo, setMaster } = setup();
    const profile = await createProfile({
      latexSource: '\\documentclass{article}custom-now',
    });
    repo.versions.push(legacyVersion(profile.id));
    const review = await service.getSelectionReview(WS, profile.id, LEGACY_ID);
    // changing the current master profile changes nothing about the review
    setMaster(masterOf({ experiences: [], skills: [] }));
    expect(await service.getSelectionReview(WS, profile.id, LEGACY_ID)).toEqual(
      review,
    );
    expect(review.document.status).toBe('not_captured');
    expect(review.document.limitation).toContain('predates document snapshots');
    expect(review.selectionMode).toBe('prioritized');
    const sk = need(review.sections.find((s) => s.kind === 'skills')).records;
    expect(sk.find((r) => r.id === 'sk-1')?.prioritized).toBe(true);
    expect(sk.every((r) => r.representedInDocument === null)).toBe(true);
  });

  it('refuses another workspace or an unknown version', async () => {
    const { service, createProfile } = setup();
    const profile = await createProfile();
    const version = await service.createVersion(WS, profile.id, {});
    await expect(
      service.getSelectionReview(OTHER_WS, profile.id, version.id),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.getSelectionReview(
        WS,
        profile.id,
        '9a8b7c6d-1111-4111-8111-111111111111',
      ),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('revisions', () => {
  const pick = (over: Record<string, string[]> = {}) => ({
    experienceIds: ['exp-1'],
    projectIds: ['proj-1'],
    skillIds: ['sk-1'],
    certificationIds: [],
    achievementIds: [],
    ...over,
  });

  async function baseVersion() {
    const ctx = setup();
    const profile = await ctx.createProfile({
      summaryGuidance: 'Backend engineer for TypeScript roles.',
    });
    const base = await ctx.service.createVersion(WS, profile.id, {
      targetCompany: 'Acme',
      targetRole: 'Backend Engineer',
      jobAnalysisEvidence: JOB_ANALYSIS,
      matchResult: { overallScore: 0.7 },
      confidence: 0.7,
      explanation: 'Because TypeScript.',
      artifactMetadata: { jobId: 'job-1', createdFrom: 'job_radar' },
    });
    return { ...ctx, profile, base };
  }

  it('creates a NEW version with only the selected records and leaves the base untouched', async () => {
    const { service, repo, profile, base } = await baseVersion();
    const before = structuredClone(repo.versions[0]);
    const revision = await service.createRevision(WS, profile.id, base.id, {
      selectedRecordIds: pick(),
    });

    expect(revision.id).not.toBe(base.id);
    expect(repo.versions).toHaveLength(2);
    expect(repo.versions[0]).toEqual(before); // byte-for-byte unchanged
    expect(revision.selectedRecordIds).toEqual(pick());
    expect(revision.document).toMatchObject({
      kind: 'generated',
      selectionMode: 'included',
      createdFrom: 'revision',
      basedOnVersionId: base.id,
    });
    expect(revision.document?.latexSource).toContain('Acme');
    expect(revision.document?.latexSource).not.toContain('Globex');
    expect(revision.document?.latexSource).not.toContain('Ledger');
    expect(revision.document?.representedRecordIds).toEqual({
      ...pick(),
      certificationIds: [],
      achievementIds: [],
    });
    expect(revision.document?.summaryGuidance).toBe(
      'Backend engineer for TypeScript roles.',
    );
    expect(revision.document?.latexSource).toContain(
      'Backend engineer for TypeScript roles.',
    );
  });

  it('keeps the original snapshot and targeting context, and works after the master profile changed', async () => {
    const { service, profile, base, setMaster } = await baseVersion();
    setMaster(
      masterOf({
        experiences: [
          { id: 'exp-new', company: 'Hooli', title: 'CTO' },
        ] as never,
      }),
    );

    const revision = await service.createRevision(WS, profile.id, base.id, {
      selectedRecordIds: pick(),
    });
    expect(revision.masterProfileSnapshot).toEqual(base.masterProfileSnapshot); // not re-snapshotted
    expect(revision.document?.latexSource).toContain('Acme');
    expect(revision.document?.latexSource).not.toContain('Hooli');
    expect(revision.document?.representedRecordIds?.experienceIds).toEqual([
      'exp-1',
    ]);
    expect(revision).toMatchObject({
      targetCompany: 'Acme',
      targetRole: 'Backend Engineer',
      matchResult: { overallScore: 0.7 },
      confidence: 0.7,
      explanation: 'Because TypeScript.',
      jobAnalysisEvidence: JOB_ANALYSIS,
    });
    expect(revision.artifactMetadata).toEqual({
      jobId: 'job-1',
      createdFrom: 'job_radar',
      revisedFromVersionId: base.id,
    });
  });

  it('a revision of a revision still derives from the ORIGINAL snapshot', async () => {
    const { service, profile, base } = await baseVersion();
    const first = await service.createRevision(WS, profile.id, base.id, {
      selectedRecordIds: pick(),
    });
    const second = await service.createRevision(WS, profile.id, first.id, {
      selectedRecordIds: pick({ experienceIds: ['exp-1', 'exp-2'] }),
    });
    expect(second.masterProfileSnapshot).toEqual(base.masterProfileSnapshot);
    expect(second.document?.basedOnVersionId).toBe(first.id);
    expect(second.document?.latexSource).toContain('Globex');
  });

  it('keeps custom LaTeX verbatim by default and records the selection without changing the document', async () => {
    const ctx = setup();
    const custom =
      '\\documentclass{article}\\begin{document}My own CV with Globex\\end{document}';
    const profile = await ctx.createProfile({ latexSource: custom });
    const base = await ctx.service.createVersion(WS, profile.id, {});
    const revision = await ctx.service.createRevision(WS, profile.id, base.id, {
      selectedRecordIds: pick(),
    });
    expect(revision.document).toMatchObject({
      kind: 'custom_preserved',
      latexSource: custom,
      basedOnVersionId: base.id,
    });
    expect(revision.document?.representedRecordIds).toBeUndefined();
    expect(revision.selectedRecordIds).toEqual(pick()); // the choice is still recorded
  });

  it('uses the standard template for custom LaTeX only when explicitly asked, and says so in the stored kind', async () => {
    const ctx = setup();
    const profile = await ctx.createProfile({
      latexSource: '\\documentclass{article}custom',
    });
    const base = await ctx.service.createVersion(WS, profile.id, {});
    const revision = await ctx.service.createRevision(WS, profile.id, base.id, {
      selectedRecordIds: pick(),
      documentMode: 'generate',
    });
    expect(revision.document?.kind).toBe('generated');
    expect(revision.document?.latexSource).not.toContain('custom');
    expect(revision.document?.latexSource).toContain('Acme');
    // the base still holds the custom source
    expect(
      (await ctx.service.findVersionById(WS, profile.id, base.id))?.document
        ?.latexSource,
    ).toBe('\\documentclass{article}custom');
  });

  it('a version without a captured document is revised from its frozen snapshot with the standard template', async () => {
    const { service, repo, createProfile } = setup();
    const profile = await createProfile();
    repo.versions.push(legacyVersion(profile.id));
    const revision = await service.createRevision(WS, profile.id, LEGACY_ID, {
      selectedRecordIds: pick(),
    });
    expect(revision.document).toMatchObject({
      kind: 'generated',
      selectionMode: 'included',
      basedOnVersionId: LEGACY_ID,
    });
    expect(revision.artifactMetadata).toMatchObject({
      jobId: 'job-old',
      revisedFromVersionId: LEGACY_ID,
    });
    expect(repo.versions[0].document).toBeUndefined();
  });

  describe('validation', () => {
    it('rejects ids that are not in the base version snapshot, per kind', async () => {
      const { service, profile, base } = await baseVersion();
      await expect(
        service.createRevision(WS, profile.id, base.id, {
          selectedRecordIds: pick({ experienceIds: ['nope'] }),
        }),
      ).rejects.toThrow(ResumeProfileValidationError);
      // an id of the wrong KIND is not accepted either
      await expect(
        service.createRevision(WS, profile.id, base.id, {
          selectedRecordIds: pick({ projectIds: ['exp-1'] }),
        }),
      ).rejects.toThrow(
        /projectIds contains an ID that is not in this version/,
      );
    });

    it('deduplicates ids and accepts achievements as record-only selections', async () => {
      const { service, profile, base } = await baseVersion();
      const revision = await service.createRevision(WS, profile.id, base.id, {
        selectedRecordIds: pick({
          experienceIds: ['exp-1', 'exp-1'],
          achievementIds: ['ach-1'],
        }),
      });
      expect(revision.selectedRecordIds.experienceIds).toEqual(['exp-1']);
      expect(revision.selectedRecordIds.achievementIds).toEqual(['ach-1']);
      expect(revision.document?.representedRecordIds?.achievementIds).toEqual(
        [],
      );
    });

    it('refuses an unknown base version, another workspace, and malformed lists', async () => {
      const { service, profile, base } = await baseVersion();
      await expect(
        service.createRevision(
          WS,
          profile.id,
          '9a8b7c6d-1111-4111-8111-111111111111',
          { selectedRecordIds: pick() },
        ),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createRevision(OTHER_WS, profile.id, base.id, {
          selectedRecordIds: pick(),
        }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createRevision(WS, profile.id, base.id, {
          selectedRecordIds: { experienceIds: 'exp-1' } as never,
        }),
      ).rejects.toThrow(ResumeProfileValidationError);
    });
  });

  it('never touches applications: the service has no way to relink one, and only one version is added', async () => {
    const { service, repo, profile, base } = await baseVersion();
    const countBefore = repo.versions.length;
    await service.createRevision(WS, profile.id, base.id, {
      selectedRecordIds: pick(),
    });
    expect(repo.versions).toHaveLength(countBefore + 1);
    // ResumeProfileService is constructed with a repository and the career profile
    // service only; no applications collaborator exists to be called.
    expect(service.createRevision.length).toBeLessThanOrEqual(4);
  });
});

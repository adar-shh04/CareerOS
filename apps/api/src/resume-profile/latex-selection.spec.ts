import type { MasterCareerProfile } from '@repo/types';
import { generateLatexDocument, generateLatexFromProfile } from '@repo/types';

const master = {
  id: 'mcp-1',
  workspaceId: 'ws-1',
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
      bullets: ['Built billing'],
    },
    { id: 'exp-2', company: 'Globex', title: 'Senior Engineer' },
    { id: 'exp-3', company: 'Initech', title: 'Staff Engineer' },
  ],
  projects: [
    { id: 'proj-1', name: 'Radar', description: 'Job radar' },
    { id: 'proj-2', name: 'Ledger', description: 'Ledger' },
  ],
  achievements: [{ id: 'ach-1', title: 'Won the hackathon' }],
  skills: [
    { id: 'sk-1', name: 'TypeScript' },
    { id: 'sk-2', name: 'Go' },
  ],
  technologies: [],
  publications: [],
  hackathons: [],
  certifications: [
    { id: 'cert-1', name: 'AWS Solutions Architect' },
    { id: 'cert-2', name: 'CKA' },
  ],
  links: [],
} as unknown as MasterCareerProfile;

const none = {
  experienceIds: [],
  projectIds: [],
  skillIds: [],
  certificationIds: [],
  achievementIds: [],
};
const profileLike = {
  summaryGuidance: undefined,
  priorityExperienceIds: [] as string[],
  priorityProjectIds: [] as string[],
  prioritySkillIds: [] as string[],
  priorityCertificationIds: [] as string[],
};

describe('generateLatexDocument with a record selection', () => {
  it('without a selection it is the same document as generateLatexFromProfile', () => {
    const doc = generateLatexDocument(master, profileLike);
    expect(doc.latex).toBe(generateLatexFromProfile(master, profileLike));
    expect(doc.represented.experienceIds).toEqual(['exp-1', 'exp-2', 'exp-3']);
    expect(doc.represented.achievementIds).toEqual([]);
  });

  it('renders ONLY the selected records, in profile order, and reports exactly those', () => {
    const doc = generateLatexDocument(master, profileLike, {
      selection: {
        ...none,
        experienceIds: ['exp-3', 'exp-1'],
        projectIds: ['proj-2'],
        skillIds: ['sk-2'],
        certificationIds: ['cert-2'],
      },
    });
    expect(doc.latex).toContain('Initech');
    expect(doc.latex).toContain('Acme');
    expect(doc.latex).not.toContain('Globex');
    expect(doc.latex).toContain('Ledger');
    expect(doc.latex).not.toContain('Radar');
    expect(doc.latex).toContain('Go');
    expect(doc.latex).not.toContain('TypeScript');
    expect(doc.latex).toContain('CKA');
    expect(doc.latex).not.toContain('AWS Solutions Architect');
    // profile order, not selection order
    expect(doc.latex.indexOf('Acme')).toBeLessThan(
      doc.latex.indexOf('Initech'),
    );
    expect(doc.represented).toEqual({
      experienceIds: ['exp-1', 'exp-3'],
      projectIds: ['proj-2'],
      skillIds: ['sk-2'],
      certificationIds: ['cert-2'],
      achievementIds: [],
    });
  });

  it('the manifest is observed, not assumed: every reported record is in the text and every other record is not', () => {
    const doc = generateLatexDocument(master, profileLike, {
      selection: { ...none, experienceIds: ['exp-2'], projectIds: ['proj-1'] },
    });
    const labels: Record<string, string> = {
      'exp-1': 'Acme',
      'exp-2': 'Globex',
      'exp-3': 'Initech',
      'proj-1': 'Radar',
      'proj-2': 'Ledger',
    };
    const reported = new Set([
      ...doc.represented.experienceIds,
      ...doc.represented.projectIds,
    ]);
    for (const [id, label] of Object.entries(labels)) {
      expect(doc.latex.includes(label)).toBe(reported.has(id));
    }
  });

  it('an empty selection drops the selectable sections but keeps identity and education', () => {
    const doc = generateLatexDocument(master, profileLike, { selection: none });
    expect(doc.latex).toContain('Ada Lovelace');
    expect(doc.latex).toContain('University of London');
    for (const word of ['Acme', 'Radar', 'TypeScript', 'CKA']) {
      expect(doc.latex).not.toContain(word);
    }
    expect(doc.represented).toEqual(none);
  });

  it('ids that are not in the profile are ignored, never invented', () => {
    const doc = generateLatexDocument(master, profileLike, {
      selection: { ...none, experienceIds: ['exp-1', 'does-not-exist'] },
    });
    expect(doc.represented.experienceIds).toEqual(['exp-1']);
  });

  it('achievements can be selected but the standard template never renders them', () => {
    const doc = generateLatexDocument(master, profileLike, {
      selection: { ...none, achievementIds: ['ach-1'] },
    });
    expect(doc.latex).not.toContain('Won the hackathon');
    expect(doc.represented.achievementIds).toEqual([]);
  });
});

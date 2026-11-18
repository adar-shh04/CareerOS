import type { MasterCareerProfile } from '@repo/types';
import { generateLatexFromProfile } from '@repo/types';

/**
 * Pins the canonical LaTeX generator's CURRENT output before it gains a
 * selection option (T-04). Existing callers must keep getting byte-identical
 * documents: priority ids only reorder records, nothing is ever dropped, and
 * achievements are not rendered by the template.
 */
const master = {
  id: 'mcp-1',
  workspaceId: 'ws-1',
  version: 3,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  identity: {
    fullName: 'Ada Lovelace',
    headline: 'Staff Engineer',
    location: 'London, UK',
    email: 'ada@example.test',
  },
  education: [
    {
      id: 'edu-1',
      institution: 'University of London',
      degree: 'BSc',
      fieldOfStudy: 'Mathematics',
      startDate: '2008',
      endDate: '2011',
    },
  ],
  experiences: [
    {
      id: 'exp-1',
      company: 'Acme',
      title: 'Engineer',
      startDate: '2012',
      endDate: '2016',
      bullets: ['Built billing & invoicing 100% in-house'],
      technologies: ['Java'],
    },
    {
      id: 'exp-2',
      company: 'Globex',
      title: 'Senior Engineer',
      startDate: '2016',
      endDate: '2020',
      bullets: ['Led the platform team'],
      technologies: ['TypeScript', 'Node.js'],
    },
    {
      id: 'exp-3',
      company: 'Initech',
      title: 'Staff Engineer',
      startDate: '2020',
      current: true,
      technologies: ['Go'],
    },
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'Radar',
      description: 'Job radar',
      technologies: ['React'],
    },
    {
      id: 'proj-2',
      name: 'Ledger',
      bullets: ['Double-entry ledger'],
      url: 'https://github.com/x/ledger',
    },
  ],
  achievements: [{ id: 'ach-1', title: 'Won the hackathon' }],
  skills: [
    { id: 'sk-1', name: 'TypeScript' },
    { id: 'sk-2', name: 'Go' },
    { id: 'sk-3', name: 'Rust' },
  ],
  technologies: [],
  publications: [],
  hackathons: [],
  certifications: [
    { id: 'cert-1', name: 'AWS Solutions Architect', issuer: 'Amazon' },
    { id: 'cert-2', name: 'CKA', issuer: 'CNCF' },
  ],
  links: [{ id: 'l-1', label: 'GitHub', url: 'https://github.com/ada' }],
} as unknown as MasterCareerProfile;

const priority = (over: Record<string, unknown>) => ({
  summaryGuidance: undefined,
  priorityExperienceIds: [] as string[],
  priorityProjectIds: [] as string[],
  prioritySkillIds: [] as string[],
  priorityCertificationIds: [] as string[],
  ...over,
});

describe('canonical LaTeX generation (pinned)', () => {
  it('no resume profile', () => {
    expect(generateLatexFromProfile(master)).toMatchSnapshot();
  });

  it('null and empty-priority profiles produce the same document', () => {
    const base = generateLatexFromProfile(master);
    expect(generateLatexFromProfile(master, null)).toBe(base);
    expect(generateLatexFromProfile(master, priority({}))).toBe(base);
  });

  it('priority ids only reorder: three experiences with one prioritised still renders three', () => {
    const latex = generateLatexFromProfile(
      master,
      priority({ priorityExperienceIds: ['exp-2'] }),
    );
    expect(latex).toMatchSnapshot();
    for (const company of ['Acme', 'Globex', 'Initech']) {
      expect(latex).toContain(company);
    }
    expect(latex.indexOf('Globex')).toBeLessThan(latex.indexOf('Acme'));
  });

  it('priorities on every kind plus summary guidance', () => {
    expect(
      generateLatexFromProfile(
        master,
        priority({
          summaryGuidance: 'Backend engineer focused on TypeScript & Go.',
          priorityExperienceIds: ['exp-3'],
          priorityProjectIds: ['proj-2'],
          prioritySkillIds: ['sk-3'],
          priorityCertificationIds: ['cert-2'],
        }),
      ),
    ).toMatchSnapshot();
  });

  it('achievements are not rendered by the template', () => {
    expect(generateLatexFromProfile(master)).not.toContain('Won the hackathon');
  });

  it('a master profile with no records still yields a document', () => {
    const empty = {
      ...master,
      experiences: [],
      projects: [],
      skills: [],
      certifications: [],
      education: [],
      links: [],
    } as unknown as MasterCareerProfile;
    expect(generateLatexFromProfile(empty)).toMatchSnapshot();
  });
});

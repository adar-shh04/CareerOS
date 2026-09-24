import {
  CANONICAL_CAREEROS_LATEX_TEMPLATE,
  escapeLatex,
  generateLatexFromProfile,
  plainTextToLatex,
  updateLatexSection,
} from '@repo/types';

import { AiCoachService } from '../ai-coach/ai-coach.service';
import type { AiCapabilityService } from '../byok/ai-capability.service';
import type { CareerProfileService } from '../career-profile/career-profile.service';
import type { MasterCareerProfile } from '../career-profile/career-profile.types';
import type { PrismaJobsRepository } from '../jobs/prisma-jobs.repository';
import type { ResumeProfileRepository } from './resume-profile.repository';
import { ResumeProfileService } from './resume-profile.service';
import type { ResumeProfile, ResumeVersion } from './resume-profile.types';

/**
 * Structural LaTeX checks (no TeX installation is required): balanced braces,
 * matched \begin/\end environments, non-empty lists, a single document body,
 * no unfilled template placeholders, and no known-invalid packages.
 * Returns a list of problems; empty means structurally valid.
 */
function latexStructureProblems(latex: string): string[] {
  const problems: string[] = [];
  const body = latex
    .split('\n')
    .map((line) => line.replace(/(^|[^\\])%.*$/, '$1'))
    .join('\n');

  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '\\') {
      i++; // skip the escaped character (\{, \}, \\, \%, ...)
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth < 0) {
      problems.push(`unbalanced "}" at offset ${String(i)}`);
      depth = 0;
    }
  }
  if (depth !== 0) problems.push(`${String(depth)} unclosed "{"`);

  const stack: { name: string; start: number }[] = [];
  const envRegex = /\\(begin|end)\{([^}]+)\}/g;
  for (const m of body.matchAll(envRegex)) {
    const [, kind, name] = m;
    if (kind === 'begin') {
      stack.push({ name, start: m.index + m[0].length });
    } else {
      const open = stack.pop();
      if (open?.name !== name) {
        problems.push(
          `\\end{${name}} does not close \\begin{${open?.name ?? '∅'}}`,
        );
      } else if (
        name === 'itemize' &&
        !/\\item\b/.test(body.slice(open.start, m.index))
      ) {
        problems.push('empty itemize (LaTeX error: missing \\item)');
      }
    }
  }
  if (stack.length)
    problems.push(
      `unclosed environments: ${stack.map((s) => s.name).join(', ')}`,
    );

  if ((body.match(/\\begin\{document\}/g) ?? []).length !== 1)
    problems.push('expected exactly one \\begin{document}');
  const endIdx = body.indexOf('\\end{document}');
  if (endIdx === -1 || body.slice(endIdx + '\\end{document}'.length).trim())
    problems.push('content after \\end{document} or it is missing');
  if (body.includes('{{')) problems.push('unfilled template placeholder');
  if (/\\usepackage(\[[^\]]*\])?\{utf8\}/.test(body))
    problems.push('invalid package \\usepackage{utf8}');

  return problems;
}

const WORKSPACE = '8d7825b3-a7a0-4f40-9d7f-861cb69e4d3d';
const EXP_ID = '0d4d8a62-7c9e-4c55-9a7a-1d3b1b0a0001';
const EXP_EMPTY_ID = '0d4d8a62-7c9e-4c55-9a7a-1d3b1b0a0002';
const PROJ_ID = '0d4d8a62-7c9e-4c55-9a7a-1d3b1b0a0003';
const SKILL_ID = '0d4d8a62-7c9e-4c55-9a7a-1d3b1b0a0004';

const master: MasterCareerProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  workspaceId: WORKSPACE,
  version: 3,
  createdAt: '2026-07-23T00:00:00.000Z',
  updatedAt: '2026-07-23T00:00:00.000Z',
  identity: {
    fullName: 'Ana O’Neil & Co_Founder',
    headline: 'Data Analyst — SQL & Python',
    email: 'ana_oneil@example.com',
    location: 'Pune, IN',
  },
  education: [
    {
      id: '0d4d8a62-7c9e-4c55-9a7a-1d3b1b0a0005',
      institution: 'IIT #1',
      degree: 'B.Tech',
      fieldOfStudy: 'CS',
      endDate: '2020',
    },
  ],
  experiences: [
    {
      id: EXP_ID,
      company: 'Acme {Labs}',
      title: 'Analyst',
      startDate: '2020-06',
      current: true,
      bullets: [
        'Cut report time by 40% using $SQL',
        'Owned KPI_dashboard ~ weekly',
      ],
    },
    {
      id: EXP_EMPTY_ID,
      company: 'Beta Corp',
      title: 'Intern',
      startDate: '2019-01',
      endDate: '2019-06',
      bullets: [],
    },
  ],
  projects: [
    {
      id: PROJ_ID,
      name: 'Churn Model',
      url: 'https://github.com/ana/churn?x=1#readme',
      description: 'Survival model for 50% of accounts',
    },
  ],
  achievements: [],
  skills: [{ id: SKILL_ID, name: 'C++ & C#' }],
  technologies: [],
  publications: [],
  hackathons: [],
  certifications: [
    {
      id: '0d4d8a62-7c9e-4c55-9a7a-1d3b1b0a0006',
      name: 'AWS SAA',
      issuer: 'AWS',
    },
  ],
  links: [
    {
      id: '0d4d8a62-7c9e-4c55-9a7a-1d3b1b0a0007',
      label: 'Portfolio',
      url: 'https://ana.dev/%7Ework',
    },
  ],
};

class InMemoryResumeProfileRepository implements ResumeProfileRepository {
  readonly profiles = new Map<string, ResumeProfile>();
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
  delete() {
    return Promise.resolve();
  }
  listVersions(): Promise<ResumeVersion[]> {
    return Promise.resolve([]);
  }
  createVersion(v: ResumeVersion) {
    return Promise.resolve(v);
  }
  findVersionById() {
    return Promise.resolve(undefined);
  }
}

describe('CareerOS LaTeX contract (shared by API and web)', () => {
  it('the canonical template is structurally valid once filled', () => {
    expect(latexStructureProblems(generateLatexFromProfile(master))).toEqual(
      [],
    );
    expect(CANONICAL_CAREEROS_LATEX_TEMPLATE).not.toMatch(/\{utf8\}/);
  });

  it('renders only real profile data — no invented bullets for empty records', () => {
    const latex = generateLatexFromProfile(master);

    expect(latex).toContain('Cut report time by 40\\% using \\$SQL');
    expect(latex).toContain('\\textbf{Beta Corp, Intern}');
    // The empty experience gets no list at all, and nothing is made up.
    expect(latex).not.toMatch(/Contributed to core project objectives/);
    expect(latex).not.toMatch(/Built and shipped key functional components/);
    // A project without bullets falls back to its own description.
    expect(latex).toContain('\\item Survival model for 50\\% of accounts');
  });

  it('escapes every LaTeX special character exactly once', () => {
    expect(escapeLatex('\\ & % $ # _ { } ~ ^')).toBe(
      '\\textbackslash{} \\& \\% \\$ \\# \\_ \\{ \\} \\textasciitilde{} \\textasciicircum{}',
    );
  });

  it('generate → store → AI Coach apply section → stored LaTeX stays valid and in-place', async () => {
    const repo = new InMemoryResumeProfileRepository();
    const careerProfileService = {
      findByWorkspace: jest.fn().mockResolvedValue(structuredClone(master)),
    } as unknown as CareerProfileService;
    const resumeProfiles = new ResumeProfileService(repo, careerProfileService);
    const coach = new AiCoachService(
      {} as AiCapabilityService,
      careerProfileService,
      resumeProfiles,
      {} as PrismaJobsRepository,
    );

    // 1. Generate + store (profile creation uses the shared generator).
    const created = await resumeProfiles.create(WORKSPACE, {
      name: 'Analyst Resume',
      prioritySkillIds: [SKILL_ID],
    });
    const generated = created.latexSource ?? '';
    expect(latexStructureProblems(generated)).toEqual([]);
    expect(generated).toContain('\\header{Experience}');

    // 2. Apply accepted section content, including specials and a bullet list.
    await coach.applySectionRecommendation(WORKSPACE, {
      resumeProfileId: created.id,
      section: 'experience',
      content:
        'Analytics work at Acme:\n- Automated 12 reports (saved 5h/wk)\n- Built R&D dashboards for 100% of teams',
    });
    await coach.applySectionRecommendation(WORKSPACE, {
      resumeProfileId: created.id,
      section: 'summary',
      content: 'Analyst focused on SQL & Python #data',
    });

    // 3. Read back what was stored.
    const stored =
      (await resumeProfiles.findById(WORKSPACE, created.id))?.latexSource ?? '';
    expect(latexStructureProblems(stored)).toEqual([]);

    // Same document conventions: sections still use \header, edited in place.
    expect(stored.match(/\\header\{Experience\}/g)).toHaveLength(1);
    expect(stored.match(/\\header\{Summary\}/g)).toHaveLength(1);
    expect(stored).toContain(
      '\\item Built R\\&D dashboards for 100\\% of teams',
    );
    expect(stored).toContain('Analyst focused on SQL \\& Python \\#data');
    expect(stored).not.toContain('Cut report time'); // old experience body replaced
    // Untouched sections and the template preamble survive.
    expect(stored).toContain('\\header{Projects}');
    expect(stored).toContain('\\newcommand{\\header}');
    expect(stored.indexOf('\\header{Summary}')).toBeLessThan(
      stored.indexOf('\\header{Education}'),
    );
  });

  it('edits legacy \\resumesection documents in place', () => {
    const legacy = [
      '\\documentclass[letterpaper,10pt]{article}',
      '\\newcommand{\\resumesection}[1]{\\textbf{#1}}',
      '\\begin{document}',
      '\\resumesection{Summary}',
      'Old',
      '',
      '\\resumesection{Skills}',
      'Go, SQL',
      '\\end{document}',
    ].join('\n');

    const updated = updateLatexSection(
      legacy,
      'Skills',
      plainTextToLatex('Rust, SQL'),
    );

    expect(updated).toContain('\\resumesection{Skills}\nRust, SQL\n');
    expect(updated).not.toContain('Go, SQL');
    expect(updated).toContain('\\resumesection{Summary}\nOld');
    expect(latexStructureProblems(updated)).toEqual([]);
  });

  it('edits a user-imported \\section* template in place and inserts missing sections with its own command', () => {
    const imported = [
      '\\documentclass{article}',
      '\\begin{document}',
      '\\section*{Experience}',
      'Old job',
      '\\section*{Education}',
      'MIT',
      '\\end{document}',
    ].join('\n');

    let updated = updateLatexSection(
      imported,
      'Experience',
      plainTextToLatex('New job'),
    );
    expect(updated).toContain('\\section*{Experience}\nNew job\n');
    expect(updated).toContain('\\section*{Education}\nMIT');

    updated = updateLatexSection(updated, 'Skills', plainTextToLatex('SQL'));
    expect(updated).toMatch(/\\section\{Skills\}\nSQL\n\n\\end\{document\}/);
    expect(latexStructureProblems(updated)).toEqual([]);
  });

  it('the structural validator catches the defects this contract prevents', () => {
    expect(
      latexStructureProblems(
        '\\usepackage[utf8]{utf8}\\begin{document}\\end{document}',
      ),
    ).toContain('invalid package \\usepackage{utf8}');
    expect(
      latexStructureProblems(
        '\\begin{document}\\begin{itemize}\\end{itemize}\\end{document}',
      ),
    ).toContain('empty itemize (LaTeX error: missing \\item)');
    expect(
      latexStructureProblems('\\begin{document}{\\end{document}'),
    ).toContain('1 unclosed "{"');
  });
});

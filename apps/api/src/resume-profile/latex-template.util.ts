import type { MasterCareerProfile } from '../career-profile/career-profile.types';
import type { ResumeProfile } from './resume-profile.types';

/**
 * Predefined Canonical High-Quality LaTeX Template Generator for CareerOS.
 * Preserves standard LaTeX layout, geometry, macros, section hierarchy, compact spacing,
 * and clean typography conventions.
 */
export function generateCanonicalLatexTemplate(
  profile?: ResumeProfile,
  masterProfile?: MasterCareerProfile,
): string {
  const name =
    masterProfile?.identity.fullName ?? profile?.name ?? 'Candidate Name';
  const headline = masterProfile?.identity.headline ?? profile?.roleFocus ?? '';
  const email = masterProfile?.identity.email ?? '';
  const location = masterProfile?.identity.location ?? '';
  const summary =
    profile?.summaryGuidance ?? masterProfile?.identity.headline ?? '';

  const skillsList = masterProfile?.skills.map((s) => s.name).join(', ') ?? '';
  const experiences = masterProfile?.experiences ?? [];
  const projects = masterProfile?.projects ?? [];
  const education = masterProfile?.education ?? [];
  const certifications = masterProfile?.certifications ?? [];

  return `\\documentclass[letterpaper,10pt]{article}
\\usepackage[utf8]{utf8}
\\usepackage[margin=0.6in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{xcolor}

\\hypersetup{
    colorlinks=true,
    linkcolor=blue,
    filecolor=magenta,      
    urlcolor=blue,
}

\\pagestyle{empty}
\\setlength{\\tabcolsep}{0pt}

% Section Formatting
\\newcommand{\\resumesection}[1]{
  \\vspace{4pt}
  {\\Large \\textbf{#1}}
  \\vspace{2pt}
  \\hrule
  \\vspace{4pt}
}

\\begin{document}

% Identity Header
\\begin{center}
  {\\Huge \\textbf{${escapeLatex(name)}}} \\\\[2pt]
  ${headline ? `{\\small \\textit{${escapeLatex(headline)}}} \\\\[2pt]` : ''}
  {\\small ${escapeLatex(location)}${location && email ? ' $|$ ' : ''}${email ? `\\href{mailto:${email}}{${escapeLatex(email)}}` : ''}}
\\end{center}

\\vspace{-6pt}

% Summary Section
${
  summary
    ? `\\resumesection{Summary}
${escapeLatex(summary)}

`
    : ''
}% Skills Section
${
  skillsList
    ? `\\resumesection{Skills}
\\textbf{Technical Skills:} ${escapeLatex(skillsList)}

`
    : ''
}% Experience Section
${
  experiences.length > 0
    ? `\\resumesection{Experience}
${experiences
  .map(
    (
      exp,
    ) => `\\textbf{${escapeLatex(exp.company)}} \\hfill ${escapeLatex(exp.startDate ?? '')} -- ${escapeLatex(exp.endDate ?? 'Present')} \\\\
\\textit{${escapeLatex(exp.title)}}
\\begin{itemize}[leftmargin=*,noitemsep,topsep=2pt]
${(exp.bullets ?? []).map((b) => `  \\item ${escapeLatex(b)}`).join('\n')}
\\end{itemize}
\\vspace{4pt}`,
  )
  .join('\n')}

`
    : ''
}% Projects Section
${
  projects.length > 0
    ? `\\resumesection{Projects}
${projects
  .map(
    (
      p,
    ) => `\\textbf{${escapeLatex(p.name)}} ${p.url ? `(\\href{${p.url}}{Link})` : ''} \\\\
${p.description ? `${escapeLatex(p.description)} \\\\` : ''}
\\begin{itemize}[leftmargin=*,noitemsep,topsep=2pt]
${(p.bullets ?? []).map((b) => `  \\item ${escapeLatex(b)}`).join('\n')}
\\end{itemize}
\\vspace{4pt}`,
  )
  .join('\n')}

`
    : ''
}% Education Section
${
  education.length > 0
    ? `\\resumesection{Education}
${education
  .map(
    (
      edu,
    ) => `\\textbf{${escapeLatex(edu.institution)}} \\hfill ${escapeLatex(edu.endDate ?? '')} \\\\
${edu.degree ? `\\textit{${escapeLatex(edu.degree)}${edu.fieldOfStudy ? ` in ${escapeLatex(edu.fieldOfStudy)}` : ''}}` : ''}
\\vspace{2pt}`,
  )
  .join('\n')}

`
    : ''
}% Certifications Section
${
  certifications.length > 0
    ? `\\resumesection{Certifications}
\\begin{itemize}[leftmargin=*,noitemsep,topsep=2pt]
${certifications.map((c) => `  \\item \\textbf{${escapeLatex(c.name)}}${c.issuer ? ` -- ${escapeLatex(c.issuer)}` : ''}`).join('\n')}
\\end{itemize}
`
    : ''
}\\end{document}
`;
}

function escapeLatex(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/&/g, '\\&')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

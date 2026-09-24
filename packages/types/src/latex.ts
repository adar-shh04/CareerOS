/**
 * CareerOS LaTeX contract — the single implementation used by both the API
 * (stored Resume Profile LaTeX, AI Coach "apply section") and the web client
 * (Resume Studio preview, "reset to canonical").
 *
 * Conventions:
 * - Generated documents use CANONICAL_CAREEROS_LATEX_TEMPLATE and the
 *   `\header{Title}` section command.
 * - Section edits preserve the rest of the document. They recognize
 *   `\header{...}`, `\section{...}`, `\section*{...}` and the legacy
 *   `\resumesection{...}`, so user-imported templates and older generated
 *   sources are edited in place rather than replaced.
 * - Only data present in the profile is rendered; nothing is invented for
 *   empty records.
 */
import type {
  AiCoachSection,
  MasterCareerProfile,
  ResumeProfile,
} from "./index.js";

export const CANONICAL_CAREEROS_LATEX_TEMPLATE = String.raw`\documentclass[a4paper]{article}
\usepackage{amsmath}
\usepackage{amssymb}
\usepackage{textcomp}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[left=1.5cm, right=1.5cm, top=1.5cm, bottom=1.5cm]{geometry}
\usepackage{longtable}
\pagestyle{empty}
\raggedright
\usepackage{xcolor}
\usepackage{hyperref}
\usepackage{fontawesome5}

\definecolor{lightblue}{RGB}{102,178,255}
\hypersetup{
    colorlinks=true,
    linkcolor=black,
    urlcolor=black,
    citecolor=black
}

\def\bull{\vrule height 0.8ex width .8ex depth -.1ex }

% DEFINITIONS FOR RESUME %%%%%%%%%%%%%%%%%%%%%%%

\newcommand{\area} [2] {
    \vspace*{-9pt}
    \begin{verse}
        \textbf{#1}   #2
    \end{verse}
}

\newcommand{\lineunder} {
    \vspace*{-8pt} \\
    \hspace*{-18pt} \hrulefill \\
}

\newcommand{\header} [1] {
    {\hspace*{-18pt}\vspace*{6pt} \textsc{#1}}
    \vspace*{-6pt} \lineunder
}

\newcommand{\employer} [3] {
    { \textbf{#1} (#2)\\ \underline{\textbf{\emph{#3}}}\\  }
}

\newcommand{\contact} [3] {
    \vspace*{-10pt}
    \begin{center}
        {\Huge \scshape {#1}}\\
        #2 \\ #3
    \end{center}
    \vspace*{-8pt}
}

\newenvironment{achievements}{
    \begin{list}
        {$\bullet$}{\topsep 0pt \itemsep -2pt}}{\vspace*{4pt}
    \end{list}
}

\newcommand{\schoolwithcourses} [4] {
    \textbf{#1} #2 $\bullet$ #3\\
    #4 \\
    \vspace*{5pt}
}

\newcommand{\school} [4] {
    \textbf{#1} #2 $\bullet$ #3\\
    #4 \\
}

% END RESUME DEFINITIONS %%%%%%%%%%%%%%%%%%%%%%%

\begin{document}
\vspace*{-40pt}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%
%     Profile
%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\begin{center}
    {\Huge \bfseries \scshape {{FULL_NAME}}} \\
    \vspace{4pt}
    \small
    {{CONTACT_LINE}}
\end{center}

{{SUMMARY_SECTION}}

{{EDUCATION_SECTION}}

{{EXPERIENCE_SECTION}}

{{PROJECTS_SECTION}}

{{SKILLS_SECTION}}

{{CERTIFICATIONS_SECTION}}

\ 
\end{document}
`;

/** Section titles CareerOS generates and targets when applying section edits. */
export const LATEX_SECTION_TITLES: Record<AiCoachSection, string> = {
  summary: "Summary",
  experience: "Experience",
  projects: "Projects",
  skills: "Skills",
  education: "Education",
};

const LATEX_SPECIALS: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "&": "\\&",
  "%": "\\%",
  $: "\\$",
  "#": "\\#",
  _: "\\_",
  "{": "\\{",
  "}": "\\}",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}",
};

/** Escape plain text for use in LaTeX body text (single pass). */
export function escapeLatex(text: string | undefined | null): string {
  if (!text) return "";
  return text.replace(/[\\&%$#_{}~^]/g, (ch) => LATEX_SPECIALS[ch] ?? ch);
}

/** Make a URL safe as the first argument of \href. */
export function sanitizeLatexUrl(url: string | undefined | null): string {
  if (!url) return "";
  return url
    .trim()
    .replace(/[\s{}\\]/g, "")
    .replace(/%/g, "\\%")
    .replace(/#/g, "\\#");
}

/**
 * Convert user- or AI-supplied plain text into LaTeX body content.
 * Text is escaped; consecutive lines starting with "-", "*" or "•" become an
 * itemize list; other lines become paragraphs.
 */
export function plainTextToLatex(text: string): string {
  const blocks: string[] = [];
  let items: string[] = [];
  let paragraph: string[] = [];

  const flushItems = () => {
    if (items.length > 0) {
      blocks.push(
        [
          "{\\setlength{\\leftmargini}{10pt}",
          "\\begin{itemize} \\itemsep -3pt",
          ...items.map((item) => `\\item ${escapeLatex(item)}`),
          "\\end{itemize}}",
        ].join("\n"),
      );
      items = [];
    }
  };
  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push(escapeLatex(paragraph.join(" ")));
      paragraph = [];
    }
  };

  for (const rawLine of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();
    const bullet = /^(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);
    if (bullet?.[1]) {
      flushParagraph();
      items.push(bullet[1].trim());
    } else if (!line) {
      flushItems();
      flushParagraph();
    } else {
      flushItems();
      paragraph.push(line);
    }
  }
  flushItems();
  flushParagraph();

  return blocks.join("\n\n");
}

type LatexResumeProfile = Pick<
  ResumeProfile,
  | "summaryGuidance"
  | "priorityExperienceIds"
  | "priorityProjectIds"
  | "prioritySkillIds"
  | "priorityCertificationIds"
>;

function itemizeBlock(items: string[], itemsep = "-3pt"): string {
  return [
    "{\\setlength{\\leftmargini}{10pt}",
    `\\begin{itemize} \\itemsep ${itemsep}`,
    ...items.map((item) => `\\item ${item}`),
    "\\end{itemize}}",
  ].join("\n");
}

/**
 * Generate canonical CareerOS LaTeX source from structured profile data.
 * Records are ordered by the Resume Profile's priority selections.
 */
export function generateLatexFromProfile(
  masterProfile: MasterCareerProfile,
  resumeProfile?: LatexResumeProfile | null,
): string {
  const { identity } = masterProfile;

  const prioritize = <T extends { id: string }>(
    items: T[] | undefined,
    ids: string[] | undefined,
  ): T[] => {
    if (!items?.length) return [];
    const pSet = new Set(ids ?? []);
    if (pSet.size === 0) return items;
    return [...items].sort(
      (a, b) => Number(pSet.has(b.id)) - Number(pSet.has(a.id)),
    );
  };

  const experiences = prioritize(
    masterProfile.experiences,
    resumeProfile?.priorityExperienceIds,
  );
  const projects = prioritize(
    masterProfile.projects,
    resumeProfile?.priorityProjectIds,
  );
  const skills = prioritize(
    masterProfile.skills,
    resumeProfile?.prioritySkillIds,
  );
  const certs = prioritize(
    masterProfile.certifications,
    resumeProfile?.priorityCertificationIds,
  );
  const education = masterProfile.education;

  // Contact line
  const contactParts: string[] = [];
  if (identity.location) contactParts.push(escapeLatex(identity.location));
  if (identity.email) {
    contactParts.push(
      `\\href{mailto:${sanitizeLatexUrl(identity.email)}}{${escapeLatex(identity.email)}}`,
    );
  }
  for (const l of masterProfile.links) {
    const url = sanitizeLatexUrl(l.url);
    if (url) contactParts.push(`\\href{${url}}{${escapeLatex(l.label || l.url)}}`);
  }
  const contactLine = contactParts.join(" \\,|\\, ");

  // Summary section
  const summaryText = resumeProfile?.summaryGuidance ?? identity.headline;
  const summarySection = summaryText
    ? `\\header{${LATEX_SECTION_TITLES.summary}}
{\\usefont{T1}{cmr}{m}{n}
${escapeLatex(summaryText)}
}
\\vspace{0.5em}`
    : "";

  // Education section
  const eduItems = education
    .map((edu) => {
      const dates = [edu.startDate, edu.endDate].filter(Boolean).join(" - ");
      const degree = [edu.degree, edu.fieldOfStudy].filter(Boolean).join(", ");
      return `\\textbf{${escapeLatex(edu.institution)}}\\hfill ${escapeLatex(dates)}\\\\
${degree ? `${escapeLatex(degree)}\\hfill \\\\` : ""}`;
    })
    .join("\n\\vspace{0.8em}\n");

  const eduSection = eduItems
    ? `\\header{${LATEX_SECTION_TITLES.education}}
\\vspace{0.2em}
${eduItems}
\\vspace{0.8em}`
    : "";

  // Experience section — bullets only from the profile; none are invented.
  const expItems = experiences
    .map((exp) => {
      const dates = [exp.startDate, exp.current ? "Present" : exp.endDate]
        .filter(Boolean)
        .join(" - ");
      const roleLine = `\\textbf{${escapeLatex(exp.company)}${exp.title ? `, ${escapeLatex(exp.title)}` : ""}}\\hfill ${exp.location ? `${escapeLatex(exp.location)}, ` : ""}${escapeLatex(dates)}\\\\`;
      const bullets = (exp.bullets ?? [])
        .filter((b) => b.trim())
        .map((b) => escapeLatex(b));

      return bullets.length > 0
        ? `${roleLine}
\\vspace{-3mm}
${itemizeBlock(bullets)}`
        : roleLine;
    })
    .join("\n\n");

  const expSection = expItems
    ? `\\header{${LATEX_SECTION_TITLES.experience}}
\\vspace{0.2em}
${expItems}`
    : "";

  // Project section — bullets, else the project's own description; else none.
  const projItems = projects
    .map((p) => {
      const url = sanitizeLatexUrl(p.url);
      const linkLatex = url
        ? `\\hfill \\href{${url}}{${url.toLowerCase().includes("github") ? "Github" : "Live"}}`
        : "";
      const headerLine = `\\textbf{${escapeLatex(p.name)}}${linkLatex}`;
      const bullets = (p.bullets ?? []).filter((b) => b.trim());
      const lines =
        bullets.length > 0
          ? bullets.map((b) => escapeLatex(b))
          : p.description?.trim()
            ? [escapeLatex(p.description)]
            : [];

      return lines.length > 0
        ? `${headerLine}
\\vspace{-2.7mm}
${itemizeBlock(lines)}
\\vspace*{-.1mm}`
        : `${headerLine}\\\\`;
    })
    .join("\n\n");

  const projSection = projItems
    ? `\\header{${LATEX_SECTION_TITLES.projects}}
\\vspace{0.2em}
${projItems}`
    : "";

  // Skills section
  const skillsList = skills.map((s) => escapeLatex(s.name)).join(", ");
  const skillsSection = skillsList
    ? `\\header{${LATEX_SECTION_TITLES.skills}}
\\vspace{0.2em}
\\textbf{Core Competencies:} ${skillsList}
\\vspace{0.5em}`
    : "";

  // Certifications section
  const certSection =
    certs.length > 0
      ? `\\header{Certifications}
\\vspace{-2mm}
${itemizeBlock(
  certs.map(
    (c) =>
      `${escapeLatex(c.name)}${c.issuer ? ` - ${escapeLatex(c.issuer)}` : ""}`,
  ),
  "-6pt",
)}`
      : "";

  // Function replacements so "$" sequences in content are never interpreted.
  return CANONICAL_CAREEROS_LATEX_TEMPLATE.replace(
    "{{FULL_NAME}}",
    () => escapeLatex(identity.fullName),
  )
    .replace("{{CONTACT_LINE}}", () => contactLine)
    .replace("{{SUMMARY_SECTION}}", () => summarySection)
    .replace("{{EDUCATION_SECTION}}", () => eduSection)
    .replace("{{EXPERIENCE_SECTION}}", () => expSection)
    .replace("{{PROJECTS_SECTION}}", () => projSection)
    .replace("{{SKILLS_SECTION}}", () => skillsSection)
    .replace("{{CERTIFICATIONS_SECTION}}", () => certSection);
}

const SECTION_COMMANDS = ["header", "resumesection", "section\\*?"] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The section command a document uses: \header, \resumesection or \section. */
export function detectLatexSectionCommand(latex: string): string {
  if (latex.includes("\\header{")) return "\\header";
  if (latex.includes("\\resumesection{")) return "\\resumesection";
  return "\\section";
}

/**
 * Replace the body of one section (identified by its title) with `bodyLatex`,
 * keeping the section command, the rest of the document, and its template.
 * If the section does not exist it is inserted before \end{document} using the
 * document's own section command.
 */
export function updateLatexSection(
  originalLatex: string,
  sectionTitle: string,
  bodyLatex: string,
): string {
  const anyCommand = `\\\\(?:${SECTION_COMMANDS.join("|")})`;
  const sectionRegex = new RegExp(
    `(${anyCommand}\\{${escapeRegExp(sectionTitle)}\\})[\\s\\S]*?(?=${anyCommand}\\{|\\\\end\\{document\\})`,
    "i",
  );

  if (sectionRegex.test(originalLatex)) {
    return originalLatex.replace(
      sectionRegex,
      (_match: string, heading: string) => `${heading}\n${bodyLatex}\n\n`,
    );
  }

  const command = detectLatexSectionCommand(originalLatex);
  const block = `${command}{${sectionTitle}}\n${bodyLatex}\n\n`;
  const endDocIdx = originalLatex.lastIndexOf("\\end{document}");
  if (endDocIdx !== -1) {
    return (
      originalLatex.slice(0, endDocIdx) + block + originalLatex.slice(endDocIdx)
    );
  }
  return `${originalLatex}\n${block}`;
}

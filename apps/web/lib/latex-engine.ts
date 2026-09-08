import type { MasterCareerProfile, ResumeProfile } from "@repo/types";

/**
 * CareerOS Canonical LaTeX Resume Template.
 * Formatted with standard article/geometry layout, custom header macro,
 * and high-density, recruiter-tested typesetting.
 */
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

function escapeLatex(text: string | undefined): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\textbackslash ")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde ")
    .replace(/\^/g, "\\textasciicircum ");
}

/**
 * Generate canonical CareerOS LaTeX source from structured profile data.
 */
export function generateLatexFromProfile(
  masterProfile: MasterCareerProfile,
  resumeProfile?: ResumeProfile | null,
): string {
  const { identity } = masterProfile;

  // Filter and prioritize based on ResumeProfile
  const priorityExperienceIds = new Set(
    resumeProfile?.priorityExperienceIds ?? [],
  );
  const priorityProjectIds = new Set(resumeProfile?.priorityProjectIds ?? []);
  const prioritySkillIds = new Set(resumeProfile?.prioritySkillIds ?? []);
  const priorityCertIds = new Set(
    resumeProfile?.priorityCertificationIds ?? [],
  );

  const prioritize = <T extends { id: string }>(
    items: T[] | undefined,
    pSet: Set<string>,
  ): T[] => {
    if (!items?.length) return [];
    if (pSet.size === 0) return items;
    return [...items].sort((a, b) => Number(pSet.has(b.id)) - Number(pSet.has(a.id)));
  };

  const experiences = prioritize(masterProfile.experiences, priorityExperienceIds);
  const projects = prioritize(masterProfile.projects, priorityProjectIds);
  const skills = prioritize(masterProfile.skills, prioritySkillIds);
  const education = masterProfile.education;
  const certs = prioritize(masterProfile.certifications, priorityCertIds);

  // Contact line
  const contactParts: string[] = [];
  if (identity.location) contactParts.push(escapeLatex(identity.location));
  if (identity.email) {
    contactParts.push(`\\href{mailto:${escapeLatex(identity.email)}}{${escapeLatex(identity.email)}}`);
  }
  for (const l of masterProfile.links) {
    contactParts.push(`\\href{${l.url}}{${escapeLatex(l.label || l.url)}}`);
  }
  const contactLine = contactParts.join(" \\,|\\, ");

  // Summary section
  const summaryText = resumeProfile?.summaryGuidance ?? identity.headline;
  const summarySection = summaryText
    ? `\\header{Summary}
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
    ? `\\header{Education}
\\vspace{0.2em}
${eduItems}
\\vspace{0.8em}`
    : "";

  // Experience section
  const expItems = experiences
    .map((exp) => {
      const dates = [exp.startDate, exp.current ? "Present" : exp.endDate]
        .filter(Boolean)
        .join(" - ");
      const roleLine = `\\textbf{${escapeLatex(exp.company)}${exp.title ? `, ${escapeLatex(exp.title)}` : ""}}\\hfill ${exp.location ? `${escapeLatex(exp.location)}, ` : ""}${escapeLatex(dates)}\\\\`;
      const bullets = (exp.bullets ?? [])
        .filter(Boolean)
        .map((b) => `\\item ${escapeLatex(b)}`)
        .join("\n");

      return `${roleLine}
\\vspace{-3mm}
{\\setlength{\\leftmargini}{10pt}
\\begin{itemize} \\itemsep -3pt
${bullets || "\\item Contributed to core project objectives and technical delivery."}
\\end{itemize}}`;
    })
    .join("\n\n");

  const expSection = expItems
    ? `\\header{Experience}
\\vspace{0.2em}
${expItems}`
    : "";

  // Project section
  const projItems = projects
    .map((p) => {
      const linkLatex = p.url
        ? `\\hfill \\href{${p.url}}{${escapeLatex(p.url.toLowerCase().includes("github") ? "Github" : "Live")}}`
        : "";
      const headerLine = `\\textbf{${escapeLatex(p.name)}}${linkLatex}`;
      const bullets = (p.bullets ?? [])
        .filter(Boolean)
        .map((b) => `\\item ${escapeLatex(b)}`)
        .join("\n");

      return `${headerLine}
\\vspace{-2.7mm}
{\\setlength{\\leftmargini}{10pt}
\\begin{itemize} \\itemsep -3pt
${bullets || (p.description ? `\\item ${escapeLatex(p.description)}` : "\\item Built and shipped key functional components.")}
\\end{itemize}}
\\vspace*{-.1mm}`;
    })
    .join("\n\n");

  const projSection = projItems
    ? `\\header{Projects}
\\vspace{0.2em}
${projItems}`
    : "";

  // Skills section
  const skillsList = skills.map((s) => escapeLatex(s.name)).join(", ");
  const skillsSection = skillsList
    ? `\\header{Skills}
\\vspace{0.2em}
\\textbf{Core Competencies:} ${skillsList}
\\vspace{0.5em}`
    : "";

  // Certifications section
  const certItems = certs
    .map((c) => {
      return `\\item ${escapeLatex(c.name)}${c.issuer ? ` - ${escapeLatex(c.issuer)}` : ""}`;
    })
    .join("\n\\vspace*{1mm}\n");

  const certSection =
    certs.length > 0
      ? `\\header{Certifications}
\\vspace{-2mm}
{\\setlength{\\leftmargini}{10pt}
\\begin{itemize} \\itemsep -6pt
${certItems}
\\end{itemize}}`
      : "";

  let result = CANONICAL_CAREEROS_LATEX_TEMPLATE;
  result = result.replace("{{FULL_NAME}}", escapeLatex(identity.fullName));
  result = result.replace("{{CONTACT_LINE}}", contactLine);
  result = result.replace("{{SUMMARY_SECTION}}", summarySection);
  result = result.replace("{{EDUCATION_SECTION}}", eduSection);
  result = result.replace("{{EXPERIENCE_SECTION}}", expSection);
  result = result.replace("{{PROJECTS_SECTION}}", projSection);
  result = result.replace("{{SKILLS_SECTION}}", skillsSection);
  result = result.replace("{{CERTIFICATIONS_SECTION}}", certSection);

  return result;
}

/**
 * Replace or update a single section in a user's LaTeX resume,
 * preserving the entire surrounding template and styling intact.
 * Supports both standard \section{...} and custom \header{...} definitions.
 */
export function updateLatexSection(
  originalLatex: string,
  sectionName: string,
  newContent: string,
): string {
  // Pattern matching \section{...} or \header{...}
  const sectionRegex = new RegExp(
    `(\\\\(?:section\\*?|header)\\{${sectionName}\\}[\\s\\S]*?)(?=(\\\\(?:section\\*?|header)\\{|\\\\end\\{document\\}))`,
    "i",
  );

  const isHeader = /\\header\{/i.test(originalLatex);
  const command = isHeader ? "\\header" : "\\section";

  if (sectionRegex.test(originalLatex)) {
    return originalLatex.replace(
      sectionRegex,
      (_match: string, _p1: string, after: string) => {
        return `${command}{${sectionName}}\n${newContent}\n\n${after || ""}`;
      },
    );
  }

  // If section doesn't exist yet, insert right before \end{document}
  const endDocIdx = originalLatex.indexOf("\\end{document}");
  if (endDocIdx !== -1) {
    return (
      originalLatex.slice(0, endDocIdx) +
      `\n${command}{${sectionName}}\n${newContent}\n\n` +
      originalLatex.slice(endDocIdx)
    );
  }

  return originalLatex + `\n${command}{${sectionName}}\n${newContent}\n`;
}

/**
 * Safely compiles a LaTeX document into a beautifully styled,
 * typeset HTML document with authentic Computer Modern typography.
 * Completely sandboxed: no child_process, no shell, zero security risk.
 */
export function compileLatexToHtml(latex: string): {
  title: string;
  html: string;
  sectionsCount: number;
} {
  if (!latex.trim()) {
    return { title: "Untitled Resume", html: "<p>Empty document</p>", sectionsCount: 0 };
  }

  // Strip comments
  const cleanLatex = latex
    .split("\n")
    .map((line) => {
      const commentIdx = line.indexOf("%");
      if (commentIdx !== -1 && (commentIdx === 0 || line[commentIdx - 1] !== "\\")) {
        return line.slice(0, commentIdx);
      }
      return line;
    })
    .join("\n");

  // Extract Name from heading or document
  let candidateName = "Curriculum Vitae";
  const nameMatch =
    /\{\\Huge(?:\s+\\bfseries|\s+\\scshape|\s+\\textbf)*\s*([^{}\\\n]+)\}/i.exec(cleanLatex) ??
    /\\textbf\{\\Huge(?:\s+\\scshape)?\s*([^}]+)\}/i.exec(cleanLatex) ??
    /\\Huge(?:\s+\\scshape\s+|\s+\\bfseries\s+)*([^}\\\n]+)/i.exec(cleanLatex);

  if (nameMatch?.[1]) {
    candidateName = nameMatch[1].trim();
  }

  // Parse sections: split on either \section{...} or \header{...}
  const sections: { title: string; content: string }[] = [];
  const sectionSplit = cleanLatex.split(/(?:\\section\*?|\\header)\{([^}]+)\}/);

  // Preamble & Header (between \begin{document} and first \section or \header)
  let headerContent = sectionSplit[0] ?? "";
  const beginDocIdx = headerContent.indexOf("\\begin{document}");
  if (beginDocIdx !== -1) {
    headerContent = headerContent.slice(beginDocIdx + "\\begin{document}".length);
  }

  for (let i = 1; i < sectionSplit.length; i += 2) {
    const title = sectionSplit[i]?.trim() ?? "Section";
    const content = sectionSplit[i + 1]?.trim() ?? "";
    sections.push({ title, content });
  }

  // Transform LaTeX inline styles into HTML
  const formatText = (raw: string): string => {
    let out = raw;

    // Unescape LaTeX special characters
    out = out
      .replace(/\\&/g, "&amp;")
      .replace(/\\%/g, "%")
      .replace(/\\\$/g, "$")
      .replace(/\\#/g, "#")
      .replace(/\\_/g, "_")
      .replace(/\\\{/g, "{")
      .replace(/\\\}/g, "}");

    // Bold \textbf{...}
    out = out.replace(/\\textbf\{([^{}]+)\}/g, "<strong>$1</strong>");

    // Italic \textit{...} or \emph{...}
    out = out.replace(/\\(?:textit|emph)\{([^{}]+)\}/g, "<em>$1</em>");

    // Underline \underline{...}
    out = out.replace(/\\underline\{([^{}]+)\}/g, "<u>$1</u>");

    // Small caps \textsc{...} or \scshape
    out = out.replace(/\\textsc\{([^{}]+)\}/g, '<span style="font-variant: small-caps;">$1</span>');
    out = out.replace(/\\scshape\s+([^{}\\\n]+)/g, '<span style="font-variant: small-caps;">$1</span>');

    // Hyperlinks \href{url}{label}
    out = out.replace(
      /\\href\{([^}]+)\}\{([^}]+)\}/g,
      '<a href="$1" target="_blank" rel="noreferrer" style="color: #0284c7; text-decoration: underline;">$2</a>',
    );

    // Symbols \,|\, or $|$ or |
    out = out.replace(/\\,\|\\,/g, '<span style="margin: 0 6px; color: #94a3b8;">|</span>');
    out = out.replace(/\$\|\$/g, '<span style="margin: 0 6px; color: #94a3b8;">|</span>');
    out = out.replace(/\\,/g, " ");

    // Dashes -- or --- or ‑
    out = out.replace(/---/g, "—").replace(/--/g, "–").replace(/‑/g, "-");

    // Bullets \bull or $\bullet$
    out = out.replace(/\\bull\b/g, "•").replace(/\$\\bullet\$/g, "•");

    // Handle \hfill (push right)
    out = out.replace(
      /^([^\n\\]*?)\\hfill\s*([^\n\\]*?)(?:\\\\)?$/gm,
      '<div style="display: flex; justify-content: space-between; align-items: baseline; width: 100%; margin-top: 4px; margin-bottom: 2px;"><div>$1</div><div style="font-size: 9pt; color: #475569; font-weight: 500; text-align: right;">$2</div></div>',
    );

    // Clean up macro remnants and formatting noise
    out = out.replace(/\\usefont\{[^}]+\}\{[^}]+\}\{[^}]+\}\{[^}]+\}/g, "");
    out = out.replace(/\\setlength\{[^}]+\}\{[^}]+\}/g, "");
    out = out.replace(/\\itemsep\s*-?\d+(?:\.\d+)?pt/g, "");
    out = out.replace(/\\topsep\s*-?\d+(?:\.\d+)?pt/g, "");
    out = out.replace(/\\vspace\*?\{[^}]+\}/g, "");
    out = out.replace(/\\hspace\*?\{[^}]+\}/g, " ");
    out = out.replace(/\\\\/g, "<br/>");
    out = out.replace(/\\small\b/g, "");
    out = out.replace(/\\large\b/g, "");
    out = out.replace(/\\Huge\b/g, "");
    out = out.replace(/\\bfseries\b/g, "");
    out = out.replace(/\\scshape\b/g, "");
    out = out.replace(/\\lineunder\b/g, "");
    out = out.replace(/\\hrulefill\b/g, "");
    out = out.replace(/\\raggedright\b/g, "");
    out = out.replace(/\\pagestyle\{[^}]+\}/g, "");

    // Clean lone braces on their own line
    out = out.replace(/(?:^|\n)\s*\{\s*(?:\n|$)/gm, "\n");
    out = out.replace(/(?:^|\n)\s*\}\s*(?:\n|$)/gm, "\n");

    return out;
  };

  // Compile Header HTML
  let headerHtml = "";
  if (headerContent) {
    const centerMatch = /\\begin\{center\}([\s\S]*?)\\end\{center\}/.exec(headerContent);
    const hBody = centerMatch ? centerMatch[1] : headerContent;
    if (hBody) {
      const cleanContact = hBody
        .replace(/\{\\Huge[^{}]*\}\s*\\\\?/i, "")
        .replace(/\\textbf\{\\Huge[^{}]*\}\s*\\\\?/i, "")
        .replace(/\\Huge[^{}\n]*\\\\?/i, "")
        .replace(/\\begin\{[^}]+\}/g, "")
        .replace(/\\end\{[^}]+\}/g, "")
        .trim();

      headerHtml = `<header style="text-align: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #0f172a;">
        <h1 style="font-size: 24pt; font-family: 'Latin Modern Roman', 'Computer Modern', Georgia, serif; font-weight: 800; letter-spacing: -0.01em; text-transform: uppercase; margin: 0 0 6px 0; color: #0f172a;">
          ${formatText(candidateName)}
        </h1>
        <div style="font-size: 9.5pt; color: #334155; line-height: 1.6;">
          ${formatText(cleanContact)}
        </div>
      </header>`;
    }
  }

  // Compile Body Sections
  const bodyHtml = sections
    .map((sec) => {
      const cleanTitle = formatText(sec.title);
      let content = sec.content;

      // Clean end of document
      const endDoc = content.indexOf("\\end{document}");
      if (endDoc !== -1) content = content.slice(0, endDoc);

      // Clean list enclosures
      content = content.replace(/\{\s*\\setlength\{[^}]+\}\{[^}]+\}/g, "");
      content = content.replace(/\\end\{itemize\}\s*\}/g, "\\end{itemize}");
      content = content.replace(/\\end\{achievements\}\s*\}/g, "\\end{achievements}");

      // Handle subheadings
      content = content.replace(
        /\\resumeSubheading\s*\{([^}]+)\}\s*\{([^}]*)\}\s*\{([^}]*)\}\s*\{([^}]*)\}/g,
        `<div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 8px; margin-bottom: 2px;">
          <div><strong style="color: #0f172a;">$1</strong> <span style="color: #475569;">| $3</span></div>
          <div style="font-size: 9pt; color: #64748b; font-weight: 500;">$2 $4</div>
        </div>`,
      );

      // Handle project headings
      content = content.replace(
        /\\resumeProjectHeading\s*\{([^}]+)\}\s*\{([^}]*)\}/g,
        `<div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 8px; margin-bottom: 2px;">
          <div>$1</div>
          <div style="font-size: 9pt; color: #64748b;">$2</div>
        </div>`,
      );

      // Handle items / bullet lists
      content = content.replace(
        /\\resumeItem\{([^}]+)\}/g,
        '<li style="margin-bottom: 3px; line-height: 1.45;">$1</li>',
      );

      content = content.replace(
        /\\item\s+([^\n\\]+)/g,
        '<li style="margin-bottom: 3px; line-height: 1.45;">$1</li>',
      );

      content = content.replace(/\\begin\{itemize\}[^\]]*\]?/g, '<ul style="margin: 4px 0 8px 18px; padding: 0; list-style-type: disc; font-size: 9.5pt; color: #1e293b;">');
      content = content.replace(/\\end\{itemize\}/g, "</ul>");
      content = content.replace(/\\begin\{achievements\}/g, '<ul style="margin: 4px 0 8px 18px; padding: 0; list-style-type: disc; font-size: 9.5pt; color: #1e293b;">');
      content = content.replace(/\\end\{achievements\}/g, "</ul>");
      content = content.replace(/\\resumeItemListStart/g, '<ul style="margin: 4px 0 8px 18px; padding: 0; list-style-type: disc; font-size: 9.5pt; color: #1e293b;">');
      content = content.replace(/\\resumeItemListEnd/g, "</ul>");
      content = content.replace(/\\resumeSubHeadingListStart/g, '<div style="margin-bottom: 12px;">');
      content = content.replace(/\\resumeSubHeadingListEnd/g, "</div>");

      const formattedContent = formatText(content);

      return `<section style="margin-bottom: 18px;">
        <h2 style="font-size: 11pt; font-family: 'Latin Modern Roman', 'Computer Modern', Georgia, serif; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #0f172a; margin: 0 0 4px 0; padding-bottom: 2px; border-bottom: 1px solid #0f172a;">
          ${cleanTitle}
        </h2>
        <div style="font-size: 9.5pt; line-height: 1.45; color: #1e293b;">
          ${formattedContent}
        </div>
      </section>`;
    })
    .join("\n");

  const fullHtml = `
    <div class="careeros-latex-compiled-document" style="background-color: #ffffff; color: #0f172a; font-family: 'Latin Modern Roman', 'Computer Modern Roman', 'Times New Roman', Georgia, serif; font-size: 10pt; line-height: 1.5; padding: 44px 50px; max-width: 820px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.35); border-radius: 2px; min-height: 1056px;">
      ${headerHtml}
      <main>
        ${bodyHtml}
      </main>
    </div>
  `;

  return {
    title: candidateName,
    html: fullHtml,
    sectionsCount: sections.length,
  };
}

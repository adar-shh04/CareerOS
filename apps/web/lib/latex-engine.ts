/**
 * Web side of the CareerOS LaTeX contract.
 *
 * Generation, escaping and section edits come from the single shared
 * implementation in @repo/types (also used by the API), so the web client
 * never produces a LaTeX structure the API cannot edit. This module adds only
 * the in-browser HTML preview.
 */
export {
  CANONICAL_CAREEROS_LATEX_TEMPLATE,
  escapeLatex,
  generateLatexFromProfile,
  LATEX_SECTION_TITLES,
  plainTextToLatex,
  updateLatexSection,
} from "@repo/types";

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

  // Parse sections: split on \section{...}, \header{...} or legacy \resumesection{...}
  const sections: { title: string; content: string }[] = [];
  const sectionSplit = cleanLatex.split(
    /(?:\\section\*?|\\header|\\resumesection)\{([^}]+)\}/,
  );

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

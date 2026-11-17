/**
 * Small, dependency-free HTML -> plain text converter for job descriptions.
 * The output is plain text only (never HTML), so it is safe to store and to
 * render; markup is stripped, not sanitised-and-kept.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  bull: '•',
  middot: '·',
  copy: '©',
  reg: '®',
  trade: '™',
  eacute: 'é',
  euro: '€',
};

export function decodeEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z][a-z0-9]{1,10});/gi,
    (match, body: string) => {
      if (body.startsWith('#')) {
        const code =
          body[1] === 'x' || body[1] === 'X'
            ? parseInt(body.slice(2), 16)
            : parseInt(body.slice(1), 10);
        if (
          !Number.isFinite(code) ||
          code <= 0 ||
          code > 0x10ffff ||
          (code >= 0xd800 && code <= 0xdfff)
        ) {
          return '';
        }
        return String.fromCodePoint(code);
      }
      return NAMED_ENTITIES[body.toLowerCase()] ?? match;
    },
  );
}

const DROP_WITH_CONTENT =
  /<(script|style|noscript|template|svg|iframe|object|embed|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const BLOCK_CLOSE =
  /<\/(p|div|h[1-6]|ul|ol|table|tr|section|article|blockquote|pre|header|footer)\s*>/gi;

/**
 * Some APIs (Greenhouse) return the description HTML entity-escaped
 * ("&lt;p&gt;..."). Unescape once when that is clearly the case.
 */
function unescapeIfEscapedMarkup(value: string): string {
  if (!/<\/?[a-z][^>]*>/i.test(value) && /&lt;\/?[a-z]/i.test(value)) {
    return decodeEntities(value);
  }
  return value;
}

export function htmlToText(input: string): string {
  let text = unescapeIfEscapedMarkup(input);
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  text = text.replace(DROP_WITH_CONTENT, '');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<li\b[^>]*>/gi, '\n- ');
  text = text.replace(BLOCK_CLOSE, '\n\n');
  text = text.replace(/<\/(dt|dd)\s*>/gi, '\n');
  text = text.replace(/<\/?[a-z!][^>]*>/gi, ''); // remaining tags
  text = text.replace(/<[^>]*$/, ''); // truncated trailing tag
  text = decodeEntities(text);
  text = text.replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' ');
  text = text
    .split('\n')
    .map((line) => line.trim())
    .join('\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

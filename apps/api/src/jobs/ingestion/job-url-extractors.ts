import { MANUAL_JOB_MAX_DESCRIPTION } from '../create-manual-job.dto';
import { htmlToText } from './html-to-text';

/** Draft form fields; nothing here is persisted. */
export interface JobUrlDraft {
  title: string;
  company: string;
  location?: string;
  isRemote: boolean;
  salaryRange?: string;
  description: string;
  sourceUrl: string;
}

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
};
const clip = (v: string | undefined, max: number): string | undefined =>
  v === undefined ? undefined : v.slice(0, max).trim() || undefined;

const SLUG = /^[A-Za-z0-9_.-]{1,100}$/;
const JOB_ID = /^[A-Za-z0-9_-]{1,64}$/;
const REMOTE = /\bremote\b|\btelecommut|\bwork from home\b|\banywhere\b/i;

/** "acme-corp" -> "Acme Corp" (a draft the user edits). */
export function prettifySlug(slug: string): string {
  return slug
    .replace(/[-_.]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function money(n: number, currency?: string): string {
  const formatted = Math.round(n).toLocaleString('en-US');
  return currency ? `${currency} ${formatted}` : formatted;
}

function range(
  min: number | undefined,
  max: number | undefined,
  currency?: string,
  period?: string,
): string | undefined {
  let text: string | undefined;
  if (min !== undefined && max !== undefined && min !== max) {
    text = `${money(min, currency)} - ${Math.round(max).toLocaleString('en-US')}`;
  } else if (min !== undefined || max !== undefined) {
    text = money(min ?? max ?? 0, currency);
  }
  return text && period ? `${text} / ${period}` : text;
}

/** Shared finishing step: cap lengths to the manual-job DTO limits. */
export function finalizeDraft(draft: JobUrlDraft): JobUrlDraft {
  return {
    title: draft.title.slice(0, 200).trim(),
    company: draft.company.slice(0, 200).trim(),
    location: clip(draft.location, 200),
    isRemote: draft.isRemote,
    salaryRange: clip(draft.salaryRange, 100),
    description: draft.description.slice(0, MANUAL_JOB_MAX_DESCRIPTION).trim(),
    sourceUrl: draft.sourceUrl,
  };
}

// ── Greenhouse ─────────────────────────────────────────────────────────

export interface GreenhouseRef {
  board: string;
  jobId: string;
}

export function parseGreenhouseUrl(url: URL): GreenhouseRef | null {
  if (!/^(boards|job-boards)(\.eu)?\.greenhouse\.io$/i.test(url.hostname)) {
    return null;
  }
  const parts = url.pathname.split('/').filter(Boolean);
  let board: string | undefined;
  let jobId: string | undefined;
  if (parts[0] === 'embed' && parts[1] === 'job_app') {
    board = url.searchParams.get('for') ?? undefined;
    jobId = url.searchParams.get('token') ?? undefined;
  } else if (parts.length >= 3 && parts[1] === 'jobs') {
    board = parts[0];
    jobId = parts[2];
  }
  if (!board || !jobId || !SLUG.test(board) || !JOB_ID.test(jobId)) {
    return null;
  }
  return { board, jobId };
}

export function greenhouseApiUrl(ref: GreenhouseRef): string {
  return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(ref.board)}/jobs/${encodeURIComponent(ref.jobId)}?pay_transparency=true`;
}

export function mapGreenhouse(
  payload: unknown,
  ref: GreenhouseRef,
  sourceUrl: string,
): JobUrlDraft | null {
  if (!isObject(payload)) return null;
  const title = str(payload.title);
  const description = htmlToText(str(payload.content) ?? '');
  if (!title || !description) return null;
  const location = isObject(payload.location)
    ? str(payload.location.name)
    : undefined;
  let salaryRange: string | undefined;
  const pay = Array.isArray(payload.pay_input_ranges)
    ? payload.pay_input_ranges.find(isObject)
    : undefined;
  if (pay) {
    const min = num(pay.min_cents);
    const max = num(pay.max_cents);
    salaryRange = range(
      min === undefined ? undefined : min / 100,
      max === undefined ? undefined : max / 100,
      str(pay.currency_type),
    );
  }
  return finalizeDraft({
    title,
    company: str(payload.company_name) ?? prettifySlug(ref.board),
    location,
    isRemote: location ? REMOTE.test(location) : false,
    salaryRange,
    description,
    sourceUrl,
  });
}

// ── Lever ──────────────────────────────────────────────────────────────

export interface LeverRef {
  company: string;
  jobId: string;
  eu: boolean;
}

export function parseLeverUrl(url: URL): LeverRef | null {
  const host = url.hostname.toLowerCase();
  if (host !== 'jobs.lever.co' && host !== 'jobs.eu.lever.co') return null;
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const [company, jobId] = parts;
  if (!SLUG.test(company) || !JOB_ID.test(jobId)) return null;
  return { company, jobId, eu: host === 'jobs.eu.lever.co' };
}

export function leverApiUrl(ref: LeverRef): string {
  const host = ref.eu ? 'api.eu.lever.co' : 'api.lever.co';
  return `https://${host}/v0/postings/${encodeURIComponent(ref.company)}/${encodeURIComponent(ref.jobId)}`;
}

export function mapLever(
  payload: unknown,
  ref: LeverRef,
  sourceUrl: string,
): JobUrlDraft | null {
  if (!isObject(payload)) return null;
  const title = str(payload.text);
  if (!title) return null;

  const parts: string[] = [];
  const opening =
    str(payload.descriptionPlain) ?? htmlToText(str(payload.description) ?? '');
  if (opening) parts.push(opening);
  if (Array.isArray(payload.lists)) {
    for (const list of payload.lists) {
      if (!isObject(list)) continue;
      const heading = str(list.text);
      const body = htmlToText(str(list.content) ?? '');
      if (heading) parts.push(htmlToText(heading));
      if (body) parts.push(body);
    }
  }
  const closing =
    str(payload.additionalPlain) ?? htmlToText(str(payload.additional) ?? '');
  if (closing) parts.push(closing);
  const description = parts.join('\n\n').trim();
  if (!description) return null;

  const categories = isObject(payload.categories) ? payload.categories : {};
  const location = str(categories.location);
  const allLocations = Array.isArray(categories.allLocations)
    ? categories.allLocations.filter((l): l is string => typeof l === 'string')
    : [];
  const workplace = str(payload.workplaceType)?.toLowerCase();
  const isRemote =
    workplace === 'remote' ||
    (location ? REMOTE.test(location) : false) ||
    allLocations.some((l) => REMOTE.test(l));

  let salaryRange: string | undefined;
  if (isObject(payload.salaryRange)) {
    const interval = str(payload.salaryRange.interval);
    salaryRange = range(
      num(payload.salaryRange.min),
      num(payload.salaryRange.max),
      str(payload.salaryRange.currency),
      interval?.includes('hour')
        ? 'hour'
        : interval?.includes('year')
          ? 'year'
          : undefined,
    );
  }

  return finalizeDraft({
    title,
    company: prettifySlug(ref.company),
    location,
    isRemote,
    salaryRange,
    description,
    sourceUrl,
  });
}

// ── Generic: schema.org JobPosting JSON-LD ─────────────────────────────

const LD_SCRIPT =
  /<script\b[^>]*\btype\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script\s*>/gi;

/** Every parseable JSON-LD document in the page (bad blocks are skipped). */
export function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  for (const match of html.matchAll(LD_SCRIPT)) {
    const raw = match[1]
      .replace(/^\s*<!--/, '')
      .replace(/-->\s*$/, '')
      .replace(/^\s*<!\[CDATA\[/, '')
      .replace(/\]\]>\s*$/, '')
      .trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      // malformed block: ignore
    }
  }
  return blocks;
}

function isJobPosting(node: Json): boolean {
  const type = node['@type'];
  return Array.isArray(type)
    ? type.includes('JobPosting')
    : type === 'JobPosting';
}

/** First JobPosting node, looking through arrays, @graph and nesting. */
export function findJobPosting(root: unknown, depth = 0): Json | null {
  if (depth > 6) return null;
  if (Array.isArray(root)) {
    for (const item of root) {
      const found = findJobPosting(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (!isObject(root)) return null;
  if (isJobPosting(root)) return root;
  if (root['@graph']) return findJobPosting(root['@graph'], depth + 1);
  return null;
}

function nameOf(v: unknown): string | undefined {
  if (typeof v === 'string') return str(v);
  if (Array.isArray(v)) return v.map(nameOf).find(Boolean);
  return isObject(v) ? str(v.name) : undefined;
}

function locationOf(posting: Json): string | undefined {
  const raw = posting.jobLocation;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const places: string[] = [];
  for (const place of list) {
    if (!isObject(place)) continue;
    const address = place.address;
    if (typeof address === 'string') {
      const s = str(address);
      if (s) places.push(s);
      continue;
    }
    if (!isObject(address)) continue;
    const text = [
      str(address.addressLocality),
      str(address.addressRegion),
      nameOf(address.addressCountry),
    ]
      .filter(Boolean)
      .join(', ');
    if (text) places.push(text);
  }
  if (places.length > 0) return places.slice(0, 3).join(' / ');
  return nameOf(posting.applicantLocationRequirements);
}

function salaryOf(posting: Json): string | undefined {
  const base = posting.baseSalary;
  if (!isObject(base)) return undefined;
  const currency = str(base.currency);
  const value = isObject(base.value) ? base.value : base;
  const unit = str(value.unitText)?.toLowerCase();
  const period = unit
    ? unit.startsWith('year')
      ? 'year'
      : unit.startsWith('month')
        ? 'month'
        : unit.startsWith('hour')
          ? 'hour'
          : unit.startsWith('week')
            ? 'week'
            : unit.startsWith('day')
              ? 'day'
              : undefined
    : undefined;
  const exact = num(value.value);
  return range(
    num(value.minValue) ?? exact,
    num(value.maxValue) ?? exact,
    currency,
    period,
  );
}

function metaContent(html: string, property: string): string | undefined {
  const re = new RegExp(
    `<meta\\b[^>]*\\b(?:property|name)\\s*=\\s*["']${property}["'][^>]*>`,
    'i',
  );
  const tag = re.exec(html)?.[0];
  const content =
    tag && /\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i.exec(tag);
  const value = content ? content[1] || content[2] : undefined;
  return value ? htmlToText(value) || undefined : undefined;
}

export function mapJobPosting(
  posting: Json,
  html: string,
  sourceUrl: string,
  fallbackHost: string,
): JobUrlDraft | null {
  const title = nameOf(posting.title) ?? metaContent(html, 'og:title');
  const description = htmlToText(str(posting.description) ?? '');
  if (!title || !description) return null;
  const company =
    nameOf(posting.hiringOrganization) ??
    metaContent(html, 'og:site_name') ??
    fallbackHost.replace(/^www\./i, '');
  const location = locationOf(posting);
  const locationType = str(posting.jobLocationType)?.toUpperCase();
  return finalizeDraft({
    title: htmlToText(title),
    company: htmlToText(company),
    location,
    isRemote:
      locationType === 'TELECOMMUTE' ||
      (location ? REMOTE.test(location) : false),
    salaryRange: salaryOf(posting),
    description,
    sourceUrl,
  });
}

export function extractFromHtml(
  html: string,
  sourceUrl: string,
  fallbackHost: string,
): JobUrlDraft | null {
  for (const block of extractJsonLdBlocks(html)) {
    const posting = findJobPosting(block);
    if (!posting) continue;
    const draft = mapJobPosting(posting, html, sourceUrl, fallbackHost);
    if (draft) return draft;
  }
  return null;
}

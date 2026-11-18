import type {
  MasterCareerProfile,
  ResumeProfile,
  ResumeSelectionMode,
  ResumeVersion,
  ResumeVersionDocument,
  SelectedRecordIds,
} from '@repo/types';
import { generateLatexDocument } from '@repo/types';

/**
 * Version-owned resume documents (T-04).
 *
 * A ResumeVersion is an immutable snapshot, so the document it shows must come
 * from the version itself, never from the current Resume Profile. The document
 * is stored under `artifactMetadata.document` (existing JSON column, no schema
 * change) and surfaced as `ResumeVersion.document` by the service. The server
 * owns that key: anything a client sends under it is overwritten.
 */

export const DOCUMENT_KEY = 'document';

const SELECTION_FIELDS = [
  'experienceIds',
  'projectIds',
  'skillIds',
  'certificationIds',
  'achievementIds',
] as const;

/** artifactMetadata without the server-owned document key (never mutates its input). */
export function withoutDocument(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  const rest = Object.fromEntries(
    Object.entries(metadata).filter(([key]) => key !== DOCUMENT_KEY),
  );
  return Object.keys(rest).length > 0 ? rest : undefined;
}

export function emptySelection(): SelectedRecordIds {
  return {
    experienceIds: [],
    projectIds: [],
    skillIds: [],
    certificationIds: [],
    achievementIds: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSelection(value: unknown): SelectedRecordIds | undefined {
  if (!isRecord(value)) return undefined;
  const result = emptySelection();
  for (const field of SELECTION_FIELDS) {
    const ids = value[field];
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) {
      return undefined;
    }
    result[field] = [...ids];
  }
  return result;
}

/** Defensive read: anything malformed counts as "no document captured". */
export function readVersionDocument(
  metadata: Record<string, unknown> | undefined,
): ResumeVersionDocument | undefined {
  const raw = metadata?.[DOCUMENT_KEY];
  if (!isRecord(raw)) return undefined;
  const { latexSource, kind, selectionMode, createdFrom } = raw;
  if (typeof latexSource !== 'string' || latexSource.trim() === '') {
    return undefined;
  }
  if (kind !== 'generated' && kind !== 'custom_preserved') return undefined;
  if (selectionMode !== 'prioritized' && selectionMode !== 'included') {
    return undefined;
  }
  if (
    createdFrom !== 'targeted_resume' &&
    createdFrom !== 'manual' &&
    createdFrom !== 'revision'
  ) {
    return undefined;
  }
  const represented = parseSelection(raw.representedRecordIds);
  return {
    latexSource,
    kind,
    selectionMode,
    createdFrom,
    ...(represented ? { representedRecordIds: represented } : {}),
    ...(typeof raw.summaryGuidance === 'string' && raw.summaryGuidance
      ? { summaryGuidance: raw.summaryGuidance }
      : {}),
    ...(typeof raw.basedOnVersionId === 'string' && raw.basedOnVersionId
      ? { basedOnVersionId: raw.basedOnVersionId }
      : {}),
  };
}

/**
 * The document as the user would have seen it when the version was created:
 * the profile's own LaTeX source, verbatim, or a generated one when it has
 * none. It is `generated` only when the source is PROVABLY the standard
 * template for the current profile data (byte-identical once regenerated);
 * anything else, including a standard source that is merely out of date,
 * is preserved verbatim as `custom_preserved` and never regenerated.
 */
export function buildCreationDocument(
  master: MasterCareerProfile,
  profile: ResumeProfile,
  createdFrom: 'targeted_resume' | 'manual',
): ResumeVersionDocument {
  const trimmedGuidance = profile.summaryGuidance?.trim() ?? '';
  const summaryGuidance = trimmedGuidance === '' ? undefined : trimmedGuidance;
  const generated = generateLatexDocument(master, {
    summaryGuidance,
    priorityExperienceIds: profile.priorityExperienceIds,
    priorityProjectIds: profile.priorityProjectIds,
    prioritySkillIds: profile.prioritySkillIds,
    priorityCertificationIds: profile.priorityCertificationIds,
  });
  const source = profile.latexSource?.trim() ?? '';

  if (source === '' || source === generated.latex.trim()) {
    return {
      latexSource: source === '' ? generated.latex : source,
      kind: 'generated',
      selectionMode: 'prioritized',
      representedRecordIds: generated.represented,
      ...(summaryGuidance ? { summaryGuidance } : {}),
      createdFrom,
    };
  }
  return {
    latexSource: source,
    kind: 'custom_preserved',
    selectionMode: 'prioritized',
    createdFrom,
  };
}

export type RevisionDocumentMode = 'auto' | 'generate';

/**
 * The document for a revision, derived ONLY from the base version's own data:
 * its frozen profile snapshot and its stored document, never the current
 * profile or master. Custom LaTeX is kept verbatim unless the user explicitly
 * asks for the standard template.
 */
export function buildRevisionDocument(
  base: ResumeVersion,
  selection: SelectedRecordIds,
  mode: RevisionDocumentMode,
): ResumeVersionDocument {
  const keepCustom =
    mode === 'auto' && base.document?.kind === 'custom_preserved';
  if (keepCustom && base.document) {
    return {
      latexSource: base.document.latexSource,
      kind: 'custom_preserved',
      selectionMode: 'prioritized', // the source is unchanged: nothing was filtered
      createdFrom: 'revision',
      basedOnVersionId: base.id,
    };
  }

  const summaryGuidance = base.document?.summaryGuidance;
  const generated = generateLatexDocument(
    base.masterProfileSnapshot,
    {
      summaryGuidance,
      // a revision never inherits the current profile's ordering preferences
      priorityExperienceIds: [],
      priorityProjectIds: [],
      prioritySkillIds: [],
      priorityCertificationIds: [],
    },
    { selection },
  );
  const selectionMode: ResumeSelectionMode = 'included';
  return {
    latexSource: generated.latex,
    kind: 'generated',
    selectionMode,
    representedRecordIds: generated.represented,
    ...(summaryGuidance ? { summaryGuidance } : {}),
    createdFrom: 'revision',
    basedOnVersionId: base.id,
  };
}

/**
 * AI output is untrusted. These helpers parse a model's JSON reply and check
 * its shape; anything that does not validate is reported as a failure rather
 * than being patched up with placeholder content.
 */

/** Parse a JSON object from model output, tolerating a ```json fence. */
export function parseAiJsonObject(
  text: string,
): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  const candidate = fenced?.[1] ?? trimmed;

  try {
    const parsed: unknown = JSON.parse(candidate);
    return typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

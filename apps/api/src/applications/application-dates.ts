import { BadRequestException } from '@nestjs/common';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse an optional date field from a request body.
 * undefined = unchanged, null/"" = clear, otherwise a valid date.
 *
 * Follow-up and deadline dates are calendar days, not instants: "YYYY-MM-DD"
 * (or any ISO timestamp) is normalised to UTC midnight of that day, so the
 * stored value never shifts with the server or browser timezone.
 */
export function parseDateField(
  field: string,
  value: unknown,
  { dateOnly = false }: { dateOnly?: boolean } = {},
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} must be a valid ISO date.`);
  }
  if (dateOnly && DATE_ONLY.test(value)) {
    const day = new Date(`${value}T00:00:00.000Z`);
    if (
      Number.isNaN(day.getTime()) ||
      day.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException(`${field} must be a valid ISO date.`);
    }
    return day;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${field} must be a valid ISO date.`);
  }
  if (dateOnly) {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }
  return date;
}

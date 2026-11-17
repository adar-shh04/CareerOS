import { BadRequestException } from '@nestjs/common';

import { parseDateField } from './application-dates';

describe('parseDateField', () => {
  it('leaves undefined unchanged and clears null / empty string', () => {
    expect(parseDateField('followUpAt', undefined)).toBeUndefined();
    expect(parseDateField('followUpAt', null)).toBeNull();
    expect(parseDateField('followUpAt', '')).toBeNull();
  });

  it('normalises date-only fields to UTC midnight', () => {
    const d = parseDateField('followUpAt', '2026-12-05', { dateOnly: true });
    expect(d?.toISOString()).toBe('2026-12-05T00:00:00.000Z');
    const t = parseDateField('deadlineAt', '2026-12-05T23:30:00.000Z', {
      dateOnly: true,
    });
    expect(t?.toISOString()).toBe('2026-12-05T00:00:00.000Z');
  });

  it('keeps full instants for non date-only fields', () => {
    const d = parseDateField('appliedAt', '2026-12-05T10:15:00.000Z');
    expect(d?.toISOString()).toBe('2026-12-05T10:15:00.000Z');
  });

  it('rejects invalid values', () => {
    for (const bad of ['nope', '2026-02-31', 12345, {}]) {
      expect(() =>
        parseDateField('followUpAt', bad, { dateOnly: true }),
      ).toThrow(BadRequestException);
    }
  });
});

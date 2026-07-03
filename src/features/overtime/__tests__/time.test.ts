import { formatOvertimeTime, toLocalDateTimeString } from '../time';

describe('overtime time helpers', () => {
  it('keeps selected local time when building payload datetime', () => {
    expect(toLocalDateTimeString('2026-07-03', '17:00')).toBe('2026-07-03T17:00:00');
  });

  it('formats ISO UTC overtime times in local timezone', () => {
    expect(formatOvertimeTime('2026-07-03T10:00:00.000Z')).toBe('17:00');
  });

  it('falls back to raw time strings', () => {
    expect(formatOvertimeTime('17:00:00')).toBe('17:00');
  });
});

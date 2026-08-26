import { formatAttendanceDayDate } from '../datetime';

describe('formatAttendanceDayDate', () => {
  it('formats YYYY-MM-DD date string with Indonesian day name and formatted date', () => {
    const formatted = formatAttendanceDayDate('2026-05-15');
    expect(formatted).toContain('Jumat');
    expect(formatted).toContain('15');
    expect(formatted).toContain('2026');
  });

  it('handles nullish or invalid values gracefully', () => {
    expect(formatAttendanceDayDate(null)).toBe('-');
    expect(formatAttendanceDayDate('')).toBe('-');
  });
});

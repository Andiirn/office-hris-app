import { getAttendancePeriodWindow, getCurrentAttendancePeriod, parseAttendancePeriod, shiftAttendancePeriod } from '../period';

describe('attendance period helpers', () => {
  it('parses year and month from YYYY-MM url params', () => {
    expect(parseAttendancePeriod('2026-06')).toEqual({ year: 2026, month: 6 });
  });

  it('falls back to the provided date when the url param is invalid', () => {
    expect(parseAttendancePeriod('invalid', new Date(2024, 0, 15))).toEqual({ year: 2024, month: 1 });
  });

  it('uses the next month after the 26th as the active attendance period', () => {
    expect(getCurrentAttendancePeriod(new Date(2024, 0, 26))).toEqual({ year: 2024, month: 2 });
  });

  it('shifts the period across year boundaries', () => {
    expect(shiftAttendancePeriod({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it('builds the 26th-to-25th attendance window from the ending month', () => {
    expect(getAttendancePeriodWindow({ year: 2026, month: 6 })).toMatchObject({
      year: 2026,
      month: 6,
      dateFrom: '2026-05-26',
      dateTo: '2026-06-25',
    });
  });
});

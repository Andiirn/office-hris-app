import { getAttendanceScanDecision, getAttendanceScanDecisionForToday, getAttendanceScanDecisionFromOpenRecord } from '../scan-state';

describe('getAttendanceScanDecision', () => {
  it('returns checkout when there is an open record', () => {
    expect(getAttendanceScanDecision([
      { checkin_at: '2026-07-15T01:00:00Z', checkout_at: null },
    ])).toEqual({ action: 'checkout' });
  });

  it('blocks scanning when today is already completed', () => {
    expect(getAttendanceScanDecision([
      { checkin_at: '2026-07-15T01:00:00Z', checkout_at: '2026-07-15T08:00:00Z' },
    ])).toEqual({
      action: 'blocked',
      message: 'Absensi hari ini sudah lengkap. Silakan tunggu hari berikutnya untuk scan lagi.',
    });
  });

  it('ignores auto-generated absent placeholders without timestamps', () => {
    expect(getAttendanceScanDecision([
      { status: 'ABSENT' },
    ])).toEqual({ action: 'checkin' });
  });

  it('returns checkin when there is no attendance yet', () => {
    expect(getAttendanceScanDecision([])).toEqual({ action: 'checkin' });
  });

  it('returns checkout directly from an open record', () => {
    expect(getAttendanceScanDecisionFromOpenRecord({
      checkin_at: '2026-07-15T01:00:00Z',
      checkout_at: null,
    })).toEqual({ action: 'checkout' });
  });

  it('returns checkin directly when the open record is missing', () => {
    expect(getAttendanceScanDecisionFromOpenRecord(null)).toEqual({ action: 'checkin' });
  });

  it('blocks scanning when today records show the attendance is completed', () => {
    expect(getAttendanceScanDecisionForToday(null, [
      {
        attendance_date: '2026-07-15',
        checkin_at: '2026-07-15T01:00:00Z',
        checkout_at: '2026-07-15T08:00:00Z',
      },
    ], '2026-07-15')).toEqual({
      action: 'blocked',
      message: 'Absensi hari ini sudah lengkap. Silakan tunggu hari berikutnya untuk scan lagi.',
    });
  });

  it('returns checkout when the open record is still active', () => {
    expect(getAttendanceScanDecisionForToday({
      attendance_date: '2026-07-15',
      checkin_at: '2026-07-15T01:00:00Z',
      checkout_at: null,
    }, [], '2026-07-15')).toEqual({ action: 'checkout' });
  });

  it('treats a cross-day open record before 4am as checkout', () => {
    expect(getAttendanceScanDecisionForToday(null, [], '2026-07-16', new Date('2026-07-16T02:00:00'), [
      {
        attendance_date: '2026-07-15',
        checkin_at: '2026-07-15T22:00:00',
        checkout_at: null,
      },
    ])).toEqual({ action: 'checkout' });
  });

  it('keeps completed cross-day attendance blocked before 4am', () => {
    expect(getAttendanceScanDecisionForToday(null, [], '2026-07-16', new Date('2026-07-16T02:00:00'), [
      {
        attendance_date: '2026-07-15',
        checkin_at: '2026-07-15T22:00:00',
        checkout_at: '2026-07-16T02:00:00',
      },
    ])).toEqual({
      action: 'checkin',
    });
  });

  it('allows new checkin before 4am when yesterday was already completed', () => {
    expect(getAttendanceScanDecisionForToday(null, [], '2026-07-16', new Date('2026-07-16T02:30:00'), [
      {
        attendance_date: '2026-07-15',
        checkin_at: '2026-07-15T08:00:00',
        checkout_at: '2026-07-15T23:00:00',
      },
    ])).toEqual({ action: 'checkin' });
  });

  it('blocks immediate checkout after a fresh checkin', () => {
    expect(getAttendanceScanDecisionForToday({
      attendance_date: '2026-07-16',
      checkin_at: '2026-07-16T08:00:00',
      checkout_at: null,
    }, [
      {
        attendance_date: '2026-07-16',
        checkin_at: '2026-07-16T08:00:00',
        checkout_at: null,
      },
    ], '2026-07-16', new Date('2026-07-16T08:00:10'))).toEqual({
      action: 'blocked',
      message: 'Baru saja check-in. Tunggu beberapa menit sebelum check-out agar tidak salah tekan scan lagi.',
    });
  });
});

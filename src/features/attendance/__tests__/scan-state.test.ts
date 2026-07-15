import { getAttendanceScanDecision } from '../scan-state';

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
});

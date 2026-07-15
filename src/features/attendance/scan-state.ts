export type AttendanceRecordLike = {
  status?: string | null;
  checkin_at?: string | null;
  checkin_time?: string | null;
  checkout_at?: string | null;
  checkout_time?: string | null;
};

export type AttendanceScanDecision =
  | { action: 'checkin' }
  | { action: 'checkout' }
  | { action: 'blocked'; message: string };

const hasCheckin = (record: AttendanceRecordLike) => !!(record.checkin_at || record.checkin_time);
const hasCheckout = (record: AttendanceRecordLike) => !!(record.checkout_at || record.checkout_time);
const isPlaceholderAbsent = (record: AttendanceRecordLike) => {
  const status = String(record.status || '').toUpperCase();
  return status === 'ABSENT' || status === 'NOT_PRESENT';
};

export const getAttendanceScanDecision = (records: AttendanceRecordLike[]): AttendanceScanDecision => {
  const meaningfulRecords = records.filter((record) => !isPlaceholderAbsent(record) || hasCheckin(record) || hasCheckout(record));
  const hasOpenRecord = meaningfulRecords.some((record) => hasCheckin(record) && !hasCheckout(record));
  if (hasOpenRecord) {
    return { action: 'checkout' };
  }

  const hasCompletedRecord = meaningfulRecords.some((record) => hasCheckin(record) && hasCheckout(record));
  if (hasCompletedRecord) {
    return {
      action: 'blocked',
      message: 'Absensi hari ini sudah lengkap. Silakan tunggu hari berikutnya untuk scan lagi.',
    };
  }

  return { action: 'checkin' };
};

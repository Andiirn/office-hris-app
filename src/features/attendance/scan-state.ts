export type AttendanceRecordLike = {
  status?: string | null;
  attendance_date?: string | null;
  date?: string | null;
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
const getRecordDate = (record: AttendanceRecordLike) => record.attendance_date || record.date || null;
const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const isPlaceholderAbsent = (record: AttendanceRecordLike) => {
  const status = String(record.status || '').toUpperCase();
  return status === 'ABSENT' || status === 'NOT_PRESENT';
};

export const isTodayAttendanceRecord = (record: AttendanceRecordLike, today = getLocalDateString()) =>
  getRecordDate(record) === today;

export const isWithinCheckoutCooldown = (
  record: AttendanceRecordLike | null | undefined,
  now = new Date(),
  cooldownMinutes = 5
) => {
  if (!record || !hasCheckin(record) || hasCheckout(record)) return false;
  const checkinValue = record.checkin_at || record.checkin_time;
  if (!checkinValue) return false;
  const parsed = new Date(checkinValue);
  if (Number.isNaN(parsed.getTime())) return false;
  return now.getTime() - parsed.getTime() < cooldownMinutes * 60 * 1000;
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

export const getAttendanceScanDecisionFromOpenRecord = (record: AttendanceRecordLike | null | undefined): AttendanceScanDecision =>
  record && hasCheckin(record) && !hasCheckout(record)
    ? { action: 'checkout' }
    : { action: 'checkin' };

export const getAttendanceScanDecisionForToday = (
  openRecord: AttendanceRecordLike | null | undefined,
  todayRecords: AttendanceRecordLike[],
  today = getLocalDateString(),
  now = new Date(),
  yesterdayRecords: AttendanceRecordLike[] = []
): AttendanceScanDecision => {
  if (openRecord && hasCheckin(openRecord) && !hasCheckout(openRecord)) {
    if (isWithinCheckoutCooldown(openRecord, now)) {
      return {
        action: 'blocked',
        message: 'Baru saja check-in. Tunggu beberapa menit sebelum check-out agar tidak salah tekan scan lagi.',
      };
    }
    return { action: 'checkout' };
  }

  const todayRecord = todayRecords.find((record) => isTodayAttendanceRecord(record, today) && (hasCheckin(record) || hasCheckout(record)));
  if (todayRecord && hasCheckin(todayRecord) && hasCheckout(todayRecord)) {
    return {
      action: 'blocked',
      message: 'Absensi hari ini sudah lengkap. Silakan tunggu hari berikutnya untuk scan lagi.',
    };
  }

  if (now.getHours() < 4) {
    const crossDayRecord = yesterdayRecords.find((record) => (hasCheckin(record) || hasCheckout(record)));
    if (crossDayRecord && hasCheckin(crossDayRecord) && !hasCheckout(crossDayRecord)) {
      return { action: 'checkout' };
    }
  }

  return { action: 'checkin' };
};

export interface AttendancePeriod {
  year: number;
  month: number;
}

export interface AttendancePeriodWindow extends AttendancePeriod {
  startDate: Date;
  endDate: Date;
  dateFrom: string;
  dateTo: string;
}

const pad = (value: number) => String(value).padStart(2, '0');

export const getCurrentAttendancePeriod = (reference = new Date()): AttendancePeriod => {
  const base = {
    year: reference.getFullYear(),
    month: reference.getMonth() + 1,
  };

  return reference.getDate() >= 26 ? shiftAttendancePeriod(base, 1) : base;
};

export const parseAttendancePeriod = (value?: string | null, fallback = new Date()): AttendancePeriod => {
  const match = typeof value === 'string' ? value.trim().match(/^(\d{4})-(\d{2})$/) : null;
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  return getCurrentAttendancePeriod(fallback);
};

export const shiftAttendancePeriod = (period: AttendancePeriod, offset = 0): AttendancePeriod => {
  const date = new Date(period.year, period.month - 1, 1);
  date.setMonth(date.getMonth() + offset);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
};

export const getAttendancePeriodWindow = (period: AttendancePeriod): AttendancePeriodWindow => {
  const startDate = new Date(period.year, period.month - 2, 26);
  const endDate = new Date(period.year, period.month - 1, 25);

  return {
    ...period,
    startDate,
    endDate,
    dateFrom: `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`,
    dateTo: `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`,
  };
};

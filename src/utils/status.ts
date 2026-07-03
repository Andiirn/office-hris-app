export type BadgeType = 'secondary' | 'error' | 'warning' | 'muted' | 'primary';

export interface BadgeProps {
  label: string;
  type: BadgeType;
  bgClass: string;
  textClass: string;
}

export const getAttendanceBadgeProps = (status?: string): BadgeProps => {
  const upperStatus = String(status || 'PRESENT').toUpperCase();
  let label = upperStatus;
  let type: BadgeType = 'secondary';

  switch (upperStatus) {
    case 'PRESENT':
      label = 'HADIR'; type = 'secondary'; break;
    case 'ABSENT':
      label = 'TIDAK HADIR'; type = 'error'; break;
    case 'LATE':
      label = 'TERLAMBAT'; type = 'warning'; break;
    case 'EARLY_CHECKOUT':
      label = 'PULANG CEPAT'; type = 'warning'; break;
    case 'LEAVE':
      label = 'CUTI'; type = 'primary'; break;
    case 'SICK':
      label = 'SAKIT'; type = 'warning'; break;
    case 'SICK_WITH_DOC':
      label = 'SAKIT (SKD)'; type = 'secondary'; break;
    case 'SICK_NO_DOC':
      label = 'SAKIT (TANPA SKD)'; type = 'warning'; break;
    case 'PERMISSION':
      label = 'IZIN'; type = 'primary'; break;
    case 'SPECIAL_LEAVE':
      label = 'CUTI KHUSUS'; type = 'primary'; break;
    case 'HOLIDAY':
      label = 'LIBUR'; type = 'muted'; break;
    case 'WORKDAY':
    case 'WORK_DAY':
      label = 'HARI KERJA'; type = 'secondary'; break;
    case 'WEEKEND':
      label = 'AKHIR PEKAN'; type = 'muted'; break;
    default:
      label = upperStatus; type = 'muted'; break;
  }

  let bgClass = 'bg-secondary-container';
  let textClass = 'text-secondary';
  
  if (type === 'error') {
    bgClass = 'bg-error-container/10';
    textClass = 'text-error';
  } else if (type === 'warning') {
    bgClass = 'bg-amber-100';
    textClass = 'text-amber-700';
  } else if (type === 'muted') {
    bgClass = 'bg-black/5';
    textClass = 'text-[#454652]';
  } else if (type === 'primary') {
    bgClass = 'bg-primary/10';
    textClass = 'text-primary';
  }

  return { label, type, bgClass, textClass };
};

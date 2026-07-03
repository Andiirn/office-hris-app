export function formatOvertimeTime(value?: string | null) {
  if (!value) return '--:--';

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }

  if (value.includes('T')) return value.split('T')[1].slice(0, 5);
  if (value.includes(' ')) return value.split(' ')[1].slice(0, 5);
  return value.slice(0, 5);
}

export function toLocalDateTimeString(date: string, time: string) {
  if (!date || !time) return '';
  const cleanDate = date.includes('T') ? date.split('T')[0] : date;
  const cleanTime = time.slice(0, 5);
  return `${cleanDate}T${cleanTime}:00`;
}

export function formatOvertimeTime(value?: string | null) {
  if (!value) return '--:--';

  const trimmed = value.trim();

  // If simple time format like "08:30" or "08:30:00" without date/timezone
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return trimmed.slice(0, 5);
  }

  // If full ISO date-time string or timestamp
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    // If it has timezone offset (like Z or +07:00), format using local time
    if (trimmed.includes('Z') || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
      const hours = String(parsed.getHours()).padStart(2, '0');
      const minutes = String(parsed.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }

    // If ISO without timezone like "2026-07-31T08:30:00", extract time part directly to avoid unwanted UTC shift
    if (trimmed.includes('T')) {
      const timePart = trimmed.split('T')[1];
      if (timePart) return timePart.slice(0, 5);
    }

    if (trimmed.includes(' ')) {
      const timePart = trimmed.split(' ')[1];
      if (timePart) return timePart.slice(0, 5);
    }

    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  return trimmed.slice(0, 5);
}

export function toLocalDateTimeString(date: string, time: string) {
  if (!date || !time) return '';
  const cleanDate = date.includes('T') ? date.split('T')[0] : date;
  const cleanTime = time.slice(0, 5);
  return `${cleanDate}T${cleanTime}:00`;
}

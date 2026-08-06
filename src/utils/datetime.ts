const DEFAULT_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

function parseDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  if (value.includes('T')) {
    const fallback = new Date(value.replace('T', ' '));
    if (!Number.isNaN(fallback.getTime())) return fallback;
  }
  return null;
}

export function formatIndonesianDate(value?: string | null) {
  const date = parseDate(value);
  if (!date) return '-';
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: DEFAULT_TIME_ZONE,
  });
}

export function formatIndonesianTime(value?: string | null) {
  const date = parseDate(value);
  if (!date) return '--:--';
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: DEFAULT_TIME_ZONE,
  });
}

export function formatIndonesianDateTime(value?: string | null) {
  const date = parseDate(value);
  if (!date) return '-';
  return date.toLocaleString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: DEFAULT_TIME_ZONE,
  });
}

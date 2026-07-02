export type ParsedAttendanceQrPayload = {
  qrToken: string;
  branchId?: string;
};

export const parseAttendanceQrPayload = (raw: string): ParsedAttendanceQrPayload => {
  const value = raw.trim();
  if (!value) {
    throw new Error('Format QR tidak valid');
  }

  try {
    const json = JSON.parse(value) as { qr_token?: unknown; branch_id?: unknown };
    if (typeof json.qr_token === 'string' && json.qr_token.trim()) {
      return {
        qrToken: json.qr_token.trim(),
        branchId: typeof json.branch_id === 'string' ? json.branch_id.trim() || undefined : undefined,
      };
    }
  } catch {
    // not JSON, try other formats below
  }

  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    const qrToken = url.searchParams.get('qr_token')?.trim();

    if (qrToken) {
      return {
        qrToken,
        branchId: url.searchParams.get('branch_id')?.trim() || undefined,
      };
    }
  }

  if (value.includes(':')) {
    const [branchId, ...rest] = value.split(':');
    const qrToken = rest.join(':').trim();
    if (qrToken) {
      return {
        qrToken,
        branchId: branchId.trim() || undefined,
      };
    }
  }

  return { qrToken: value };
};

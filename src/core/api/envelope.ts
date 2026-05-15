// src/core/api/envelope.ts
export interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: any;
}

export function unwrapData<T>(raw: any): T {
  if (raw && typeof raw === 'object' && raw.data !== undefined) {
    return raw.data as T;
  }
  return raw as T;
}

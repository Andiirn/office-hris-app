import { unwrapData } from '../envelope';

describe('unwrapData', () => {
  it('should return data property if it exists', () => {
    const raw = { data: { id: 1, name: 'Test' }, success: true };
    expect(unwrapData(raw)).toEqual({ id: 1, name: 'Test' });
  });

  it('should return the object itself if data property does not exist', () => {
    const raw = { id: 1, name: 'Test' };
    expect(unwrapData(raw)).toEqual({ id: 1, name: 'Test' });
  });

  it('should handle null and undefined', () => {
    expect(unwrapData(null)).toBeNull();
    expect(unwrapData(undefined)).toBeUndefined();
  });
});

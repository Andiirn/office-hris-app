import { handleNotificationNavigation, mapReferenceToRoute, sanitizeActionUrl } from '../notification-router';

describe('notification-router', () => {
  describe('sanitizeActionUrl', () => {
    it('sanitizes admin correction URLs to mobile route', () => {
      expect(sanitizeActionUrl('/admin/attendance/correction')).toBe('/correction');
      expect(sanitizeActionUrl('/admin/attendance/correction/14a7f39c-8012-4000-8000-123456789abc')).toBe('/correction');
    });

    it('sanitizes requester attendance correction URLs', () => {
      expect(sanitizeActionUrl('/attendance/corrections/14a7f39c-8012-4000-8000-123456789abc')).toBe('/correction');
    });

    it('sanitizes leave URLs', () => {
      expect(sanitizeActionUrl('/admin/izin/approval')).toBe('/approvals');
      expect(sanitizeActionUrl('/leave/requests/123')).toBe('/leave');
    });

    it('sanitizes overtime URLs', () => {
      expect(sanitizeActionUrl('/admin/overtime/approvals')).toBe('/approvals');
      expect(sanitizeActionUrl('/overtime/records/123')).toBe('/overtime');
    });

    it('returns null for empty or undefined url', () => {
      expect(sanitizeActionUrl(undefined)).toBeNull();
      expect(sanitizeActionUrl('')).toBeNull();
    });
  });

  describe('mapReferenceToRoute', () => {
    it('maps ATTENDANCE_CORRECTION to /correction', () => {
      expect(mapReferenceToRoute('ATTENDANCE_CORRECTION')).toBe('/correction');
    });

    it('maps LEAVE to /leave', () => {
      expect(mapReferenceToRoute('LEAVE')).toBe('/leave');
    });

    it('maps OVERTIME to /overtime', () => {
      expect(mapReferenceToRoute('OVERTIME')).toBe('/overtime');
    });

    it('maps RESIGN to /resign', () => {
      expect(mapReferenceToRoute('RESIGN')).toBe('/resign');
    });

    it('returns null for unknown reference_type', () => {
      expect(mapReferenceToRoute('UNKNOWN_TYPE')).toBeNull();
      expect(mapReferenceToRoute(undefined)).toBeNull();
    });
  });

  describe('handleNotificationNavigation', () => {
    const mockRouter = {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      setParams: jest.fn(),
      canGoBack: jest.fn(),
      dismiss: jest.fn(),
      dismissAll: jest.fn(),
    } as any;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('navigates via action_url when available', () => {
      const payload = {
        action_url: '/attendance/corrections/14a7f39c-8012-4000-8000-123456789abc',
        reference_type: 'ATTENDANCE_CORRECTION',
      };
      const result = handleNotificationNavigation(payload, mockRouter);
      expect(result).toBe(true);
      expect(mockRouter.push).toHaveBeenCalledWith('/correction');
    });

    it('navigates via reference_type when action_url is not mapped', () => {
      const payload = {
        reference_type: 'OVERTIME',
        reference_id: 'some-id',
      };
      const result = handleNotificationNavigation(payload, mockRouter);
      expect(result).toBe(true);
      expect(mockRouter.push).toHaveBeenCalledWith('/overtime');
    });

    it('falls back to /notifications when payload is empty', () => {
      const payload = {};
      const result = handleNotificationNavigation(payload, mockRouter);
      expect(result).toBe(true);
      expect(mockRouter.push).toHaveBeenCalledWith('/notifications');
    });
  });
});

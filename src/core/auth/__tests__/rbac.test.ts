import { normalizeRole, canApprove, ROLES } from '../rbac';

describe('RBAC utility', () => {
  describe('normalizeRole', () => {
    it('returns EMPLOYEE role for empty values', () => {
      expect(normalizeRole(null)).toBe(ROLES.EMPLOYEE);
      expect(normalizeRole(undefined)).toBe(ROLES.EMPLOYEE);
      expect(normalizeRole('')).toBe(ROLES.EMPLOYEE);
    });

    it('strips RoleEnum. prefix from role strings', () => {
      expect(normalizeRole('RoleEnum.MANAGER')).toBe(ROLES.MANAGER);
      expect(normalizeRole('RoleEnum.TEAM_LEAD')).toBe(ROLES.TEAM_LEAD);
      expect(normalizeRole('roleenum.hr_admin')).toBe(ROLES.HR_ADMIN);
    });

    it('replaces spaces and dashes with underscores and converts to lowercase', () => {
      expect(normalizeRole('Manager-HR-Admin')).toBe(ROLES.MANAGER_HR_ADMIN);
      expect(normalizeRole('Team Lead')).toBe(ROLES.TEAM_LEAD);
    });

    it('normalizes common roles correctly', () => {
      expect(normalizeRole('superadmin')).toBe(ROLES.SUPERADMIN);
      expect(normalizeRole('super_admin')).toBe(ROLES.SUPERADMIN);
      expect(normalizeRole('headdivision')).toBe(ROLES.HEAD_DIVISION);
      expect(normalizeRole('head_division')).toBe(ROLES.HEAD_DIVISION);
      expect(normalizeRole('employee')).toBe(ROLES.EMPLOYEE);
    });
  });

  describe('canApprove', () => {
    it('returns true for managerial and administrative roles', () => {
      expect(canApprove('RoleEnum.MANAGER')).toBe(true);
      expect(canApprove('RoleEnum.TEAM_LEAD')).toBe(true);
      expect(canApprove('RoleEnum.HEAD_DIVISION')).toBe(true);
      expect(canApprove('RoleEnum.HR_ADMIN')).toBe(true);
      expect(canApprove('RoleEnum.SUPERADMIN')).toBe(true);
      expect(canApprove('RoleEnum.CEO')).toBe(true);
      expect(canApprove('RoleEnum.DIRECTOR')).toBe(true);
      expect(canApprove('manager')).toBe(true);
    });

    it('returns false for non-approving roles', () => {
      expect(canApprove('RoleEnum.EMPLOYEE')).toBe(false);
      expect(canApprove('employee')).toBe(false);
      expect(canApprove('some-unknown-role')).toBe(false);
    });
  });
});

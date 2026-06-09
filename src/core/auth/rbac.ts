export const ROLES = {
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  HEAD_DIVISION: 'head_division',
  MANAGER_HR_ADMIN: 'manager_hr_admin',
  HR_ADMIN: 'hr_admin',
  HR_PAYROLL: 'hr_payroll',
  SUPERADMIN: 'superadmin',
  CEO: 'ceo',
  DIRECTOR: 'director',
  TEAM_LEAD: 'team_lead',
  MANAGER_HR_PAYROLL: 'manager_hr_payroll',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES] | string;

export function normalizeRole(role: string | null | undefined): UserRole {
  let raw = String(role ?? '').trim().toLowerCase();
  if (!raw) return ROLES.EMPLOYEE;

  // Handle Backend RoleEnum format (e.g., RoleEnum.HR_PAYROLL or RoleEnum.MANAGER)
  if (raw.includes('roleenum.')) {
    raw = raw.split('roleenum.')[1];
  }

  const compact = raw.replace(/[\s-]+/g, '_');
  if (compact === 'super_admin' || compact === 'superadmin') return ROLES.SUPERADMIN;
  if (compact === 'manager_hr_admin') return ROLES.MANAGER_HR_ADMIN;
  if (compact === 'hr_admin') return ROLES.HR_ADMIN;
  if (compact === 'hr_payroll') return ROLES.HR_PAYROLL;
  if (compact === 'ceo') return ROLES.CEO;
  if (compact === 'manager_hr_payroll') return ROLES.MANAGER_HR_PAYROLL;
  if (compact === 'director') return ROLES.DIRECTOR;
  if (compact === 'manager') return ROLES.MANAGER;
  if (compact === 'head_division' || compact === 'headdivision') return ROLES.HEAD_DIVISION;
  if (compact === 'team_lead' || compact === 'teamlead') return ROLES.TEAM_LEAD;
  if (compact === 'employee') return ROLES.EMPLOYEE;

  return compact;
}

export function canApprove(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role);
  const approvingRoles: string[] = [
    ROLES.SUPERADMIN,
    ROLES.MANAGER_HR_ADMIN,
    ROLES.HR_ADMIN,
    ROLES.CEO,
    ROLES.MANAGER_HR_PAYROLL,
    ROLES.DIRECTOR,
    ROLES.MANAGER,
    ROLES.HEAD_DIVISION,
    ROLES.TEAM_LEAD,
  ];
  return approvingRoles.includes(normalized);
}

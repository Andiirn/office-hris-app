export const qk = {
  profile: () => ['profile'] as const,
  payrollPreview: (employeeId?: string | null, companyId?: string | null, year?: number | null, month?: number | null) =>
    ['payroll-preview', employeeId ?? null, companyId ?? null, year ?? null, month ?? null] as const,
  attendanceHistory: (employeeId?: string | null, dateFrom?: string, dateTo?: string) =>
    ['attendance-history', employeeId ?? null, dateFrom ?? null, dateTo ?? null] as const,
  attendanceHistoryFull: (employeeId?: string | null, dateFrom?: string, dateTo?: string) =>
    ['attendance-history-full', employeeId ?? null, dateFrom ?? null, dateTo ?? null] as const,
  attendanceHistoryInfinite: (employeeId?: string | null, dateFrom?: string, dateTo?: string) =>
    ['attendance-history-infinite', employeeId ?? null, dateFrom ?? null, dateTo ?? null] as const,
  notifications: (employeeId?: string | null) => ['notifications', employeeId ?? null] as const,
  notificationsRoot: () => ['notifications'] as const,
  activityAttendanceFeed: (employeeId?: string | null, dateFrom?: string | null, dateTo?: string | null) =>
    ['activity-attendance-feed', employeeId ?? null, dateFrom ?? null, dateTo ?? null] as const,
  homeApprovals: (employeeId?: string | null) => ['home-approvals', employeeId ?? null] as const,
  homeApprovalsRoot: () => ['home-approvals'] as const,
};

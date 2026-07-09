import { router } from 'expo-router';
import { Alert } from 'react-native';
import { canApprove } from '../../core/auth/rbac';

export type HomeMenuItem = {
  icon: string;
  title: string;
  color?: string;
  bgColor?: string;
  onPress: () => void;
  badgeCount?: number;
  disabled?: boolean;
};

export function buildHomeMenuItems(role?: string | null, approvalCount?: number, visitPendingCount?: number): HomeMenuItem[] {
  const items: HomeMenuItem[] = [
    { icon: 'event-available', title: 'Izin & Cuti', color: '#f59e0b', bgColor: '#fef3c7', onPress: () => router.push('/leave') },
    { icon: 'work-history', title: 'Lembur', color: '#8b5cf6', bgColor: '#ede9fe', onPress: () => router.push('/overtime') },
    { icon: 'payments', title: 'Slip Gaji', color: '#10b981', bgColor: '#d1fae5', onPress: () => router.push('/payroll') },
    { icon: 'event', title: 'Absensi', color: '#3b82f6', bgColor: '#dbeafe', onPress: () => router.push('/attendance') },
    { icon: 'fact-check', title: 'Koreksi', color: '#14b8a6', bgColor: '#ccfbf1', onPress: () => router.push('/correction' as any) },
    { icon: 'exit-to-app', title: 'Resign', color: '#ef4444', bgColor: '#fee2e2', onPress: () => router.push('/resign') },
    {
      icon: 'place',
      title: 'Visit',
      color: '#ec4899',
      bgColor: '#fce7f3',
      onPress: () => router.push((visitPendingCount && visitPendingCount > 0 ? '/visit?tab=team' : '/visit') as any),
      badgeCount: visitPendingCount && visitPendingCount > 0 ? visitPendingCount : undefined,
    },
  ];

  const hasApprovalAccess = canApprove(role);

  items.push({
    icon: 'assignment-turned-in',
    title: 'Persetujuan',
    color: '#d97706',
    bgColor: '#fef3c7',
    onPress: () => {
      if (hasApprovalAccess) {
        router.push('/approvals');
      } else {
        Alert.alert('Akses Ditolak', 'Kamu tidak memiliki akses untuk fitur ini.');
      }
    },
    badgeCount: hasApprovalAccess && approvalCount && approvalCount > 0 ? approvalCount : undefined,
    disabled: !hasApprovalAccess,
  });

  return items;
}

import { router } from 'expo-router';
import { canApprove } from '../../core/auth/rbac';

export type HomeMenuItem = {
  icon: string;
  title: string;
  onPress: () => void;
  badgeCount?: number;
};

export function buildHomeMenuItems(role?: string | null, approvalCount?: number): HomeMenuItem[] {
  const items: HomeMenuItem[] = [
    { icon: 'event-available', title: 'Izin & Cuti', onPress: () => router.push('/leave') },
    { icon: 'work-history', title: 'Lembur', onPress: () => router.push('/overtime') },
    { icon: 'payments', title: 'Slip Gaji', onPress: () => router.push('/payroll') },
    { icon: 'event', title: 'Absensi', onPress: () => router.push('/attendance') },
    { icon: 'fact-check', title: 'Koreksi', onPress: () => router.push('/correction' as any) },
    { icon: 'exit-to-app', title: 'Resign', onPress: () => router.push('/resign') },
    { icon: 'place', title: 'Visit', onPress: () => router.push('/visit' as any) },
  ];

  if (canApprove(role)) {
    items.push({
      icon: 'assignment-turned-in',
      title: 'Persetujuan',
      onPress: () => router.push('/approvals'),
      badgeCount: approvalCount && approvalCount > 0 ? approvalCount : undefined,
    });
  }

  return items;
}

import { router } from 'expo-router';
import { canApprove } from '../../core/auth/rbac';

export type HomeMenuItem = {
  icon: string;
  title: string;
  onPress: () => void;
};

export function buildHomeMenuItems(role?: string | null): HomeMenuItem[] {
  const items: HomeMenuItem[] = [
    { icon: 'event-available', title: 'Izin & Cuti', onPress: () => router.push('/leave') },
    { icon: 'work-history', title: 'Lembur', onPress: () => router.push('/overtime') },
    { icon: 'payments', title: 'Slip Gaji', onPress: () => router.push('/payroll') },
    { icon: 'event', title: 'Kehadiran', onPress: () => router.push('/attendance') },
    { icon: 'exit-to-app', title: 'Resign', onPress: () => router.push('/resign') },
    { icon: 'place', title: 'Visit', onPress: () => router.push('/visit' as any) },
  ];

  if (canApprove(role)) {
    items.push({ icon: 'assignment-turned-in', title: 'Persetujuan', onPress: () => router.push('/approvals') });
  }

  return items;
}

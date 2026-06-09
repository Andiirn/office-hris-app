import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tokens } from '../../src/core/theme/tokens';
import { attendanceService } from '../../src/services/attendance.service';
import { leaveService } from '../../src/services/leave.service';
import { overtimeService } from '../../src/services/overtime.service';
import { resignService } from '../../src/services/resign.service';
import { canApprove } from '../../src/core/auth/rbac';
import { useAuthStore } from '../../src/stores/auth.store';

type FeedType =
  | 'attendance.checkin'
  | 'attendance.checkout'
  | 'attendance.correction_created'
  | 'overtime.created'
  | 'overtime.approved'
  | 'overtime.rejected'
  | 'overtime.cancelled'
  | 'leave.created'
  | 'leave.approved'
  | 'leave.rejected'
  | 'leave.cancelled'
  | 'leave.document_uploaded'
  | 'resign.created'
  | 'resign.approved'
  | 'resign.rejected'
  | 'resign.cancelled'
  | 'system.info';

type FeedItem = {
  id: string;
  type: FeedType;
  title: string;
  summary: string;
  details: string[];
  timestamp: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  bgColor: string;
  status: string;
  isExpanded: boolean;
};

export default function HomeScreen() {
  const { user, isLoggedIn } = useAuthStore();
  const name = user?.full_name || 'Employee';
  const [now, setNow] = React.useState(new Date());
  const [expandedFeedId, setExpandedFeedId] = React.useState<string | null>(null);

  // Debugging logs to see when user object is available
  React.useEffect(() => {
    console.log('[HomeScreen] Auth State:', {
      isLoggedIn,
      hasUser: !!user,
      userId: user?.id,
      userName: user?.full_name
    });
  }, [isLoggedIn, user]);

  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeText = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateText = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  // 1. Fetch Leave Balance
  const { data: leaveBalances, isLoading: isLoadingLeave, refetch: refetchLeave } = useQuery({
    queryKey: ['leave-balances', user?.id],
    queryFn: async () => {
      console.log('[HomeQuery] Executing Leave fetch for userId:', user?.id);
      if (!user?.id) return [];
      const year = new Date().getFullYear();
      return leaveService.getBalances(user.id, year);
    },
    enabled: !!user?.id,
  });

  const totalRemaining = leaveBalances?.reduce((acc, item) => acc + (item.remaining_days ?? 0), 0) ?? '-';
  const leaveText = isLoadingLeave ? 'Sisa: ...' : `Sisa: ${totalRemaining} Hari`;

  const dateRange = React.useMemo(() => {
    const dateTo = new Date();
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 7);
    return {
      dateFrom: dateFrom.toISOString().slice(0, 10),
      dateTo: dateTo.toISOString().slice(0, 10),
    };
  }, []);

  const { data: attendanceFeed = [], isLoading: isLoadingAttendanceFeed, refetch: refetchAttendanceFeed, isFetching: isFetchingAttendanceFeed } = useQuery({
    queryKey: ['home-attendance-feed', user?.id, dateRange.dateFrom, dateRange.dateTo],
    queryFn: async () => {
      if (!user?.id) return [];
      return attendanceService.getAttendanceHistory({
        employee_id: user.id,
        date_from: dateRange.dateFrom,
        date_to: dateRange.dateTo,
        limit: 20,
        page: 1,
      });
    },
    enabled: !!user?.id,
  });

  const { data: leaveRequests = [], isLoading: isLoadingLeaveFeed, refetch: refetchLeaveFeed, isFetching: isFetchingLeaveFeed } = useQuery({
    queryKey: ['home-leave-feed', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return leaveService.getRequests({ employee_id: user.id, limit: 10 });
    },
    enabled: !!user?.id,
  });

  const { data: overtimeRecords = [], isLoading: isLoadingOvertimeFeed, refetch: refetchOvertimeFeed, isFetching: isFetchingOvertimeFeed } = useQuery({
    queryKey: ['home-overtime-feed', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return overtimeService.getRecords({ employee_id: user.id, limit: 10 });
    },
    enabled: !!user?.id,
  });

  const { data: resignRequests = [], isLoading: isLoadingResignFeed, refetch: refetchResignFeed, isFetching: isFetchingResignFeed } = useQuery({
    queryKey: ['home-resign-feed', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return resignService.getMyRequests({ limit: 10 });
    },
    enabled: !!user?.id,
  });

  const formatTime = (time?: string | null) => {
    if (!time) return '--:--';
    // Handle "HH:mm:ss", "YYYY-MM-DD HH:mm:ss", or ISO "YYYY-MM-DDTHH:mm:ssZ"
    let timeOnly = time;
    if (time.includes(' ')) {
      timeOnly = time.split(' ')[1];
    } else if (time.includes('T')) {
      timeOnly = time.split('T')[1];
    }
    return timeOnly.substring(0, 5);
  };

  const formatDateOnly = (date?: string | null) => {
    if (!date) return '-';
    if (date.includes('T')) return date.split('T')[0];
    if (date.includes(' ')) return date.split(' ')[0];
    return date;
  };

  const onRefresh = () => {
    refetchAttendanceFeed();
    refetchLeave();
    refetchLeaveFeed();
    refetchOvertimeFeed();
    refetchResignFeed();
  };

  const feedItems = React.useMemo(() => {
    const items: FeedItem[] = [];

    attendanceFeed.forEach((item: any) => {
      const attendanceDate = item.attendance_date || item.date || '-';
      const checkinTime = item.checkin_at || item.checkin_time;
      const checkoutTime = item.checkout_at || item.checkout_time;
      const status = item.attendance_status || item.status || 'PRESENT';

      if (checkinTime) {
        items.push({
          id: `${item.id}-checkin`,
          type: 'attendance.checkin',
          title: 'Check-in',
          summary: `${attendanceDate} · ${formatTime(checkinTime)}`,
          details: [`Tanggal: ${attendanceDate}`, `Jam masuk: ${formatTime(checkinTime)}`, `Status: ${status}`],
          timestamp: checkinTime,
          icon: 'login',
          color: '#1f6b42',
          bgColor: '#d9e6da',
          status,
          isExpanded: false,
        });
      }

      if (checkoutTime) {
        items.push({
          id: `${item.id}-checkout`,
          type: 'attendance.checkout',
          title: 'Check-out',
          summary: `${attendanceDate} · ${formatTime(checkoutTime)}`,
          details: [`Tanggal: ${attendanceDate}`, `Jam pulang: ${formatTime(checkoutTime)}`, `Status: ${status}`],
          timestamp: checkoutTime,
          icon: 'logout',
          color: '#93000a',
          bgColor: '#ffdad6',
          status,
          isExpanded: false,
        });
      }
    });

    leaveRequests.forEach((item: any) => {
      items.push({
        id: `leave-${item.id}`,
        type: item.status === 'APPROVED' ? 'leave.approved' : item.status === 'REJECTED' ? 'leave.rejected' : item.status === 'CANCELLED' ? 'leave.cancelled' : 'leave.created',
        title:
          item.status === 'APPROVED' ? 'Cuti disetujui' :
            item.status === 'REJECTED' ? 'Cuti ditolak' :
              item.status === 'CANCELLED' ? 'Cuti dibatalkan' :
                'Pengajuan cuti dibuat',
        summary: `${item.leave_type_name || 'Cuti'} · ${formatDateOnly(item.start_date)}${item.end_date ? ` - ${formatDateOnly(item.end_date)}` : ''}`,
        details: [
          `Jenis cuti: ${item.leave_type_name || '-'}`,
          `Tanggal: ${formatDateOnly(item.start_date)}${item.end_date ? ` - ${formatDateOnly(item.end_date)}` : ''}`,
          `Alasan: ${item.reason || '-'}`,
        ],
        timestamp: item.created_at || item.start_date,
        icon: item.status === 'APPROVED' ? 'check-circle' : item.status === 'REJECTED' ? 'cancel' : item.status === 'CANCELLED' ? 'cancel' : 'event-available',
        color: item.status === 'APPROVED' ? '#1f6b42' : item.status === 'REJECTED' ? '#93000a' : '#000666',
        bgColor: item.status === 'APPROVED' ? '#d9e6da' : item.status === 'REJECTED' ? '#ffdad6' : '#e7ebff',
        status: item.status || 'PENDING',
        isExpanded: false,
      });
    });

    overtimeRecords.forEach((item: any) => {
      items.push({
        id: `overtime-${item.id}`,
        type: item.status === 'APPROVED' ? 'overtime.approved' : item.status === 'REJECTED' ? 'overtime.rejected' : item.status === 'CANCELLED' ? 'overtime.cancelled' : 'overtime.created',
        title:
          item.status === 'APPROVED' ? 'Lembur disetujui' :
            item.status === 'REJECTED' ? 'Lembur ditolak' :
              item.status === 'CANCELLED' ? 'Lembur dibatalkan' :
                'Pengajuan lembur dibuat',
        summary: `${item.overtime_date || item.attendance_date || '-'} · ${item.overtime_hours ?? item.overtime_minutes ?? '-'} jam`,
        details: [
          `Tanggal: ${item.overtime_date || item.attendance_date || '-'}`,
          `Durasi: ${item.overtime_hours ?? item.overtime_minutes ?? '-'} jam`,
          `Alasan: ${item.reason || '-'}`,
        ],
        timestamp: item.created_at || item.overtime_date || item.attendance_date || '',
        icon: item.status === 'APPROVED' ? 'check-circle' : item.status === 'REJECTED' ? 'cancel' : item.status === 'CANCELLED' ? 'cancel' : 'work-history',
        color: item.status === 'APPROVED' ? '#1f6b42' : item.status === 'REJECTED' ? '#93000a' : '#000666',
        bgColor: item.status === 'APPROVED' ? '#d9e6da' : item.status === 'REJECTED' ? '#ffdad6' : '#e7ebff',
        status: item.status || 'PENDING',
        isExpanded: false,
      });
    });

    resignRequests.forEach((item: any) => {
      items.push({
        id: `resign-${item.id}`,
        type: item.status === 'APPROVED' ? 'resign.approved' : item.status === 'REJECTED' ? 'resign.rejected' : item.status === 'CANCELLED' ? 'resign.cancelled' : 'resign.created',
        title:
          item.status === 'APPROVED' ? 'Resign disetujui' :
            item.status === 'REJECTED' ? 'Resign ditolak' :
              item.status === 'CANCELLED' ? 'Resign dibatalkan' :
                'Pengajuan resign dibuat',
        summary: `${item.resign_date || '-'} · ${item.reason || '-'}`,
        details: [
          `Tanggal resign: ${item.resign_date || '-'}`,
          `Alasan: ${item.reason || '-'}`,
        ],
        timestamp: item.created_at || item.resign_date || '',
        icon: item.status === 'APPROVED' ? 'check-circle' : item.status === 'REJECTED' ? 'cancel' : item.status === 'CANCELLED' ? 'cancel' : 'exit-to-app',
        color: item.status === 'APPROVED' ? '#1f6b42' : item.status === 'REJECTED' ? '#93000a' : '#000666',
        bgColor: item.status === 'APPROVED' ? '#d9e6da' : item.status === 'REJECTED' ? '#ffdad6' : '#e7ebff',
        status: item.status || 'PENDING',
        isExpanded: false,
      });
    });

    return items
      .sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime() || 0;
        const dateB = new Date(b.timestamp).getTime() || 0;
        return dateB - dateA;
      })
      .slice(0, 8)
      .map((item) => ({ ...item, isExpanded: item.id === expandedFeedId }));
  }, [attendanceFeed, expandedFeedId, leaveRequests, overtimeRecords, resignRequests]);

  const latestAttendance = attendanceFeed[0];
  const isClockedIn = !!(latestAttendance?.checkin_time || latestAttendance?.checkin_at) && !(latestAttendance?.checkout_time || latestAttendance?.checkout_at) && (latestAttendance?.attendance_date || latestAttendance?.date) === new Date().toISOString().slice(0, 10);

  const menuItems = React.useMemo(() => {
    const isManager = canApprove(user?.role);
    const base = [
      { icon: 'event-available', title: 'Izin & Cuti', onPress: () => router.push('/leave') },
      { icon: 'work-history', title: 'Lembur', onPress: () => router.push('/overtime') },
      { icon: 'payments', title: 'Slip Gaji', onPress: () => router.push('/payroll') },
      { icon: 'event', title: 'Kehadiran', onPress: () => router.push('/attendance') },
      { icon: 'exit-to-app', title: 'Resign', onPress: () => router.push('/resign') },
    ];
    if (isManager) {
      base.push({ icon: 'assignment-turned-in', title: 'Persetujuan', onPress: () => router.push('/approvals') });
    }
    return base;
  }, [user]);

  const menuColumns = React.useMemo(() => {
    const columns: typeof menuItems[] = [];
    for (let i = 0; i < menuItems.length; i += 2) {
      columns.push(menuItems.slice(i, i + 2));
    }
    return columns;
  }, [menuItems]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Fixed Sticky Header Card */}
      <View className="px-5 pt-3 pb-1 bg-background z-20">
        <View className="bg-white/80 rounded-2xl p-3.5 flex-row justify-between items-center border border-white/90 shadow-sm">
          <View>
            <Text className="font-manrope-bold text-sm text-primary">{name}</Text>
            <Text className="font-inter text-[11px] text-text-muted mt-0.5">{user?.position_name || '-'}</Text>
          </View>
          <View className={`rounded-full px-2.5 py-1 ${isClockedIn ? 'bg-secondary-container' : 'bg-error-container'}`}>
            <Text className={`font-inter-bold text-[10px] ${isClockedIn ? 'text-on-secondary-container' : 'text-on-error-container'}`}>
              {isClockedIn ? 'Sudah Absen' : 'Belum Absen'}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-1" style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <View className="items-center pt-2">
          <Text className="font-manrope-extrabold text-5xl text-primary leading-[52px]">{timeText}</Text>
          <Text className="font-inter-medium text-base text-text-muted mt-1 mb-3.5">{dateText}</Text>
          <Pressable
            className="w-[148px] h-[148px] rounded-full bg-primary-container items-center justify-center gap-1.5 shadow-lg shadow-black/10 elevation-6"
            onPress={() => router.push('/attendance-scan')}
          >
            <MaterialIcons name="qr-code-scanner" size={34} color="#fff" />
            <Text className="font-inter-bold text-[12px] text-white">Scan QR Code</Text>
          </Pressable>
        </View>

        <View className="h-[168px] mt-[18px] mb-1">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 8 }}
          >
            <View className="flex-row">
              {menuColumns.map((column, columnIndex) => (
                <View
                  key={`menu-col-${columnIndex}`}
                  className="mr-3 justify-between"
                >
                  {column.map((item) => (
                    <Pressable
                      key={item.title}
                      className="w-[112px] bg-transparent rounded-2xl px-2 py-2 mb-4"
                      onPress={item.onPress}
                    >
                      <View className="items-center justify-center">
                        <View className="w-11 h-11 rounded-2xl bg-primary/10 items-center justify-center">
                          <MaterialIcons name={item.icon as any} size={24} color={Tokens.colors.primary} />
                        </View>
                        <Text className="font-inter-bold text-[12px] text-on-surface text-center mt-2">
                          {item.title}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <View className="mt-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="font-manrope-bold text-base text-primary">Aktivitas Terbaru</Text>
            <Pressable onPress={() => router.push('/notifications')}>
              <Text className="font-inter-semibold text-[12px] text-primary-container">View All</Text>
            </Pressable>
          </View>

          <View className="h-[360px] rounded-2xl bg-white/45 border border-white/70 overflow-hidden">
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 12, paddingBottom: 18 }}
              showsVerticalScrollIndicator={false}
              refreshControl={
              <RefreshControl
                refreshing={isFetchingAttendanceFeed || isFetchingLeaveFeed || isFetchingOvertimeFeed || isFetchingResignFeed}
                onRefresh={onRefresh}
                tintColor={Tokens.colors.primary}
              />
            }
          >
              {isLoadingAttendanceFeed || isLoadingLeaveFeed || isLoadingOvertimeFeed || isLoadingResignFeed ? (
                <ActivityIndicator size="small" color={Tokens.colors.primary} className="mt-5" />
              ) : feedItems.length === 0 ? (
                <View className="items-center py-5">
                  <Text className="font-inter text-[13px] text-text-muted">No recent activities</Text>
                </View>
              ) : (
                <View className="gap-2">
                  {feedItems.map((item) => (
                    <Pressable
                      key={item.id}
                      className="bg-white/80 rounded-xl px-3 py-2.5 border border-white/90 shadow-sm"
                      onPress={() => setExpandedFeedId((current) => (current === item.id ? null : item.id))}
                    >
                      <View className="flex-row items-start justify-between gap-2">
                        <View className="w-10 h-10 rounded-2xl items-center justify-center mr-1" style={{ backgroundColor: item.bgColor }}>
                          <MaterialIcons name={item.icon} size={18} color={item.color} />
                        </View>

                        <View className="flex-1">
                          <View className="flex-row items-center justify-between gap-2">
                            <Text className="font-inter-bold text-[12px] text-on-surface flex-1" numberOfLines={1}>
                              {item.title}
                            </Text>
                            <View className="bg-primary/5 px-2 py-0.5 rounded-md">
                              <Text className="font-inter-bold text-[8px] text-primary uppercase tracking-wider">
                                {item.status}
                              </Text>
                            </View>
                          </View>
                          <Text className="font-inter text-[10px] text-text-muted mt-0.5" numberOfLines={1}>
                            {item.summary}
                          </Text>

                          {item.isExpanded ? (
                            <View className="mt-2 gap-1">
                              {item.details.filter(Boolean).map((detail) => (
                                <Text key={detail} className="font-inter text-[10px] text-on-surface-variant">
                                  {detail}
                                </Text>
                              ))}
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

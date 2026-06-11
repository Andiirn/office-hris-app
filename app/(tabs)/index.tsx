import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Skeleton } from '../../src/components/ui/Skeleton';
import { Tokens } from '../../src/core/theme/tokens';
import { buildHomeMenuItems } from '../../src/features/home/home-menu';
import { approvalService } from '../../src/services/approval.service';
import { attendanceService } from '../../src/services/attendance.service';
import { leaveService } from '../../src/services/leave.service';
import { overtimeService } from '../../src/services/overtime.service';
import { resignService } from '../../src/services/resign.service';
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
  sortTime: number;
  sortRank: number;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  bgColor: string;
  status: string;
  isExpanded: boolean;
};

type MenuItem = {
  icon: string;
  title: string;
  onPress: () => void;
  badgeCount?: number;
};

type MenuSlot = MenuItem | null;

export default function HomeScreen() {
  const { user, isLoggedIn } = useAuthStore();
  const { width: windowWidth } = useWindowDimensions();
  const name = user?.full_name || 'Employee';
  const [expandedFeedId, setExpandedFeedId] = React.useState<string | null>(null);

  // 1. Fetch Data locally
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
    queryKey: ['attendance-history', user?.id, dateRange.dateFrom, dateRange.dateTo],
    queryFn: () => {
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
    queryKey: ['leave-requests', user?.id],
    queryFn: () => {
      if (!user?.id) return [];
      return leaveService.getRequests({ employee_id: user.id, limit: 10 });
    },
    enabled: !!user?.id,
  });

  const { data: overtimeRecords = [], isLoading: isLoadingOvertimeFeed, refetch: refetchOvertimeFeed, isFetching: isFetchingOvertimeFeed } = useQuery({
    queryKey: ['overtime-records', user?.id],
    queryFn: () => {
      if (!user?.id) return [];
      return overtimeService.getRecords({ employee_id: user.id, limit: 10 });
    },
    enabled: !!user?.id,
  });

  const { data: resignRequests = [], isLoading: isLoadingResignFeed, refetch: refetchResignFeed, isFetching: isFetchingResignFeed } = useQuery({
    queryKey: ['resign-requests', user?.id],
    queryFn: () => {
      if (!user?.id) return [];
      return resignService.getMyRequests({ limit: 10 });
    },
    enabled: !!user?.id,
  });

  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ['home-approvals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return approvalService.getPending({ limit: 50 });
    },
    enabled: !!user?.id && !!user?.role && user.role !== 'employee',
    staleTime: 30 * 1000,
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

  const getLeaveTypeLabel = (item: any) => item.leave_type_name || item.leave_type?.name || item.leave_type?.code || 'Cuti';

  const toSortTime = (value?: string | null) => {
    if (!value) return 0;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getFeedSortRank = (item: FeedItem) => {
    if (item.type === 'overtime.created') return 4;
    if (item.type === 'leave.created') return 3;
    if (item.type === 'attendance.checkout') return 2;
    if (item.type === 'attendance.checkin') return 1;
    return 0;
  };

  const getOvertimeStatus = (item: any) => {
    const rawStatus = String(item?.status || item?.overtime_status || '').toUpperCase();
    if (rawStatus === 'APPROVED' || item?.is_approved || item?.approved_at) return 'APPROVED';
    if (rawStatus === 'REJECTED' || rawStatus === 'DECLINED') return 'REJECTED';
    if (rawStatus === 'CANCELLED') return 'CANCELLED';
    return 'PENDING';
  };

  const onRefresh = () => {
    refetchAttendanceFeed();
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
      const rawStatus = item.attendance_status || item.status || 'PRESENT';
      const statusUpper = rawStatus.toUpperCase();
      const status = statusUpper === 'PRESENT' ? 'HADIR' : statusUpper === 'LATE' ? 'TERLAMBAT' : statusUpper === 'ABSENT' ? 'TIDAK HADIR' : rawStatus;

      if (checkinTime) {
        items.push({
          id: `${item.id}-checkin`,
          type: 'attendance.checkin',
          title: 'Check-in',
          summary: `${attendanceDate} · ${formatTime(checkinTime)}`,
          details: [`Tanggal: ${attendanceDate}`, `Jam masuk: ${formatTime(checkinTime)}`, `Status: ${status}`],
          timestamp: checkinTime,
          sortTime: toSortTime(checkinTime),
          sortRank: 1,
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
          sortTime: toSortTime(checkoutTime),
          sortRank: 2,
          icon: 'logout',
          color: '#93000a',
          bgColor: '#ffdad6',
          status,
          isExpanded: false,
        });
      }
    });

    leaveRequests.forEach((item: any) => {
      const leaveTypeLabel = getLeaveTypeLabel(item);
      const isHourlyLeave = /jam|hour/i.test(`${leaveTypeLabel} ${item.leave_type?.code || ''} ${item.leave_type?.category || ''}`);
      const timeRange = item.start_time && item.end_time ? ` · ${item.start_time.slice(0, 5)} - ${item.end_time.slice(0, 5)}` : '';

      items.push({
        id: `leave-${item.id}`,
        type: item.status === 'APPROVED' ? 'leave.approved' : item.status === 'REJECTED' ? 'leave.rejected' : item.status === 'CANCELLED' ? 'leave.cancelled' : 'leave.created',
        title:
          item.status === 'APPROVED' ? 'Cuti disetujui' :
            item.status === 'REJECTED' ? 'Cuti ditolak' :
              item.status === 'CANCELLED' ? 'Cuti dibatalkan' :
                'Pengajuan cuti dibuat',
        summary: `${leaveTypeLabel} · ${formatDateOnly(item.start_date)}${item.end_date ? ` - ${formatDateOnly(item.end_date)}` : ''}${timeRange}`,
        details: [
          `Jenis cuti: ${leaveTypeLabel}`,
          `Tanggal: ${formatDateOnly(item.start_date)}${item.end_date ? ` - ${formatDateOnly(item.end_date)}` : ''}`,
          ...(isHourlyLeave ? [`Jam: ${item.start_time?.slice(0, 5) || '--:--'} - ${item.end_time?.slice(0, 5) || '--:--'}`] : []),
          `Alasan: ${item.reason || '-'}`,
        ],
        timestamp: item.created_at || item.start_date,
        sortTime: toSortTime(item.created_at) || toSortTime(item.updated_at) || toSortTime(item.start_time) || toSortTime(item.end_time) || toSortTime(item.start_date),
        sortRank: 3,
        icon: item.status === 'APPROVED' ? 'check-circle' : item.status === 'REJECTED' ? 'cancel' : item.status === 'CANCELLED' ? 'cancel' : 'event-available',
        color: item.status === 'APPROVED' ? '#1f6b42' : item.status === 'REJECTED' ? '#93000a' : '#000666',
        bgColor: item.status === 'APPROVED' ? '#d9e6da' : item.status === 'REJECTED' ? '#ffdad6' : '#e7ebff',
        status: item.status || 'PENDING',
        isExpanded: false,
      });
    });

    overtimeRecords.forEach((item: any) => {
      const status = getOvertimeStatus(item);
      items.push({
        id: `overtime-${item.id}`,
        type: status === 'APPROVED' ? 'overtime.approved' : status === 'REJECTED' ? 'overtime.rejected' : status === 'CANCELLED' ? 'overtime.cancelled' : 'overtime.created',
        title:
          status === 'APPROVED' ? 'Lembur disetujui' :
            status === 'REJECTED' ? 'Lembur ditolak' :
              status === 'CANCELLED' ? 'Lembur dibatalkan' :
                'Pengajuan lembur dibuat',
        summary: `${item.overtime_date || item.attendance_date || '-'} · ${item.overtime_hours ?? item.overtime_minutes ?? '-'} jam`,
        details: [
          `Tanggal: ${item.overtime_date || item.attendance_date || '-'}`,
          `Durasi: ${item.overtime_hours ?? item.overtime_minutes ?? '-'} jam`,
          `Alasan: ${item.reason || '-'}`,
        ],
        timestamp: item.created_at || item.overtime_date || item.attendance_date || '',
        sortTime: toSortTime(item.created_at) || toSortTime(item.approved_at) || toSortTime(item.end_time) || toSortTime(item.start_time) || toSortTime(item.overtime_date) || toSortTime(item.attendance_date),
        sortRank: 4,
        icon: status === 'APPROVED' ? 'check-circle' : status === 'REJECTED' ? 'cancel' : status === 'CANCELLED' ? 'cancel' : 'work-history',
        color: status === 'APPROVED' ? '#1f6b42' : status === 'REJECTED' ? '#93000a' : '#000666',
        bgColor: status === 'APPROVED' ? '#d9e6da' : status === 'REJECTED' ? '#ffdad6' : '#e7ebff',
        status,
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
        sortTime: toSortTime(item.created_at) || toSortTime(item.updated_at) || toSortTime(item.resign_date),
        sortRank: 0,
        icon: item.status === 'APPROVED' ? 'check-circle' : item.status === 'REJECTED' ? 'cancel' : item.status === 'CANCELLED' ? 'cancel' : 'exit-to-app',
        color: item.status === 'APPROVED' ? '#1f6b42' : item.status === 'REJECTED' ? '#93000a' : '#000666',
        bgColor: item.status === 'APPROVED' ? '#d9e6da' : item.status === 'REJECTED' ? '#ffdad6' : '#e7ebff',
        status: item.status || 'PENDING',
        isExpanded: false,
      });
    });

    return items
      .sort((a, b) => {
        const dateA = a.sortTime || 0;
        const dateB = b.sortTime || 0;
        if (dateB !== dateA) return dateB - dateA;
        return getFeedSortRank(b) - getFeedSortRank(a);
      })
      .slice(0, 8)
      .map((item) => ({ ...item, isExpanded: item.id === expandedFeedId }));
  }, [attendanceFeed, expandedFeedId, leaveRequests, overtimeRecords, resignRequests]);

  const latestAttendance = attendanceFeed[0];
  const todayString = new Date().toISOString().slice(0, 10);
  const latestAttendanceDate = latestAttendance?.attendance_date || latestAttendance?.date;
  const hasCheckIn = !!(latestAttendance?.checkin_time || latestAttendance?.checkin_at);
  const hasCheckOut = !!(latestAttendance?.checkout_time || latestAttendance?.checkout_at);
  const isTodayAttendance = latestAttendanceDate === todayString;
  const isClockedIn = hasCheckIn && !hasCheckOut && isTodayAttendance;
  const isClockedOut = hasCheckOut && isTodayAttendance;
  const attendanceChipText = isClockedIn
    ? 'Masuk. Selamat bekerja.'
    : isClockedOut
      ? 'Keluar. Selamat istirahat.'
      : 'Belum absen hari ini.';
  const attendanceChipTextClass = isClockedIn
    ? 'text-primary'
    : isClockedOut
      ? 'text-primary'
      : 'text-error';

  const menuItems = React.useMemo<MenuItem[]>(() => buildHomeMenuItems(user?.role, pendingApprovals.length), [user?.role, pendingApprovals.length]);
  const menuColumns = React.useMemo(() => {
    const paddedItems: MenuSlot[] = [...menuItems];
    if (paddedItems.length % 2 !== 0) {
      paddedItems.push(null);
    }

    while (paddedItems.length < 8) {
      paddedItems.push(null);
    }

    const columns: MenuSlot[][] = [];
    for (let i = 0; i < paddedItems.length; i += 2) {
      columns.push(paddedItems.slice(i, i + 2));
    }
    return columns;
  }, [menuItems]);
  const visibleMenuColumns = 4;
  const menuGap = 12;
  const menuSidePadding = 20;
  const menuColumnWidth = Math.floor((windowWidth - (menuSidePadding * 2) - (menuGap * (visibleMenuColumns - 1))) / visibleMenuColumns);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Fixed Sticky Header Card */}
      <View className="px-5 pt-3 pb-1 bg-background z-20">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 pr-2">
            <Text className="font-inter-bold text-[10px] text-text-muted uppercase tracking-[0.25em] mb-1.5">
              Halo
            </Text>
            <Text className="font-manrope-extrabold text-[20px] text-primary leading-7" numberOfLines={1}>
              {name}
            </Text>
            <Text className="font-inter text-[12px] text-text-muted mt-1.5" numberOfLines={1}>
              {user?.position_name || 'Employee'}
            </Text>
          </View>
          <View className="max-w-[118px] px-0 py-0">
            <View className="flex-row items-center gap-1.5 mb-1">
              <View className={`w-2 h-2 rounded-full ${isClockedIn ? 'bg-secondary' : isClockedOut ? 'bg-primary' : 'bg-error'}`} />
              <Text className={`font-inter-bold text-[9px] uppercase tracking-wider ${attendanceChipTextClass}`}>
                Status
              </Text>
            </View>
            <Text
              className={`font-inter-bold text-[10px] leading-4 ${attendanceChipTextClass}`}
              numberOfLines={2}
            >
              {attendanceChipText}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-1" style={{ paddingHorizontal: 20, paddingTop: 10 }}>
        <View className="items-center">
          <Pressable
            className="w-[150px] h-[150px] rounded-full bg-primary-container items-center justify-center gap-1.5 shadow-lg shadow-black/10 elevation-6"
            onPress={() => router.push('/attendance-scan')}
          >
            <View className="w-[30px] h-[30px] rounded-full bg-white/15 items-center justify-center">
              <MaterialIcons name="qr-code-scanner" size={30} color="#fff" />
            </View>
            <Text className="font-inter-bold text-[12px] text-white">Scan QR Code</Text>
          </Pressable>
          <Text className="font-inter text-[10px] text-text-muted mt-2">
            Tap untuk mulai absensi
          </Text>
        </View>

        <View className="h-[196px] mt-[18px] mb-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 8, paddingRight: 4 }}
          >
            <View className="flex-row items-stretch">
              {menuColumns.map((column, columnIndex) => (
                <View
                  key={`menu-col-${columnIndex}`}
                  className="justify-between"
                  style={{ width: menuColumnWidth, marginRight: columnIndex === menuColumns.length - 1 ? 0 : menuGap }}
                >
                  {column.map((item, itemIndex) => (
                    item ? (
                      <Pressable
                        key={item.title}
                        className="relative rounded-2xl bg-white/80 border border-white/80 px-2.5 py-2.5 mb-3 shadow-sm"
                        style={{ width: menuColumnWidth }}
                        onPress={item.onPress}
                      >
                        <View className="items-center justify-center gap-1">
                          {item.badgeCount ? (
                            <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-error items-center justify-center px-1.5 z-20">
                              <Text className="font-inter-bold text-[10px] text-white leading-[18px]">
                                {item.badgeCount > 9 ? '9+' : item.badgeCount}
                              </Text>
                            </View>
                          ) : null}
                          <View className="w-9 h-9 rounded-2xl bg-primary/10 items-center justify-center">
                            <MaterialIcons name={item.icon as any} size={20} color={Tokens.colors.primary} />
                          </View>
                          <Text
                            className="font-inter-bold text-[10px] text-on-surface text-center leading-3"
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.85}
                          >
                            {item.title}
                          </Text>
                        </View>
                      </Pressable>
                    ) : (
                      <View
                        key={`menu-empty-${columnIndex}-${itemIndex}`}
                        className="rounded-2xl bg-transparent border border-transparent px-2.5 py-2.5 mb-3"
                        style={{ width: menuColumnWidth }}
                      />
                    )
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <View className="mt-3">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="font-manrope-bold text-base text-primary">Aktivitas Terbaru</Text>
            <Pressable onPress={() => router.push('/activity')}>
              <Text className="font-inter-semibold text-[12px] text-primary-container">View All</Text>
            </Pressable>
          </View>

          <View className="h-[360px] rounded-2xl bg-white/45 border border-white/70 overflow-hidden">
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 12, paddingBottom: 18 }}
              nestedScrollEnabled
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
                <View className="gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <View key={i} className="bg-white/80 rounded-xl px-3 py-2.5 border border-white/90 shadow-sm flex-row items-center gap-3">
                      <Skeleton width={40} height={40} radius={16} />
                      <View className="flex-1 gap-2">
                        <Skeleton width="50%" height={12} radius={9999} />
                        <Skeleton width="75%" height={8} radius={9999} />
                      </View>
                    </View>
                  ))}
                </View>
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
                            <ScrollView
                              className="mt-2"
                              style={{ maxHeight: 88 }}
                              nestedScrollEnabled
                              showsVerticalScrollIndicator={false}
                            >
                              <View className="gap-1 pr-1">
                                {item.details.filter(Boolean).map((detail) => (
                                  <Text key={detail} className="font-inter text-[10px] text-on-surface-variant">
                                    {detail}
                                  </Text>
                                ))}
                              </View>
                            </ScrollView>
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

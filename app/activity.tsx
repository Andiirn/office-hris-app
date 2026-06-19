import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Tokens } from '../src/core/theme/tokens';
import { attendanceService } from '../src/services/attendance.service';
import { leaveService } from '../src/services/leave.service';
import { overtimeService } from '../src/services/overtime.service';
import { resignService } from '../src/services/resign.service';
import { useAuthStore } from '../src/stores/auth.store';
import { getAttendanceBadgeProps } from '../src/utils/status';

type FeedType =
  | 'attendance.checkin'
  | 'attendance.checkout'
  | 'leave.created'
  | 'leave.approved'
  | 'leave.rejected'
  | 'leave.cancelled'
  | 'overtime.created'
  | 'overtime.approved'
  | 'overtime.rejected'
  | 'overtime.cancelled'
  | 'resign.created'
  | 'resign.approved'
  | 'resign.rejected'
  | 'resign.cancelled';

type FeedItem = {
  id: string;
  type: FeedType;
  title: string;
  summary: string;
  timestamp: string;
  sortTime: number;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  bgColor: string;
  details?: string[];
  isExpanded?: boolean;
};

export default function ActivityScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const dateRange = React.useMemo(() => {
    const dateTo = new Date();
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);
    return {
      dateFrom: dateFrom.toISOString().slice(0, 10),
      dateTo: dateTo.toISOString().slice(0, 10),
    };
  }, []);

  const { data: attendanceFeed = [], isLoading: isLoadingAttendance, refetch: refetchAttendance, isFetching: isFetchingAttendance } = useQuery({
    queryKey: ['activity-attendance-feed', user?.id, dateRange.dateFrom, dateRange.dateTo],
    queryFn: async () => {
      if (!user?.id) return [];
      return attendanceService.getAttendanceHistory({
        employee_id: user.id,
        date_from: dateRange.dateFrom,
        date_to: dateRange.dateTo,
        limit: 50,
        page: 1,
      });
    },
    enabled: !!user?.id,
  });

  const { data: leaveRequests = [], isLoading: isLoadingLeave, refetch: refetchLeave, isFetching: isFetchingLeave } = useQuery({
    queryKey: ['activity-leave-feed', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return leaveService.getRequests({ employee_id: user.id, limit: 50 });
    },
    enabled: !!user?.id,
  });

  const { data: overtimeRecords = [], isLoading: isLoadingOvertime, refetch: refetchOvertime, isFetching: isFetchingOvertime } = useQuery({
    queryKey: ['activity-overtime-feed', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return overtimeService.getRecords({ employee_id: user.id, limit: 50 });
    },
    enabled: !!user?.id,
  });

  const { data: resignRequests = [], isLoading: isLoadingResign, refetch: refetchResign, isFetching: isFetchingResign } = useQuery({
    queryKey: ['activity-resign-feed', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return resignService.getMyRequests({ limit: 50 });
    },
    enabled: !!user?.id,
  });

  const formatTime = (time?: string | null) => {
    if (!time) return '--:--';
    const timeOnly = time.includes(' ') ? time.split(' ')[1] : time.includes('T') ? time.split('T')[1] : time;
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

  const getOvertimeStatus = (item: any) => {
    const rawStatus = String(item?.status || item?.overtime_status || '').toUpperCase();
    if (rawStatus === 'APPROVED' || item?.is_approved || item?.approved_at) return 'APPROVED';
    if (rawStatus === 'REJECTED' || rawStatus === 'DECLINED') return 'REJECTED';
    if (rawStatus === 'CANCELLED') return 'CANCELLED';
    return 'PENDING';
  };

  const onRefresh = () => {
    refetchAttendance();
    refetchLeave();
    refetchOvertime();
    refetchResign();
  };

  const feedItems = React.useMemo(() => {
    const items: FeedItem[] = [];

    attendanceFeed.forEach((item: any) => {
      const attendanceDate = item.attendance_date || item.date || '-';
      const checkinTime = item.checkin_at || item.checkin_time;
      const checkoutTime = item.checkout_at || item.checkout_time;
      const badgeProps = getAttendanceBadgeProps(item.attendance_status || item.status);
      const status = badgeProps.label;

      if (checkinTime) {
        items.push({
          id: `${item.id}-checkin`,
          type: 'attendance.checkin',
          title: 'Check-in',
          summary: `${attendanceDate} · ${formatTime(checkinTime)} · ${status}`,
          timestamp: checkinTime,
          sortTime: toSortTime(checkinTime),
          icon: 'login',
          color: '#1f6b42',
          bgColor: '#d9e6da',
        });
      }

      if (checkoutTime) {
        items.push({
          id: `${item.id}-checkout`,
          type: 'attendance.checkout',
          title: 'Check-out',
          summary: `${attendanceDate} · ${formatTime(checkoutTime)} · ${status}`,
          timestamp: checkoutTime,
          sortTime: toSortTime(checkoutTime),
          icon: 'logout',
          color: '#93000a',
          bgColor: '#ffdad6',
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
        icon: item.status === 'APPROVED' ? 'check-circle' : item.status === 'REJECTED' ? 'cancel' : item.status === 'CANCELLED' ? 'cancel' : 'event-available',
        color: item.status === 'APPROVED' ? '#1f6b42' : item.status === 'REJECTED' ? '#93000a' : '#000666',
        bgColor: item.status === 'APPROVED' ? '#d9e6da' : item.status === 'REJECTED' ? '#ffdad6' : '#e7ebff',
      });
    });

    overtimeRecords.forEach((item: any) => {
      const status = getOvertimeStatus(item);
      items.push({
        id: `overtime-${item.id}`,
        type: status === 'APPROVED' ? 'overtime.approved' : status === 'REJECTED' ? 'overtime.rejected' : status === 'CANCELLED' ? 'overtime.cancelled' : 'overtime.created',
        title: `Lembur ${status.toLowerCase()}`,
        summary: `${item.overtime_date || item.attendance_date || '-'} · ${item.overtime_hours ?? item.overtime_minutes ?? '-'} jam`,
        timestamp: item.created_at || item.overtime_date || item.attendance_date || '',
        sortTime: toSortTime(item.created_at) || toSortTime(item.approved_at) || toSortTime(item.end_time) || toSortTime(item.start_time) || toSortTime(item.overtime_date) || toSortTime(item.attendance_date),
        icon: status === 'APPROVED' ? 'check-circle' : status === 'REJECTED' ? 'cancel' : status === 'CANCELLED' ? 'cancel' : 'work-history',
        color: status === 'APPROVED' ? '#1f6b42' : status === 'REJECTED' ? '#93000a' : '#000666',
        bgColor: status === 'APPROVED' ? '#d9e6da' : status === 'REJECTED' ? '#ffdad6' : '#e7ebff',
      });
    });

    resignRequests.forEach((item: any) => {
      items.push({
        id: `resign-${item.id}`,
        type: item.status === 'APPROVED' ? 'resign.approved' : item.status === 'REJECTED' ? 'resign.rejected' : item.status === 'CANCELLED' ? 'resign.cancelled' : 'resign.created',
        title: `Resign ${item.status?.toLowerCase?.() || 'created'}`,
        summary: `${item.resign_date || '-'} · ${item.reason || '-'}`,
        timestamp: item.created_at || item.resign_date || '',
        sortTime: toSortTime(item.created_at) || toSortTime(item.updated_at) || toSortTime(item.resign_date),
        icon: item.status === 'APPROVED' ? 'check-circle' : item.status === 'REJECTED' ? 'cancel' : item.status === 'CANCELLED' ? 'cancel' : 'exit-to-app',
        color: item.status === 'APPROVED' ? '#1f6b42' : item.status === 'REJECTED' ? '#93000a' : '#000666',
        bgColor: item.status === 'APPROVED' ? '#d9e6da' : item.status === 'REJECTED' ? '#ffdad6' : '#e7ebff',
      });
    });

    return items.sort((a, b) => {
      const dateA = a.sortTime || 0;
      const dateB = b.sortTime || 0;
      return dateB - dateA;
    });
  }, [attendanceFeed, leaveRequests, overtimeRecords, resignRequests]);

  const isLoading = isLoadingAttendance || isLoadingLeave || isLoadingOvertime || isLoadingResign;
  const isRefreshing = isFetchingAttendance || isFetchingLeave || isFetchingOvertime || isFetchingResign;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-2 pb-4">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm active:opacity-60"
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <MaterialIcons name="arrow-back" size={22} color={Tokens.colors.primary} />
          </Pressable>
          <View className="flex-1">
            <Text className="font-manrope-extrabold text-3xl text-primary">Aktivitas</Text>
            <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Semua aktivitas terbaru dalam satu layar</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Tokens.colors.primary} />}
      >
        {isLoading ? (
          <View className="items-center py-10">
            <ActivityIndicator size="small" color={Tokens.colors.primary} />
          </View>
        ) : feedItems.length === 0 ? (
          <View className="items-center py-20">
            <MaterialIcons name="event-note" size={64} color={Tokens.colors.outline} />
            <Text className="font-manrope-bold text-lg text-primary mt-4">Belum ada aktivitas</Text>
            <Text className="font-inter text-sm text-text-muted text-center mt-2">Aktivitas akan muncul di sini ketika ada riwayat baru.</Text>
          </View>
        ) : (
          <View className="gap-3">
            {feedItems.map((item) => (
              <Pressable
                key={item.id}
                className="bg-white/80 rounded-xl px-3 py-3 border border-white/90 shadow-sm"
                onPress={() => setExpandedId((current) => (current === item.id ? null : item.id))}
              >
                <View className="flex-row items-start justify-between gap-2">
                  <View className="w-10 h-10 rounded-2xl items-center justify-center mr-1" style={{ backgroundColor: item.bgColor }}>
                    <MaterialIcons name={item.icon} size={18} color={item.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-inter-bold text-[13px] text-on-surface" numberOfLines={1}>{item.title}</Text>
                    <Text className="font-inter text-[10px] text-text-muted mt-0.5" numberOfLines={1}>{item.summary}</Text>
                    {expandedId === item.id ? (
                      <ScrollView
                        className="mt-2"
                        style={{ maxHeight: 88 }}
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={false}
                      >
                        <View className="gap-1 pr-1">
                          <Text className="font-inter text-[10px] text-on-surface-variant">
                            Tipe: {item.type}
                          </Text>
                          {(item.details || []).filter(Boolean).map((detail: string) => (
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
    </SafeAreaView>
  );
}

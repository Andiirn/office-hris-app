import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { Tokens } from '../src/core/theme/tokens';
import { qk } from '../src/core/query/query-keys';
import { buildApprovalActivityItems } from '../src/features/activity/approval-activity';
import { approvalService } from '../src/services/approval.service';
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
  | 'approval.approved'
  | 'approval.rejected'
  | 'overtime.created'
  | 'overtime.approved'
  | 'overtime.rejected'
  | 'overtime.cancelled'
  | 'resign.created'
  | 'resign.approved'
  | 'resign.rejected'
  | 'resign.cancelled'
  | 'attendance.correction_created';

type FeedItem = {
  id: string;
  type: FeedType;
  origin: 'self' | 'approval';
  title: string;
  summary: string;
  timestamp: string;
  sortTime: number;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  bgColor: string;
  status?: string;
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
    queryKey: ['attendance-history', user?.id, 'activity', dateRange.dateFrom, dateRange.dateTo],
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
    queryKey: ['leave-history', user?.id, 'activity'],
    queryFn: async () => {
      if (!user?.id) return [];
      return leaveService.getRequests({ employee_id: user.id, limit: 50 });
    },
    enabled: !!user?.id,
  });

  const { data: overtimeRecords = [], isLoading: isLoadingOvertime, refetch: refetchOvertime, isFetching: isFetchingOvertime } = useQuery({
    queryKey: ['overtime-history', user?.id, 'activity'],
    queryFn: async () => {
      if (!user?.id) return [];
      return overtimeService.getRecords({ employee_id: user.id, limit: 50 });
    },
    enabled: !!user?.id,
  });

  const { data: resignRequests = [], isLoading: isLoadingResign, refetch: refetchResign, isFetching: isFetchingResign } = useQuery({
    queryKey: ['resign-history', user?.id, 'activity'],
    queryFn: async () => {
      if (!user?.id) return [];
      return resignService.getMyRequests({ limit: 50 });
    },
    enabled: !!user?.id,
  });

  const { data: approvalHistory = [], isLoading: isLoadingApproval, refetch: refetchApproval, isFetching: isFetchingApproval } = useQuery({
    queryKey: qk.approvalActivityFeed(user?.id, 'activity'),
    queryFn: async () => {
      if (!user?.id) return [];
      return approvalService.getHistory({ limit: 50 });
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  const { data: attendanceCorrections = [], isLoading: isLoadingCorrection, refetch: refetchCorrection, isFetching: isFetchingCorrection } = useQuery({
    queryKey: ['attendance-corrections', user?.id, 'activity'],
    queryFn: async () => {
      if (!user?.id) return [];
      return attendanceService.listCorrections({ employee_id: user.id, limit: 50 });
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

  const [isManualRefreshing, setIsManualRefreshing] = React.useState(false);
  const onManualRefresh = React.useCallback(async () => {
    setIsManualRefreshing(true);
    await Promise.all([
      refetchAttendance(),
      refetchLeave(),
      refetchOvertime(),
      refetchResign(),
      refetchApproval(),
      refetchCorrection(),
    ]);
    setIsManualRefreshing(false);
  }, [refetchAttendance, refetchLeave, refetchOvertime, refetchResign, refetchApproval, refetchCorrection]);

  const onRefresh = React.useCallback(() => {
    refetchAttendance();
    refetchLeave();
    refetchOvertime();
    refetchResign();
    refetchApproval();
    refetchCorrection();
  }, [refetchAttendance, refetchLeave, refetchOvertime, refetchResign, refetchApproval, refetchCorrection]);

  useFocusEffect(
    React.useCallback(() => {
      onRefresh();
    }, [onRefresh])
  );

  const feedItems = React.useMemo(() => {
    const items: FeedItem[] = [];

    attendanceFeed.forEach((item: any) => {
      const attendanceDate = item.attendance_date || item.date || '-';
      const checkinTime = item.checkin_at || item.checkin_time;
      const checkoutTime = item.checkout_at || item.checkout_time;
      const badgeProps = getAttendanceBadgeProps(item.attendance_status || item.status);
      const status = badgeProps.label;
      if (item.is_corrected) return;

      if (checkinTime) {
        items.push({
          id: `${item.id}-checkin`,
          type: 'attendance.checkin',
          title: 'Anda check-in',
          summary: `${attendanceDate} · ${formatTime(checkinTime)}`,
          details: [
            `Tanggal: ${attendanceDate}`,
            `Jam masuk: ${formatTime(checkinTime)}`,
            `Keterangan: ${status}`,
          ],
          timestamp: checkinTime,
          sortTime: toSortTime(checkinTime),
          icon: 'login',
          color: '#1f6b42',
          bgColor: '#d9e6da',
          origin: 'self',
        });
      }

      if (checkoutTime) {
        items.push({
          id: `${item.id}-checkout`,
          type: 'attendance.checkout',
          title: 'Anda check-out',
          summary: `${attendanceDate} · ${formatTime(checkoutTime)}`,
          details: [
            `Tanggal: ${attendanceDate}`,
            `Jam pulang: ${formatTime(checkoutTime)}`,
            `Keterangan: ${status}`,
          ],
          timestamp: checkoutTime,
          sortTime: toSortTime(checkoutTime),
          icon: 'logout',
          color: '#93000a',
          bgColor: '#ffdad6',
          origin: 'self',
        });
      }
    });

    leaveRequests.forEach((item: any) => {
      const leaveTypeLabel = getLeaveTypeLabel(item);
      const isHourlyLeave = /jam|hour/i.test(`${leaveTypeLabel} ${item.leave_type?.code || ''} ${item.leave_type?.category || ''}`);
      items.push({
        id: `leave-${item.id}`,
        type: item.status === 'APPROVED' ? 'leave.approved' : item.status === 'REJECTED' ? 'leave.rejected' : item.status === 'CANCELLED' ? 'leave.cancelled' : 'leave.created',
        title:
          item.status === 'APPROVED' ? `Pengajuan ${leaveTypeLabel} Anda disetujui` :
            item.status === 'REJECTED' ? `Pengajuan ${leaveTypeLabel} Anda ditolak` :
              item.status === 'CANCELLED' ? `Pengajuan ${leaveTypeLabel} Anda dibatalkan` :
                `Pengajuan ${leaveTypeLabel} Anda menunggu persetujuan`,
        summary: `${formatDateOnly(item.start_date)}${item.end_date ? ` - ${formatDateOnly(item.end_date)}` : ''} · ${leaveTypeLabel} · ${item.status || 'PENDING'}`,
        details: [
          `Pengaju: Anda`,
          `Jenis: ${leaveTypeLabel}`,
          `Tanggal: ${formatDateOnly(item.start_date)}${item.end_date ? ` - ${formatDateOnly(item.end_date)}` : ''}`,
          `Status: ${item.status || 'PENDING'}`,
          ...(isHourlyLeave ? [`Jam: ${item.start_time?.slice(0, 5) || '--:--'} - ${item.end_time?.slice(0, 5) || '--:--'}`] : []),
          `Alasan: ${item.reason || '-'}`,
        ],
        timestamp: item.created_at || item.start_date,
        sortTime: toSortTime(item.created_at) || toSortTime(item.updated_at) || toSortTime(item.start_time) || toSortTime(item.end_time) || toSortTime(item.start_date),
        icon: item.status === 'APPROVED' ? 'check-circle' : item.status === 'REJECTED' ? 'cancel' : item.status === 'CANCELLED' ? 'cancel' : 'event-available',
        color: item.status === 'APPROVED' ? '#1f6b42' : item.status === 'REJECTED' ? '#93000a' : '#000666',
        bgColor: item.status === 'APPROVED' ? '#d9e6da' : item.status === 'REJECTED' ? '#ffdad6' : '#e7ebff',
        origin: 'self',
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
          status === 'APPROVED' ? 'Pengajuan lembur Anda disetujui' :
            status === 'REJECTED' ? 'Pengajuan lembur Anda ditolak' :
              status === 'CANCELLED' ? 'Pengajuan lembur Anda dibatalkan' :
                'Pengajuan lembur Anda menunggu persetujuan',
        summary: `${item.overtime_date || item.attendance_date || '-'} · ${item.overtime_hours ?? item.overtime_minutes ?? '-'} jam · ${status}`,
        details: [
          `Pengaju: Anda`,
          `Tanggal: ${item.overtime_date || item.attendance_date || '-'}`,
          `Durasi: ${item.overtime_hours ?? item.overtime_minutes ?? '-'} jam`,
          `Status: ${status}`,
        ],
        timestamp: item.created_at || item.overtime_date || item.attendance_date || '',
        sortTime: toSortTime(item.created_at) || toSortTime(item.approved_at) || toSortTime(item.end_time) || toSortTime(item.start_time) || toSortTime(item.overtime_date) || toSortTime(item.attendance_date),
        icon: status === 'APPROVED' ? 'check-circle' : status === 'REJECTED' ? 'cancel' : status === 'CANCELLED' ? 'cancel' : 'work-history',
        color: status === 'APPROVED' ? '#1f6b42' : status === 'REJECTED' ? '#93000a' : '#000666',
        bgColor: status === 'APPROVED' ? '#d9e6da' : status === 'REJECTED' ? '#ffdad6' : '#e7ebff',
        origin: 'self',
        status,
        isExpanded: false,
      });
    });

    resignRequests.forEach((item: any) => {
      items.push({
        id: `resign-${item.id}`,
        type: item.status === 'APPROVED' ? 'resign.approved' : item.status === 'REJECTED' ? 'resign.rejected' : item.status === 'CANCELLED' ? 'resign.cancelled' : 'resign.created',
        title:
          item.status === 'APPROVED' ? 'Pengajuan resign Anda disetujui' :
            item.status === 'REJECTED' ? 'Pengajuan resign Anda ditolak' :
              item.status === 'CANCELLED' ? 'Pengajuan resign Anda dibatalkan' :
                'Pengajuan resign Anda menunggu persetujuan',
        summary: `${item.resign_date || '-'} · ${item.reason || '-'} · ${item.status || 'PENDING'}`,
        details: [
          `Pengaju: Anda`,
          `Tanggal resign: ${item.resign_date || '-'}`,
          `Status: ${item.status || 'PENDING'}`,
          `Alasan: ${item.reason || '-'}`,
        ],
        timestamp: item.created_at || item.resign_date || '',
        sortTime: toSortTime(item.created_at) || toSortTime(item.updated_at) || toSortTime(item.resign_date),
        icon: item.status === 'APPROVED' ? 'check-circle' : item.status === 'REJECTED' ? 'cancel' : item.status === 'CANCELLED' ? 'cancel' : 'exit-to-app',
        color: item.status === 'APPROVED' ? '#1f6b42' : item.status === 'REJECTED' ? '#93000a' : '#000666',
        bgColor: item.status === 'APPROVED' ? '#d9e6da' : item.status === 'REJECTED' ? '#ffdad6' : '#e7ebff',
        origin: 'self',
        status: item.status || 'PENDING',
        isExpanded: false,
      });
    });

    attendanceCorrections.forEach((item: any) => {
      const attDate = item.attendance_date || item.attendance?.attendance_date || item.attendance?.date || '-';
      items.push({
        id: `correction-${item.id}`,
        type: item.status === 'APPROVED' ? 'approval.approved' : item.status === 'REJECTED' ? 'approval.rejected' : 'attendance.correction_created',
        title:
          item.status === 'APPROVED' ? 'Pengajuan koreksi absen disetujui' :
            item.status === 'REJECTED' ? 'Pengajuan koreksi absen ditolak' :
              item.status === 'CANCELLED' ? 'Pengajuan koreksi absen dibatalkan' :
                'Pengajuan koreksi absen menunggu persetujuan',
        summary: `${attDate} · ${item.status || 'PENDING'}`,
        details: [
          `Pengaju: Anda`,
          `Tanggal Absen: ${attDate}`,
          `Status: ${item.status || 'PENDING'}`,
          `Alasan: ${item.reason || '-'}`,
        ],
        timestamp: item.created_at || attDate || '',
        sortTime: toSortTime(item.created_at) || toSortTime(item.updated_at) || toSortTime(attDate),
        icon: item.status === 'APPROVED' ? 'check-circle' : item.status === 'REJECTED' ? 'cancel' : item.status === 'CANCELLED' ? 'cancel' : 'edit-calendar',
        color: item.status === 'APPROVED' ? '#1f6b42' : item.status === 'REJECTED' ? '#93000a' : '#000666',
        bgColor: item.status === 'APPROVED' ? '#d9e6da' : item.status === 'REJECTED' ? '#ffdad6' : '#e7ebff',
        origin: 'self',
        status: item.status || 'PENDING',
        isExpanded: false,
      });
    });

    buildApprovalActivityItems(approvalHistory, {
      formatDateOnly,
      toSortTime,
    }).forEach((item) => {
      items.push({
        ...item,
        origin: 'approval',
      });
    });

    return items.sort((a, b) => {
      const dateA = a.sortTime || 0;
      const dateB = b.sortTime || 0;
      return dateB - dateA;
    });
  }, [attendanceFeed, leaveRequests, overtimeRecords, resignRequests, approvalHistory, attendanceCorrections]);

  const isLoading = isLoadingAttendance || isLoadingLeave || isLoadingOvertime || isLoadingResign || isLoadingApproval || isLoadingCorrection;
  const isRefreshing = isFetchingAttendance || isFetchingLeave || isFetchingOvertime || isFetchingResign || isFetchingApproval || isFetchingCorrection;

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
        refreshControl={<RefreshControl refreshing={isManualRefreshing} onRefresh={onManualRefresh} tintColor={Tokens.colors.primary} />}
      >
        {feedItems.length === 0 ? (
          <View className="items-center py-20">
            <MaterialIcons name="event-note" size={64} color={Tokens.colors.outline} />
            <Text className="font-manrope-bold text-lg text-primary mt-4">Belum ada aktivitas</Text>
            <Text className="font-inter text-sm text-text-muted text-center mt-2">Aktivitas akan muncul di sini ketika ada riwayat baru.</Text>
          </View>
        ) : (
          <View className="gap-0 mt-2">
            {feedItems.map((item, index) => {
              const pulse = item.origin === 'self' && item.status === 'PENDING';
              return (
                <MotiView
                  key={item.id}
                  className="flex-row"
                  from={{ opacity: 0, translateY: 15 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', delay: Math.min(index, 20) * 100 }}
                >
                  {/* Timeline Line & Dot */}
                  <View className="items-center mr-4">
                    {pulse ? (
                      <MotiView
                        className="w-8 h-8 rounded-full items-center justify-center z-10"
                        style={{ backgroundColor: item.bgColor }}
                        animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
                        transition={{ type: 'timing', duration: 1400, loop: true }}
                      >
                        <MaterialIcons name={item.icon as any} size={16} color={item.color} />
                      </MotiView>
                    ) : (
                      <View className="w-8 h-8 rounded-full items-center justify-center z-10" style={{ backgroundColor: item.bgColor }}>
                        <MaterialIcons name={item.icon as any} size={16} color={item.color} />
                      </View>
                    )}
                    {index !== feedItems.length - 1 && (
                      <View className="w-0.5 flex-1 bg-primary/10 mt-1.5 mb-1.5" />
                    )}
                  </View>

                  {/* Content */}
                  <Pressable
                    className="flex-1 pb-5 pt-0.5"
                    onPress={() => setExpandedId((current) => (current === item.id ? null : item.id))}
                  >
                    <View className="flex-row items-start justify-between gap-2">
                      <Text className="font-inter-bold text-[13px] text-text flex-1 leading-4" numberOfLines={2}>
                        {item.title}
                      </Text>
                    </View>
                    <Text className="font-inter text-[11px] text-text-muted mt-1" numberOfLines={1}>
                      {item.summary}
                    </Text>

                    {expandedId === item.id ? (
                      <MotiView
                        from={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 bg-white/60 px-3 py-2.5 rounded-xl border border-white/90 overflow-hidden"
                      >
                        <View className="gap-1.5">
                          <Text className="font-inter text-[11px] text-text-muted">
                            Tipe: {item.type}
                          </Text>
                          {(item.details || []).filter(Boolean).map((detail: string) => (
                            <Text key={detail} className="font-inter text-[11px] text-text-muted">
                              {detail}
                            </Text>
                          ))}
                        </View>
                      </MotiView>
                    ) : null}
                  </Pressable>
                </MotiView>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

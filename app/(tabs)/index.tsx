import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { qk } from '../../src/core/query/query-keys';
import { Tokens } from '../../src/core/theme/tokens';
import { buildApprovalActivityItems } from '../../src/features/activity/approval-activity';
import { isApprovalPendingForUser } from '../../src/features/approvals/status';
import { buildHomeMenuItems } from '../../src/features/home/home-menu';
import { filterVisitsByDescendants, findDescendantIds } from '../../src/features/visit/hierarchy';
import { approvalService } from '../../src/services/approval.service';
import { attendanceService } from '../../src/services/attendance.service';
import { employeeService } from '../../src/services/employee.service';
import { leaveService } from '../../src/services/leave.service';
import { overtimeService } from '../../src/services/overtime.service';
import { resignService } from '../../src/services/resign.service';
import { useAuthStore } from '../../src/stores/auth.store';
import { getAttendanceBadgeProps } from '../../src/utils/status';

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
  | 'approval.approved'
  | 'approval.rejected'
  | 'resign.created'
  | 'resign.approved'
  | 'resign.rejected'
  | 'resign.cancelled'
  | 'system.info';

type FeedItem = {
  id: string;
  type: FeedType;
  origin: 'self' | 'approval';
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
  color?: string;
  bgColor?: string;
  onPress: () => void;
  badgeCount?: number;
  disabled?: boolean;
};

type MenuSlot = MenuItem | null;

function MarqueeName({ text }: { text: string }) {
  return (
    <View className="w-full justify-center" style={{ minHeight: 36 }}>
      <Text className="font-manrope-extrabold text-2xl text-white leading-8" numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const { user, isLoggedIn } = useAuthStore();
  const { width: windowWidth } = useWindowDimensions();
  const name = user?.full_name || 'Employee';
  const [expandedFeedId, setExpandedFeedId] = React.useState<string | null>(null);

  const { data: hierarchy = [] } = useQuery({
    queryKey: ['employee-hierarchy', user?.company_id, user?.branch_id],
    queryFn: () => employeeService.getHierarchy({
      company_id: user?.company_id ?? undefined,
      branch_id: user?.branch_id ?? undefined,
    }),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const subordinateIds = React.useMemo(
    () => (user?.id ? findDescendantIds(hierarchy, user.id) : []),
    [hierarchy, user?.id]
  );
  const hasSubordinates = subordinateIds.length > 0;

  // 1. Fetch Data locally
  const formatLocalDate = React.useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const dateRange = React.useMemo(() => {
    const dateTo = new Date();
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 7);
    return {
      dateFrom: formatLocalDate(dateFrom),
      dateTo: formatLocalDate(dateTo),
    };
  }, [formatLocalDate]);

  const { data: attendanceFeed = [], isLoading: isLoadingAttendanceFeed, refetch: refetchAttendanceFeed, isFetching: isFetchingAttendanceFeed } = useQuery({
    queryKey: qk.attendanceHistory(user?.id, dateRange.dateFrom, dateRange.dateTo),
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
    queryKey: ['leave-history', user?.id, 'home'],
    queryFn: () => {
      if (!user?.id) return [];
      return leaveService.getRequests({ employee_id: user.id, limit: 10 });
    },
    enabled: !!user?.id,
  });

  const { data: overtimeRecords = [], isLoading: isLoadingOvertimeFeed, refetch: refetchOvertimeFeed, isFetching: isFetchingOvertimeFeed } = useQuery({
    queryKey: ['overtime-history', user?.id, 'home'],
    queryFn: () => {
      if (!user?.id) return [];
      return overtimeService.getRecords({ employee_id: user.id, limit: 10 });
    },
    enabled: !!user?.id,
  });

  const todayString = formatLocalDate(new Date());
  const latestAttendance = React.useMemo(() => {
    return attendanceFeed.find((item: any) => (item.attendance_date || item.date) === todayString) || null;
  }, [attendanceFeed, todayString]);
  const latestAttendanceDate = latestAttendance?.attendance_date || latestAttendance?.date;
  const hasCheckIn = !!(latestAttendance?.checkin_time || latestAttendance?.checkin_at);
  const hasCheckOut = !!(latestAttendance?.checkout_time || latestAttendance?.checkout_at);
  const isTodayAttendance = !!latestAttendance;
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

  const [workingDuration, setWorkingDuration] = React.useState({ hours: 0, minutes: 0 });

  let journeyProgress = 0;
  if (isClockedOut) {
    journeyProgress = 100;
  } else if (isClockedIn) {
    const elapsedMinutes = (workingDuration.hours * 60) + workingDuration.minutes;
    journeyProgress = Math.min(10 + (elapsedMinutes / 540) * 85, 95);
  }

  React.useEffect(() => {
    if (!isClockedIn && !isClockedOut) {
      setWorkingDuration({ hours: 0, minutes: 0 });
      return;
    }
    if (isTodayAttendance && latestAttendance) {
      const calculateDiff = () => {
        const startStr = latestAttendance.checkin_at || latestAttendance.checkin_time;
        if (!startStr) return;
        const startFull = startStr.includes('T') || startStr.includes(' ') ? startStr : `${todayString}T${startStr}`;
        const startTime = new Date(startFull).getTime();

        let endTime = new Date().getTime();
        if (isClockedOut) {
          const endStr = latestAttendance.checkout_at || latestAttendance.checkout_time;
          if (endStr) {
            const endFull = endStr.includes('T') || endStr.includes(' ') ? endStr : `${todayString}T${endStr}`;
            endTime = new Date(endFull).getTime();
          }
        }

        const diffMs = Math.max(0, endTime - startTime);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setWorkingDuration({ hours, minutes });
      };

      calculateDiff();
      if (!isClockedOut) {
        const interval = setInterval(calculateDiff, 60000);
        return () => clearInterval(interval);
      }
    }
  }, [formatLocalDate, isClockedIn, isClockedOut, isTodayAttendance, latestAttendance, todayString]);

  const { data: resignRequests = [], isLoading: isLoadingResignFeed, refetch: refetchResignFeed, isFetching: isFetchingResignFeed } = useQuery({
    queryKey: ['resign-history', user?.id, 'home'],
    queryFn: () => {
      if (!user?.id) return [];
      return resignService.getMyRequests({ limit: 10 });
    },
    enabled: !!user?.id,
  });

  const { data: attendanceCorrections = [], isLoading: isLoadingCorrectionFeed, refetch: refetchCorrectionFeed, isFetching: isFetchingCorrectionFeed } = useQuery({
    queryKey: ['attendance-corrections', user?.id, 'home'],
    queryFn: () => {
      if (!user?.id) return [];
      return attendanceService.listCorrections({ employee_id: user.id, limit: 10 });
    },
    enabled: !!user?.id,
  });

  const { data: approvalHistory = [], isLoading: isLoadingApprovalFeed, refetch: refetchApprovalFeed, isFetching: isFetchingApprovalFeed } = useQuery({
    queryKey: qk.approvalActivityFeed(user?.id, 'home'),
    queryFn: () => {
      if (!user?.id) return [];
      return approvalService.getHistory({ limit: 10 });
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  const { data: pendingApprovals = [], refetch: refetchPendingApprovals } = useQuery({
    queryKey: ['home-approvals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return approvalService.getPending({ limit: 50 });
    },
    enabled: !!user?.id && !!user?.role && user.role !== 'employee',
    staleTime: 30 * 1000,
  });
  const actionableApprovalCount = React.useMemo(
    () => pendingApprovals.filter((item) => isApprovalPendingForUser(item, user?.id)).length,
    [pendingApprovals, user?.id]
  );

  const { data: pendingTeamVisits = [], refetch: refetchPendingTeamVisits } = useQuery({
    queryKey: ['home-visit-pending', user?.company_id, user?.branch_id, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const visits = await attendanceService.listVisits({
        company_id: user?.company_id ?? undefined,
        branch_id: user?.branch_id ?? undefined,
        limit: 50,
      });
      return filterVisitsByDescendants(visits, subordinateIds).filter(
        (item: any) => String(item?.status || '').toUpperCase() === 'PENDING'
      );
    },
    enabled: !!user?.id && hasSubordinates,
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

  const buildDateLabel = React.useCallback((value?: string | null) => {
    if (!value) return '-';
    if (value.includes('T')) return value.split('T')[0];
    if (value.includes(' ')) return value.split(' ')[0];
    return value;
  }, []);

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

  const [isManualRefreshing, setIsManualRefreshing] = React.useState(false);
  const onManualRefresh = React.useCallback(async () => {
    setIsManualRefreshing(true);
    await Promise.all([
      refetchAttendanceFeed(),
      refetchLeaveFeed(),
      refetchOvertimeFeed(),
      refetchResignFeed(),
      refetchApprovalFeed(),
      refetchCorrectionFeed(),
      refetchPendingApprovals(),
      refetchPendingTeamVisits(),
    ]);
    setIsManualRefreshing(false);
  }, [refetchAttendanceFeed, refetchLeaveFeed, refetchOvertimeFeed, refetchResignFeed, refetchApprovalFeed, refetchCorrectionFeed, refetchPendingApprovals, refetchPendingTeamVisits]);

  const onRefresh = React.useCallback(() => {
    refetchAttendanceFeed();
    refetchLeaveFeed();
    refetchOvertimeFeed();
    refetchResignFeed();
    refetchApprovalFeed();
    refetchCorrectionFeed();
    refetchPendingApprovals();
    refetchPendingTeamVisits();
  }, [refetchAttendanceFeed, refetchLeaveFeed, refetchOvertimeFeed, refetchResignFeed, refetchApprovalFeed, refetchCorrectionFeed, refetchPendingApprovals, refetchPendingTeamVisits]);

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
      const actualCheckoutTime = item.actual_checkout_at;
      const badgeProps = getAttendanceBadgeProps(item.attendance_status || item.status);
      const status = badgeProps.label;
      if (item.is_corrected) return;

      if (checkinTime) {
        items.push({
          id: `${item.id}-checkin`,
          type: 'attendance.checkin',
          title: 'Anda check-in',
          summary: `${attendanceDate} · ${formatTime(checkinTime)}`,
          details: [`Tanggal: ${attendanceDate}`, `Jam masuk: ${formatTime(checkinTime)}`, `Status: ${status}`],
          timestamp: checkinTime,
          sortTime: toSortTime(checkinTime),
          sortRank: 1,
          icon: 'login',
          color: '#1f6b42',
          bgColor: '#d9e6da',
          origin: 'self',
          status,
          isExpanded: false,
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
            ...(actualCheckoutTime ? [`Actual check-out: ${formatTime(actualCheckoutTime)}`] : []),
            `Status: ${status}`,
          ],
          timestamp: checkoutTime,
          sortTime: toSortTime(checkoutTime),
          sortRank: 2,
          icon: 'logout',
          color: '#93000a',
          bgColor: '#ffdad6',
          origin: 'self',
          status,
          isExpanded: false,
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
        sortRank: 3,
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
        sortRank: 4,
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
        sortRank: 0,
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
        sortRank: 2,
        icon: item.status === 'APPROVED' ? 'check-circle' : item.status === 'REJECTED' ? 'cancel' : item.status === 'CANCELLED' ? 'cancel' : 'edit-calendar',
        color: item.status === 'APPROVED' ? '#1f6b42' : item.status === 'REJECTED' ? '#93000a' : '#000666',
        bgColor: item.status === 'APPROVED' ? '#d9e6da' : item.status === 'REJECTED' ? '#ffdad6' : '#e7ebff',
        origin: 'self',
        status: item.status || 'PENDING',
        isExpanded: false,
      });
    });

    buildApprovalActivityItems(approvalHistory, {
      formatDateOnly: buildDateLabel,
      toSortTime,
    }).forEach((item) => {
      items.push({
        ...item,
        origin: 'approval',
        sortRank: 5,
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
  }, [attendanceFeed, expandedFeedId, leaveRequests, overtimeRecords, resignRequests, attendanceCorrections, approvalHistory, buildDateLabel, toSortTime]);

  const menuItems = React.useMemo<MenuItem[]>(
    () => buildHomeMenuItems(user?.role, actionableApprovalCount, pendingTeamVisits.length),
    [actionableApprovalCount, pendingTeamVisits.length, user?.role]
  );
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
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: 100 }}
        className="mx-5 mt-4 mb-2 rounded-[32px] bg-primary overflow-hidden shadow-sm"
      >
        {/* Decorative Overlay */}
        <View className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-white/10" />
        <View className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-black/10" />

        <View className="p-6">
          {/* Top Row: Welcome & Status */}
          <View className="flex-row justify-between items-start mb-6">
            <View className="flex-1 pr-4">
              <Text className="font-inter-bold text-[10px] text-white/70 uppercase tracking-[0.2em] mb-1">
                Halo, Selamat Datang
              </Text>
              <MarqueeName text={name} />
            </View>
            <View className="bg-white/20 px-3 py-1.5 rounded-full border border-white/30 items-center justify-center">
              <View className="flex-row items-center gap-1.5">
                <MaterialIcons name="badge" size={12} color="#fff" />
                <Text className="font-inter-bold text-[9px] text-white uppercase tracking-wider">
                  {user?.position_name || user?.role || 'Karyawan'}
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom Row: Cute Working Status */}
          <MotiView
            className="rounded-[20px] p-4 flex-col gap-3 overflow-hidden"
            style={{ borderWidth: 1 }}
            from={{
              backgroundColor: isClockedOut ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.1)',
              borderColor: isClockedOut ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.15)'
            }}
            animate={{
              backgroundColor: isClockedOut ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.1)',
              borderColor: isClockedOut
                ? 'rgba(16, 185, 129, 0.4)'
                : (!isClockedIn ? 'rgba(245, 158, 11, 0.6)' : 'rgba(255, 255, 255, 0.45)')
            }}
            transition={{ type: 'timing', duration: 1500, loop: true, repeatReverse: true }}
          >
            <View className="flex-row items-center gap-4">
              {/* The Cute Icon */}
              <View className="w-12 h-12 bg-white/20 rounded-2xl items-center justify-center relative">
                {isClockedOut ? (
                  <MotiView
                    from={{ translateY: 0, scale: 1 }}
                    animate={{ translateY: -6, scale: 1.15 }}
                    transition={{ type: 'timing', duration: 600, loop: true, repeatReverse: true }}
                  >
                    <MaterialIcons name="weekend" size={24} color="#fff" />
                  </MotiView>
                ) : isClockedIn ? (
                  <MotiView
                    from={{ rotate: '-8deg' }}
                    animate={{ rotate: '8deg' }}
                    transition={{ type: 'timing', duration: 2500, loop: true, repeatReverse: true }}
                    className="items-center justify-center relative"
                  >
                    <MaterialIcons name="local-florist" size={26} color="#a5d6a7" />
                    <MotiView
                      from={{ scale: 0.5, opacity: 0, translateY: -5, translateX: 5 }}
                      animate={{ scale: 1, opacity: [0, 1, 0], translateY: -15, translateX: 10 }}
                      transition={{ type: 'timing', duration: 3000, loop: true }}
                      className="absolute top-0 right-0"
                    >
                      <MaterialIcons name="eco" size={10} color="#81c784" />
                    </MotiView>
                  </MotiView>
                ) : (
                  <MotiView
                    from={{ translateY: -3 }}
                    animate={{ translateY: 3 }}
                    transition={{ type: 'timing', duration: 1500, loop: true, repeatReverse: true }}
                  >
                    <MaterialIcons name="bedtime" size={24} color="#fff" />
                  </MotiView>
                )}
              </View>

              {/* The Text */}
              <View className="flex-1">
                <Text className="font-inter-bold text-[11px] text-yellow-400 mb-1">
                  {isClockedOut ? 'Check-out berhasil!' : isClockedIn ? 'Check-in berhasil!' : 'Anda belum melakukan absensi!'}
                </Text>
                <Text className="font-inter-medium text-[10px] text-white/80 leading-4">
                  {isClockedOut
                    ? 'Kerja hari ini telah selesai! Terima kasih! Selamat beristirahat!'
                    : isClockedIn
                      ? 'Kerja hari ini telah dimulai! Please, Do your best!'
                      : 'Belum ada catatan absen hari ini. Ayo, jangan lupa check-in ya!'}
                </Text>
              </View>
            </View>

            {/* Progress Bar Area */}
            <View className="relative w-full mt-1">
              {/* Empty Track */}
              <MotiView
                className="h-2.5 w-full rounded-full"
                style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}
                animate={!isClockedIn && !isClockedOut ? { backgroundColor: ['rgba(0,0,0,0.15)', 'rgba(255,255,255,0.3)', 'rgba(0,0,0,0.15)'] } : { backgroundColor: 'rgba(0,0,0,0.15)' }}
                transition={{ type: 'timing', duration: 1500, loop: true }}
              />

              {/* The Fill */}
              {(isClockedIn || isClockedOut) && (
                <MotiView
                  className="absolute left-0 top-0 bottom-0 rounded-full"
                  style={{ backgroundColor: isClockedOut ? '#81c784' : '#ffffff' }}
                  from={{ width: '0%' }}
                  animate={{ width: `${journeyProgress}%` }}
                  transition={{ type: 'spring', damping: 20, stiffness: 90 }}
                />
              )}

              {/* Shimmer for active state */}
              {isClockedIn && !isClockedOut && (
                <MotiView
                  className="absolute left-0 top-0 bottom-0 rounded-full bg-white"
                  from={{ width: '0%', opacity: 0.5 }}
                  animate={{ width: `${journeyProgress}%`, opacity: 0 }}
                  transition={{ type: 'timing', duration: 2000, loop: true }}
                />
              )}

              {/* Sparkles for completed state */}
              {isClockedOut && (
                <MotiView
                  className="absolute -top-1.5"
                  style={{ left: '95%' }}
                  from={{ opacity: 0, translateY: 3, scale: 0.5 }}
                  animate={{ opacity: [0, 1, 0], translateY: -6, scale: [0.5, 1.3, 0.5] }}
                  transition={{ type: 'timing', duration: 1500, loop: true }}
                >
                  <Text style={{ fontSize: 12 }}>✨</Text>
                </MotiView>
              )}
            </View>
          </MotiView>
        </View>
      </MotiView>

      <View className="flex-1" style={{ paddingHorizontal: 20, paddingTop: 4 }}>

        <View className="h-[196px] mt-2 mb-2">
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
                        className={`relative px-0.5 py-1 mb-4 ${item.disabled ? 'opacity-50' : ''}`}
                        style={{ width: menuColumnWidth }}
                        onPress={item.onPress}
                      >
                        <View className="items-center justify-center gap-1.5">
                          {item.badgeCount ? (
                            <View className="absolute -top-1 -right-0 min-w-[18px] h-[18px] rounded-full bg-error items-center justify-center px-1.5 z-20">
                              <Text className="font-inter-bold text-[10px] text-white leading-[18px]">
                                {item.badgeCount > 9 ? '9+' : item.badgeCount}
                              </Text>
                            </View>
                          ) : null}
                          <View className="w-11 h-11 rounded-[16px] items-center justify-center" style={{ backgroundColor: item.bgColor || '#f0eded' }}>
                            <MaterialIcons name={item.icon as any} size={24} color={item.color || '#1b1c1c'} />
                          </View>
                          <Text
                            className="font-inter-bold text-[10px] text-on-surface text-center leading-[14px]"
                            numberOfLines={2}
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

          <View className="h-[340px] rounded-3xl bg-white/50 border border-white/80 overflow-hidden">
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 12, paddingBottom: 18 }}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isManualRefreshing}
                  onRefresh={onManualRefresh}
                  tintColor={Tokens.colors.primary}
                />
              }
            >
              {feedItems.length === 0 ? (
                <View className="items-center py-5">
                  <Text className="font-inter text-[13px] text-text-muted">No recent activities</Text>
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
                        transition={{ type: 'timing', delay: index * 100 }}
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
                          onPress={() => setExpandedFeedId((current) => (current === item.id ? null : item.id))}
                        >
                          <View className="flex-row items-start justify-between gap-2">
                            <Text className="font-inter-bold text-[13px] text-text flex-1 leading-4" numberOfLines={2}>
                              {item.title}
                            </Text>
                          </View>
                          <Text className="font-inter text-[11px] text-text-muted mt-1" numberOfLines={1}>
                            {item.summary}
                          </Text>

                          {item.isExpanded ? (
                            <MotiView
                              from={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-3 bg-white/60 px-3 py-2.5 rounded-xl border border-white/90 overflow-hidden"
                            >
                              <View className="gap-1.5">
                                {item.details.filter(Boolean).map((detail) => (
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
          </View>
        </View>
      </View>

    </SafeAreaView>
  );
}

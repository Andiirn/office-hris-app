import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PeriodSelector } from '../src/components/common/PeriodSelector';
import { OvertimeCreateModal } from '../src/components/overtime/OvertimeCreateModal';
import { Button } from '../src/components/ui/Button';
import { GlassCard } from '../src/components/ui/GlassCard';
import { StatusBadge } from '../src/components/ui/StatusBadge';
import { SuccessAnimation } from '../src/components/ui/SuccessAnimation';
import { Tokens } from '../src/core/theme/tokens';
import { formatOvertimeTime, toLocalDateTimeString } from '../src/features/overtime/time';
import { approvalService } from '../src/services/approval.service';
import { attendanceService } from '../src/services/attendance.service';
import { overtimeService } from '../src/services/overtime.service';
import { useAuthStore } from '../src/stores/auth.store';
import { AttendanceItem } from '../src/types/attendance';
import { AddOvertimeSegmentRequest, CreateOvertimeRequest, OvertimeSegment, OvertimeType, UpdateOvertimeSegmentRequest } from '../src/types/overtime';
import { goBackOrTabs } from '../src/utils/navigation';

type OvertimeMode = 'attendance' | 'pre_submit';

const OVERTIME_TYPE_LABELS: Record<OvertimeType, string> = {
  REGULAR: 'Hari Kerja',
  SATURDAY: 'Akhir Pekan',
  HOLIDAY: 'Hari Libur',
};

function formatLocalDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function normalizeTimeInput(value: string) {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function toTimeValue(value: string) {
  const [hours = '', minutes = ''] = value.split(':');
  const hh = Number(hours);
  const mm = Number(minutes);
  if (!hours || !minutes || Number.isNaN(hh) || Number.isNaN(mm) || hh > 23 || mm > 59) return null;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function toTimeInputValue(value?: string | null) {
  if (!value) return '';
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }

  if (value.includes('T')) return value.split('T')[1].slice(0, 5);
  if (value.includes(' ')) return value.split(' ')[1].slice(0, 5);
  return value.slice(0, 5);
}

function getOvertimeStatus(item: any) {
  const rawStatus = String(item?.status || item?.overtime_status || '').toUpperCase();
  if (rawStatus === 'APPROVED' || item?.is_approved || item?.approved_at) return 'APPROVED';
  if (rawStatus === 'REJECTED' || rawStatus === 'DECLINED') return 'REJECTED';
  if (rawStatus === 'CANCELLED') return 'CANCELLED';
  return 'PENDING';
}

function getSubmissionErrorMessage(error: any) {
  const response = error?.response?.data;
  if (Array.isArray(response?.errors) && response.errors.length > 0) {
    const first = response.errors[0];
    if (typeof first === 'string' && first.trim()) return first;
    if (first && typeof first === 'object') {
      const field = typeof first.field === 'string' ? first.field : '';
      const message = typeof first.message === 'string' ? first.message : '';
      if (field && message) return `${field}: ${message}`;
      if (message) return message;
    }
  }
  if (typeof response?.message === 'string' && response.message.trim()) {
    return response.message;
  }
  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }
  return 'Failed to submit overtime';
}

function toDraftSegment(segment: OvertimeSegment, sortOrder: number): OvertimeSegment {
  return {
    ...segment,
    segment_date: segment.segment_date,
    sort_order: sortOrder,
    overtime_minutes: segment.overtime_minutes || 0,
    overtime_hours: segment.overtime_hours || 0,
  };
}

export default function OvertimeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [attendancePickerVisible, setAttendancePickerVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [segmentModalVisible, setSegmentModalVisible] = useState(false);
  const [mode, setMode] = useState<OvertimeMode>('attendance');
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [segmentForm, setSegmentForm] = useState({ segment_date: '', start_time: '', end_time: '' });
  const [draftSegments, setDraftSegments] = useState<OvertimeSegment[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState<CreateOvertimeRequest>({
    attendance_id: null,
    overtime_date: new Date().toISOString().slice(0, 10),
    start_time: '',
    end_time: '',
    overtime_type: 'REGULAR',
    reason: '',
  });

  const overtimeTypes: OvertimeType[] = ['REGULAR', 'SATURDAY', 'HOLIDAY'];

  const { data: summary } = useQuery({
    queryKey: ['overtime-summary', user?.id, selectedYear, selectedMonth],
    queryFn: () => overtimeService.getSummary(user?.id || '', { year: selectedYear, month: selectedMonth }),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const { data: history = [], refetch: refetchHistory, isFetching: isFetchingHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['overtime-history', user?.id, selectedYear, selectedMonth],
    queryFn: () => overtimeService.listRecords({
      employee_id: user?.id,
      year: selectedYear,
      month: selectedMonth,
      limit: 50,
    }),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : (a.overtime_date ? new Date(a.overtime_date).getTime() : 0);
      const timeB = b.created_at ? new Date(b.created_at).getTime() : (b.overtime_date ? new Date(b.overtime_date).getTime() : 0);
      return timeB - timeA;
    });
  }, [history]);

  const { data: selectedRecordDetail, isLoading: isLoadingDetail, isError: isDetailError, refetch: refetchDetail } = useQuery({
    queryKey: ['overtime-record-detail', selectedRecordId],
    queryFn: () => overtimeService.getRecordDetail(selectedRecordId as string),
    enabled: !!selectedRecordId && detailModalVisible,
    staleTime: 60_000,
  });

  const { data: selectedRecordFeedback, isLoading: isLoadingFeedback } = useQuery({
    queryKey: ['overtime-feedback', selectedRecordId],
    queryFn: () => approvalService.getFeedback(selectedRecordId as string),
    enabled: !!selectedRecordId && detailModalVisible,
    staleTime: 60_000,
  });

  const { data: attendanceHistory = [], isLoading: isLoadingAttendance, refetch: refetchAttendanceHistory } = useQuery({
    queryKey: ['attendance-history-pick', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 30);
      return attendanceService.getAttendanceHistory({
        employee_id: user.id,
        date_from: formatLocalDate(dateFrom),
        date_to: formatLocalDate(dateTo),
        limit: 1000,
      });
    },
    enabled: attendancePickerVisible && !!user?.id,
  });

  const selectableAttendanceHistory = useMemo(
    () => attendanceHistory.filter((item) => !!(item.checkin_at || item.checkin_time || item.checkout_at || item.checkout_time)),
    [attendanceHistory],
  );

  const createMutation = useMutation({
    mutationFn: (payload: CreateOvertimeRequest) => overtimeService.createRecord(payload),
    onSuccess: async (createdRecord) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['overtime-history', user?.id, selectedYear, selectedMonth] }),
        queryClient.invalidateQueries({ queryKey: ['overtime-summary', user?.id, selectedYear, selectedMonth] }),
        queryClient.invalidateQueries({ queryKey: ['home-overtime-feed'] }),
        queryClient.invalidateQueries({ queryKey: ['activity-overtime-feed'] }),
        queryClient.refetchQueries({ queryKey: ['overtime-history', user?.id, selectedYear, selectedMonth], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['overtime-summary', user?.id, selectedYear, selectedMonth], type: 'active' }),
      ]);
      await refetchSelectedRecordDetail(createdRecord?.id);
      setModalVisible(false);
      setAttendancePickerVisible(false);
      setShowSuccessAnim(true);
    },
    onError: (error: any) => {
      Alert.alert('Error', getSubmissionErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ recordId, payload }: { recordId: string; payload: CreateOvertimeRequest }) => overtimeService.updateRecord(recordId, {
      start_time: payload.start_time ? toLocalDateTimeString(payload.overtime_date, toTimeValue(payload.start_time) || '00:00') : undefined,
      end_time: payload.end_time ? toLocalDateTimeString(payload.overtime_date, toTimeValue(payload.end_time) || '00:00') : undefined,
      overtime_type: payload.overtime_type,
      reason: payload.reason || null,
    }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['overtime-history', user?.id, selectedYear, selectedMonth] }),
        queryClient.invalidateQueries({ queryKey: ['overtime-summary', user?.id, selectedYear, selectedMonth] }),
        queryClient.invalidateQueries({ queryKey: ['home-overtime-feed'] }),
        queryClient.invalidateQueries({ queryKey: ['activity-overtime-feed'] }),
        queryClient.refetchQueries({ queryKey: ['overtime-history', user?.id, selectedYear, selectedMonth], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['overtime-summary', user?.id, selectedYear, selectedMonth], type: 'active' }),
      ]);
      await refetchSelectedRecordDetail(selectedRecordDetail?.id);
      setModalVisible(false);
      setEditingRecordId(null);
      setShowSuccessAnim(true);
    },
    onError: (error: any) => {
      Alert.alert('Error', getSubmissionErrorMessage(error));
    },
  });

  const addSegmentMutation = useMutation({
    mutationFn: ({ recordId, payload }: { recordId: string; payload: AddOvertimeSegmentRequest }) =>
      overtimeService.addSegment(recordId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['overtime-history', user?.id, selectedYear, selectedMonth] }),
        queryClient.invalidateQueries({ queryKey: ['overtime-summary', user?.id, selectedYear, selectedMonth] }),
        queryClient.invalidateQueries({ queryKey: ['home-overtime-feed'] }),
        queryClient.invalidateQueries({ queryKey: ['activity-overtime-feed'] }),
      ]);
      await refetchSelectedRecordDetail(selectedRecordId);
      resetSegmentModal();
    },
    onError: (error: any) => {
      Alert.alert('Error', getSubmissionErrorMessage(error));
    },
  });

  const editSegmentMutation = useMutation({
    mutationFn: ({ recordId, segmentId, payload }: { recordId: string; segmentId: string; payload: UpdateOvertimeSegmentRequest }) =>
      overtimeService.editSegment(recordId, segmentId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['overtime-history', user?.id, selectedYear, selectedMonth] }),
        queryClient.invalidateQueries({ queryKey: ['overtime-summary', user?.id, selectedYear, selectedMonth] }),
        queryClient.invalidateQueries({ queryKey: ['home-overtime-feed'] }),
        queryClient.invalidateQueries({ queryKey: ['activity-overtime-feed'] }),
      ]);
      await refetchSelectedRecordDetail(selectedRecordId);
      resetSegmentModal();
    },
    onError: (error: any) => {
      Alert.alert('Error', getSubmissionErrorMessage(error));
    },
  });

  const deleteSegmentMutation = useMutation({
    mutationFn: ({ recordId, segmentId }: { recordId: string; segmentId: string }) =>
      overtimeService.deleteSegment(recordId, segmentId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['overtime-history', user?.id, selectedYear, selectedMonth] }),
        queryClient.invalidateQueries({ queryKey: ['overtime-summary', user?.id, selectedYear, selectedMonth] }),
        queryClient.invalidateQueries({ queryKey: ['home-overtime-feed'] }),
        queryClient.invalidateQueries({ queryKey: ['activity-overtime-feed'] }),
      ]);
      await refetchSelectedRecordDetail(selectedRecordId);
      resetSegmentModal();
    },
    onError: (error: any) => {
      Alert.alert('Error', getSubmissionErrorMessage(error));
    },
  });

  const onRefresh = () => {
    refetchHistory();
  };

  const refetchSelectedRecordDetail = async (recordId?: string | null) => {
    if (!recordId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['overtime-record-detail', recordId] }),
      queryClient.refetchQueries({ queryKey: ['overtime-record-detail', recordId], type: 'active' }),
      queryClient.fetchQuery({
        queryKey: ['overtime-record-detail', recordId],
        queryFn: () => overtimeService.getRecordDetail(recordId),
      }),
    ]);
  };

  const resetAndClose = () => {
    setModalVisible(false);
    setAttendancePickerVisible(false);
    setShowSuccessAnim(false);
    setEditingRecordId(null);
    setDraftSegments([]);
  };

  const resetSegmentModal = () => {
    setSegmentModalVisible(false);
    setEditingSegmentId(null);
    setSegmentForm({ segment_date: '', start_time: '', end_time: '' });
  };

  const openDetail = (recordId: string) => {
    setSelectedRecordId(recordId);
    setDetailModalVisible(true);
  };

  const closeDetail = () => {
    setDetailModalVisible(false);
    setSelectedRecordId(null);
  };

  const handlePickAttendance = (attendance: AttendanceItem) => {
    setForm(prev => ({
      ...prev,
      attendance_id: attendance.id,
      overtime_date: attendance.attendance_date || attendance.date || prev.overtime_date,
    }));
    setAttendancePickerVisible(false);
  };

  const resetForm = () => {
    setEditingRecordId(null);
    setMode('attendance');
    setDraftSegments([]);
    setForm({
      attendance_id: null,
      overtime_date: new Date().toISOString().slice(0, 10),
      start_time: '',
      end_time: '',
      overtime_type: 'REGULAR',
      reason: '',
    });
  };

  const openEdit = () => {
    if (!selectedRecordDetail) return;
    if (getOvertimeStatus(selectedRecordDetail) !== 'PENDING') return;
    const selectedAttendanceId = selectedRecordDetail.attendance_id || null;
    const selectedAttendanceExists = !!selectedAttendanceId
      && selectableAttendanceHistory.some((item) => item.id === selectedAttendanceId);
    setEditingRecordId(selectedRecordDetail.id);
    setForm({
      attendance_id: selectedAttendanceExists ? selectedAttendanceId : null,
      overtime_date: selectedRecordDetail.overtime_date || selectedRecordDetail.attendance_date || new Date().toISOString().slice(0, 10),
      start_time: toTimeInputValue(selectedRecordDetail.start_time),
      end_time: toTimeInputValue(selectedRecordDetail.end_time),
      overtime_type: (selectedRecordDetail.overtime_type as OvertimeType) || 'REGULAR',
      reason: selectedRecordDetail.reason || selectedRecordDetail.notes || '',
    });
    setDraftSegments(
      (selectedRecordDetail.segments ?? [])
        .filter((segment: any) => typeof segment.sort_order === 'number' ? segment.sort_order > 0 : true)
        .map((segment, index) => toDraftSegment(segment, index + 1))
    );
    setMode(selectedAttendanceExists ? 'attendance' : 'pre_submit');
    setDetailModalVisible(false);
    setModalVisible(true);
  };

  const openSegmentComposer = () => {
    setEditingSegmentId(null);
    setSegmentModalVisible(true);
    const start = selectedRecordDetail?.end_time || selectedRecordDetail?.start_time || form.end_time || form.start_time;
    const time = toTimeInputValue(start);
    setSegmentForm({
      segment_date: selectedRecordDetail?.overtime_date || selectedRecordDetail?.attendance_date || form.overtime_date || new Date().toISOString().slice(0, 10),
      start_time: time,
      end_time: time,
    });
  };

  const submitSegment = () => {
    const startTime = toTimeValue(segmentForm.start_time);
    const endTime = toTimeValue(segmentForm.end_time);
    if (!startTime || !endTime) {
      Alert.alert('Error', 'Format jam harus HH:MM');
      return;
    }

    const baseDate = selectedRecordDetail?.overtime_date
      || selectedRecordDetail?.attendance_date
      || form.overtime_date
      || new Date().toISOString().slice(0, 10);
    const segmentDate = segmentForm.segment_date || baseDate;
    const payload = {
      segment_date: segmentDate,
      start_time: toLocalDateTimeString(baseDate, startTime),
      end_time: toLocalDateTimeString(baseDate, endTime),
    };

    if (!selectedRecordDetail) {
      const nextSegment = {
        id: editingSegmentId || `${Date.now()}`,
        segment_date: payload.segment_date,
        start_time: payload.start_time,
        end_time: payload.end_time,
        overtime_minutes: 0,
        overtime_hours: 0,
        sort_order: draftSegments.length + 1,
      };
      setDraftSegments((prev) => (
        editingSegmentId
          ? prev.map((segment) => (segment.id === editingSegmentId ? nextSegment : segment))
          : [...prev, nextSegment]
      ));
      resetSegmentModal();
      return;
    }

    if (editingSegmentId) {
      editSegmentMutation.mutate({
        recordId: selectedRecordDetail.id,
        segmentId: editingSegmentId,
        payload,
      });
    } else {
      addSegmentMutation.mutate({
        recordId: selectedRecordDetail.id,
        payload,
      });
    }
  };

  const handleCreate = () => {
    if (mode === 'attendance' && !form.attendance_id) {
      Alert.alert('Error', 'Pilih kehadiran terlebih dahulu');
      return;
    }
    if (mode === 'pre_submit' && !form.overtime_date) {
      Alert.alert('Error', 'Pilih tanggal lembur');
      return;
    }
    if (!form.reason || !form.reason.trim()) {
      Alert.alert('Upss', 'Alasan lembur wajib diisi');
      return;
    }

    const startTime = toTimeValue(form.start_time || '');
    const endTime = toTimeValue(form.end_time || '');
    const hasSegments = draftSegments.length > 0;

    if (!startTime || !endTime) {
      Alert.alert('Error', 'Waktu lembur utama (Mulai & Selesai) wajib diisi dengan format HH:MM');
      return;
    }

    const baseStartTime = toLocalDateTimeString(form.overtime_date, startTime);
    const baseEndTime = toLocalDateTimeString(form.overtime_date, endTime);

    const payload: CreateOvertimeRequest = {
      attendance_id: mode === 'attendance' ? form.attendance_id : null,
      overtime_date: form.overtime_date,
      overtime_type: form.overtime_type,
      reason: form.reason || undefined,
      start_time: hasSegments ? undefined : baseStartTime,
      end_time: hasSegments ? undefined : baseEndTime,
      segments: hasSegments
        ? [
          {
            segment_date: form.overtime_date,
            start_time: baseStartTime,
            end_time: baseEndTime,
          },
          ...draftSegments.map((segment) => ({
            segment_date: segment.segment_date || form.overtime_date,
            start_time: segment.start_time,
            end_time: segment.end_time,
          })),
        ]
        : undefined,
    };

    if (editingRecordId) {
      updateMutation.mutate({ recordId: editingRecordId, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const markedAttendanceDate = useMemo(() => {
    const marks: Record<string, any> = {};
    if (form.overtime_date) {
      marks[form.overtime_date] = {
        selected: true,
        selectedColor: Tokens.colors.primary,
      };
    }
    return marks;
  }, [form.overtime_date]);

  const getStatusType = (status?: string) => {
    const s = status?.toUpperCase() || 'PENDING';
    switch (s) {
      case 'APPROVED':
        return 'secondary';
      case 'PENDING':
        return 'warning';
      case 'REJECTED':
      case 'CANCELLED':
        return 'error';
      default:
        return 'warning';
    }
  };

  const selectedAttendance = useMemo(
    () => selectableAttendanceHistory.find((item) => item.id === form.attendance_id) ?? null,
    [form.attendance_id, selectableAttendanceHistory],
  );

  const formatDateLabel = (value?: string | null) => {
    if (!value) return '-';
    const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTimeLabel = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View pointerEvents="none" className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-on-primary-container/5" />
      <View pointerEvents="none" className="absolute bottom-40 -left-12 w-48 h-48 rounded-full bg-secondary-container/10" />

      <View className="flex-row justify-between items-center px-5 pt-2 pb-5 z-10">
        <View className="flex-row items-center gap-3 flex-1">
          <Pressable
            onPress={() => goBackOrTabs(router)}
            className="w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm active:opacity-60"
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <MaterialIcons name="arrow-back" size={22} color={Tokens.colors.primary} />
          </Pressable>
          <View className="flex-1">
            <Text className="font-manrope-extrabold text-3xl text-primary">Lembur</Text>
            <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Riwayat & Pengajuan Lembur</Text>
          </View>
        </View>
        <Pressable
          className="w-12 h-12 rounded-2xl bg-primary items-center justify-center shadow-lg shadow-primary/30 elevation-8"
          onPress={() => setModalVisible(true)}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetchingHistory} onRefresh={onRefresh} tintColor={Tokens.colors.primary} />
        }
      >


        <View className="mb-6">
          <Text className="font-manrope-bold text-base text-primary mb-3">Ringkasan Penghasilan</Text>
          <View className="flex-row gap-3">
            <GlassCard style={{ flex: 1, padding: 16 }}>
              <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center mb-3">
                <MaterialIcons name="access-time" size={16} color={Tokens.colors.primary} />
              </View>
              <Text className="font-inter-semibold text-[10px] text-text-muted uppercase tracking-wider mb-1">Total Jam</Text>
              <View className="flex-row items-baseline">
                <Text className="font-manrope-extrabold text-2xl text-primary">{summary?.total_hours ?? 0}</Text>
                <Text className="font-inter-semibold text-[10px] text-primary ml-1">Hrs</Text>
              </View>
            </GlassCard>

            <GlassCard style={{ flex: 1, padding: 16 }}>
              <View className="w-8 h-8 rounded-full bg-on-secondary-container/10 items-center justify-center mb-3">
                <MaterialIcons name="payments" size={16} color={Tokens.colors.onSecondaryContainer} />
              </View>
              <Text className="font-inter-semibold text-[10px] text-text-muted uppercase tracking-wider mb-1">Pendapatan</Text>
              <Text className="font-manrope-extrabold text-xl text-on-secondary-container" numberOfLines={1}>
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                }).format(summary?.total_amount || 0)}
              </Text>
            </GlassCard>
          </View>
        </View>

        <View className="mb-6">
          <PeriodSelector
            month={selectedMonth}
            year={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            title="FIlter Riwayat"
            subtitle="Pilih bulan dan tahun untuk melihat riwayat lembur"
          />
        </View>

        <View className="flex-row justify-between items-center mb-4">
          <Text className="font-manrope-bold text-lg text-primary">Riwayat Lembur</Text>
          <View className="bg-primary/10 px-3 py-1 rounded-full">
            <Text className="font-inter-bold text-[10px] text-primary">{sortedHistory.length} Tercatat</Text>
          </View>
        </View>

        {isLoadingHistory ? (
          <Text className="font-inter text-sm text-text-muted mt-4">Memuat riwayat...</Text>
        ) : sortedHistory.length === 0 ? (
          <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'timing', duration: 400 }}>
            <GlassCard style={{ alignItems: 'center', padding: 24, paddingVertical: 48, marginTop: 16 }}>
              <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 500, delay: 200 }}
              >
                <MaterialIcons name="work-history" size={64} color={Tokens.colors.outline} />
              </MotiView>
              <Text className="font-manrope-bold text-lg text-primary mt-4">Belum Ada Pengajuan</Text>
              <Text className="font-inter text-sm text-text-muted text-center mt-2 mb-5">
                Belum ada riwayat lembur.
              </Text>
            </GlassCard>
          </MotiView>
        ) : (
          sortedHistory.map((item) => {
            const status = getOvertimeStatus(item);
            return (
              <Pressable key={item.id} onPress={() => openDetail(item.id)} className="mb-3">
                <GlassCard style={{ padding: 16 }}>
                  <View className="flex-row justify-between items-start mb-2.5">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text className="font-inter-bold text-[11px] text-text-muted uppercase tracking-widest">
                          Pengajuan Lembur
                        </Text>
                        <View className="flex-row items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
                          <MaterialIcons name="visibility" size={11} color={Tokens.colors.primary} />
                        </View>
                      </View>
                      <View className="flex-row items-center gap-1.5 mb-1.5">
                        <Text className='font-inter-medium text-xs text-text-muted mr-1'>Untuk Tanggal:</Text>
                        <Text className="font-inter-bold text-sm text-black">
                          {item.attendance_date || item.overtime_date || item.created_at?.split('T')[0] || '-'}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1.5">
                        <Text className="font-inter-medium text-xs text-text-muted mr-1">Dibuat:</Text>
                        <Text className="font-inter-medium text-xs text-text-muted">
                          {formatDateTimeLabel(item.created_at)}
                        </Text>
                      </View>

                    </View>
                    <View className="items-end">
                      <StatusBadge
                        label={status}
                        type={getStatusType(status) as any}
                      />
                      {status !== 'PENDING' && !!item.overtime_amount && item.overtime_amount > 0 && (
                        <Text className="font-inter-bold text-[10px] text-secondary mt-1">
                          +{new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            minimumFractionDigits: 0,
                          }).format(item.overtime_amount)}
                        </Text>
                      )}
                    </View>
                  </View>

                  {(item.reason || item.notes) && (
                    <View className="bg-black/5 px-3 py-2 rounded-lg mt-2">
                      <Text className="font-inter text-xs text-text-muted italic" numberOfLines={2}>
                        &quot;{item.reason || item.notes}&quot;
                      </Text>
                    </View>
                  )}
                </GlassCard>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <OvertimeCreateModal
        visible={modalVisible}
        onClose={resetAndClose}
        title={editingRecordId ? 'Edit Lembur' : 'Pengajuan Lembur'}
        subtitle={editingRecordId ? 'Perbarui pengajuan yang masih PENDING' : 'Pilih mode pengajuan'}
        submitLabel={editingRecordId ? 'Simpan Perubahan' : 'Kirim Pengajuan'}
        mode={mode}
        setMode={setMode}
        selectedAttendance={selectedAttendance}
        onOpenAttendancePicker={async () => {
          setAttendancePickerVisible(true);
          await refetchAttendanceHistory();
        }}
        form={form}
        setForm={setForm}
        markedAttendanceDate={markedAttendanceDate}
        overtimeTypes={overtimeTypes}
        overtimeTypeLabels={OVERTIME_TYPE_LABELS}
        normalizeTimeInput={normalizeTimeInput}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        attendancePickerVisible={attendancePickerVisible}
        setAttendancePickerVisible={setAttendancePickerVisible}
        isLoadingAttendance={isLoadingAttendance}
        selectableAttendanceHistory={selectableAttendanceHistory}
        onPickAttendance={handlePickAttendance}
        segments={draftSegments}
        onAddSegment={openSegmentComposer}
        onOpenSegmentEditor={(segment) => {
          setEditingSegmentId(segment.id);
          setSegmentForm({
            segment_date: segment.segment_date || selectedRecordDetail?.overtime_date || selectedRecordDetail?.attendance_date || form.overtime_date,
            start_time: toTimeInputValue(segment.start_time),
            end_time: toTimeInputValue(segment.end_time),
          });
          setSegmentModalVisible(true);
        }}
        onSubmitSegment={submitSegment}
        onDeleteSegment={(segmentId) => {
          if (!selectedRecordDetail) {
            setDraftSegments((prev) => prev.filter((segment) => segment.id !== segmentId));
            return;
          }
          Alert.alert('Hapus Segment', 'Hapus segment ini?', [
            { text: 'Batal', style: 'cancel' },
            {
              text: 'Hapus',
              style: 'destructive',
              onPress: () => deleteSegmentMutation.mutate({ recordId: selectedRecordDetail.id, segmentId }),
            },
          ]);
        }}
        segmentModalVisible={segmentModalVisible}
        setSegmentModalVisible={setSegmentModalVisible}
        segmentForm={segmentForm}
        setSegmentForm={setSegmentForm}
        editingSegmentId={editingSegmentId}
        segmentLoading={addSegmentMutation.isPending || editSegmentMutation.isPending || deleteSegmentMutation.isPending}
      />

      <Modal
        animationType="fade"
        transparent
        visible={detailModalVisible}
        onRequestClose={closeDetail}
      >
        <View className="flex-1 bg-black/45 justify-end">
          <View className="bg-background rounded-t-[32px] p-6 pb-10 max-h-[90%] shadow-2xl">
            <View className="flex-row justify-between items-start mb-5">
              <View className="flex-1 pr-4">
                <Text className="font-manrope-extrabold text-2xl text-primary">Detail Lembur</Text>
              </View>
              <Pressable
                className="w-9 h-9 rounded-full bg-black/5 items-center justify-center"
                onPress={closeDetail}
              >
                <MaterialIcons name="close" size={20} color={Tokens.colors.text} />
              </Pressable>
            </View>

            {isLoadingDetail ? (
              <Text className="font-inter text-sm text-text-muted mt-4">Memuat detail...</Text>
            ) : isDetailError || !selectedRecordDetail ? (
              <View className="items-center justify-center py-10">
                <MaterialIcons name="error-outline" size={42} color={Tokens.colors.error} />
                <Text className="font-inter-bold text-base text-on-surface mt-3 text-center">Gagal memuat detail lembur</Text>
                <Text className="font-inter text-sm text-text-muted mt-1 text-center">Silakan coba lagi.</Text>
                <Button title="Retry" onPress={() => refetchDetail()} className="mt-5 h-12 rounded-2xl" />
              </View>
            ) : (
              <KeyboardAwareScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                enableOnAndroid
                extraScrollHeight={24}
                contentContainerStyle={{ paddingBottom: 24 }}
              >
                <GlassCard style={{ padding: 16, marginBottom: 14 }}>
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="font-manrope-bold text-lg text-on-surface">
                        {formatDateLabel(selectedRecordDetail.overtime_date || selectedRecordDetail.attendance_date || selectedRecordDetail.created_at)}
                      </Text>
                      <Text className="font-inter text-xs text-text-muted mt-1">
                        {OVERTIME_TYPE_LABELS[selectedRecordDetail.overtime_type as OvertimeType] || selectedRecordDetail.overtime_type}
                      </Text>
                    </View>
                    <StatusBadge
                      label={getOvertimeStatus(selectedRecordDetail)}
                      type={getStatusType(getOvertimeStatus(selectedRecordDetail)) as any}
                    />
                  </View>
                </GlassCard>

                <View className="flex-row flex-wrap -mx-1.5">
                  <View className="w-1/2 px-1.5 mb-3">
                    <GlassCard style={{ padding: 14, minHeight: 84 }}>
                      <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Durasi</Text>
                      <Text className="font-inter-bold text-sm text-on-surface mt-2">
                        {selectedRecordDetail.overtime_hours ? `${selectedRecordDetail.overtime_hours} jam` : selectedRecordDetail.overtime_minutes ? `${selectedRecordDetail.overtime_minutes} menit` : '-'}
                      </Text>
                    </GlassCard>
                  </View>
                  <View className="w-1/2 px-1.5 mb-3">
                    <GlassCard style={{ padding: 14, minHeight: 84 }}>
                      <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Waktu</Text>
                      <Text className="font-inter-bold text-sm text-on-surface mt-2">
                        {selectedRecordDetail.start_time || selectedRecordDetail.end_time
                          ? `${formatOvertimeTime(selectedRecordDetail.start_time)} - ${formatOvertimeTime(selectedRecordDetail.end_time)}`
                          : '-'}
                      </Text>
                    </GlassCard>
                  </View>
                  <View className="w-1/2 px-1.5 mb-3">
                    <GlassCard style={{ padding: 14, minHeight: 84 }}>
                      <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Nominal</Text>
                      <Text className="font-inter-bold text-sm text-on-surface mt-2">
                        {selectedRecordDetail.overtime_amount
                          ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(selectedRecordDetail.overtime_amount)
                          : '-'}
                      </Text>
                    </GlassCard>
                  </View>
                  <View className="w-1/2 px-1.5 mb-3">
                    <GlassCard style={{ padding: 14, minHeight: 84 }}>
                      <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Disetujui Pada</Text>
                      <Text className="font-inter-bold text-sm text-on-surface mt-2">
                        {formatDateTimeLabel(selectedRecordDetail.approved_at)}
                      </Text>
                    </GlassCard>
                  </View>
                </View>

                <GlassCard style={{ padding: 14, marginBottom: 14 }}>
                  <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Alasan</Text>
                  <Text className="font-inter text-sm text-on-surface mt-2 leading-6">
                    {selectedRecordDetail.reason || selectedRecordDetail.notes || '-'}
                  </Text>
                </GlassCard>

                {(() => {
                  const actualSegments = (selectedRecordDetail.segments ?? []).filter(
                    (segment: any) => typeof segment.sort_order === 'number' ? segment.sort_order > 0 : true
                  );
                  return (
                    <GlassCard style={{ padding: 14, marginBottom: 14 }}>
                      <View className="flex-row items-center justify-between">
                        <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Lembur Tambahan</Text>
                        <View className="rounded-full bg-primary/10 px-2.5 py-1">
                          <Text className="font-inter-bold text-[10px] text-primary">
                            {actualSegments.length} Sesi
                          </Text>
                        </View>
                      </View>
                      {actualSegments.length ? (
                        <View className="mt-3 gap-2">
                          {actualSegments.map((segment) => (
                            <View key={segment.id} className="rounded-2xl bg-black/5 px-4 py-3">
                              <Text className="font-inter-bold text-sm text-on-surface">
                                {formatOvertimeTime(segment.start_time)} - {formatOvertimeTime(segment.end_time)}
                              </Text>
                              <Text className="font-inter text-[11px] text-text-muted mt-1">
                                {segment.overtime_hours ? `${segment.overtime_hours} jam` : `${segment.overtime_minutes} menit`}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text className="font-inter text-sm text-text-muted mt-3">
                          Pengajuan ini tidak memiliki sesi lembur tambahan.
                        </Text>
                      )}
                    </GlassCard>
                  );
                })()}

                {selectedRecordFeedback?.data?.length ? (
                  <GlassCard style={{ padding: 14, marginBottom: 14 }}>
                    <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Diproses Oleh</Text>
                    <View className="mt-3 gap-3">
                      {selectedRecordFeedback.data.map((item) => (
                        <View key={item.id} className="rounded-2xl bg-black/5 px-4 py-3">
                          <View className="flex-row items-start justify-between gap-3">
                            <View className="flex-1">
                              <Text className="font-inter-bold text-sm text-on-surface">
                                {item.hr_name || 'HR Admin'}
                              </Text>
                              <Text className="font-inter text-[11px] text-text-muted mt-1">
                                {item.action === 'APPROVE' ? 'Disetujui' : item.action === 'REJECT' ? 'Ditolak' : 'Diproses'} • {formatDateTimeLabel(item.created_at)}
                              </Text>
                            </View>
                            <StatusBadge
                              label={item.action === 'APPROVE' ? 'APPROVED' : item.action === 'REJECT' ? 'REJECTED' : 'PENDING'}
                              type={item.action === 'REJECT' ? 'error' : item.action === 'APPROVE' ? 'secondary' : 'warning'}
                            />
                          </View>
                          {item.feedback ? (
                            <Text className="font-inter text-sm text-on-surface mt-3 leading-6">
                              {item.feedback}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  </GlassCard>
                ) : null}

                {isLoadingFeedback ? (
                  <Text className="font-inter text-sm text-text-muted mt-2">Memuat approver...</Text>
                ) : null}

                {getOvertimeStatus(selectedRecordDetail) === 'PENDING' ? (
                  <Button title="Edit Pengajuan" onPress={openEdit} className="mt-4 h-12 rounded-2xl" />
                ) : null}
              </KeyboardAwareScrollView>
            )}
          </View>
        </View>
      </Modal>

      <SuccessAnimation
        visible={showSuccessAnim}
        title="Terkirim!"
        message="Pengajuan lembur Anda sedang diproses."
        onDone={() => {
          setShowSuccessAnim(false);
          setModalVisible(false);
          resetForm();
        }}
      />
    </SafeAreaView>
  );
}

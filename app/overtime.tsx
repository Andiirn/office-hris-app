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
import { CreateOvertimeRequest, OvertimeType } from '../src/types/overtime';
import { getAttendanceBadgeProps } from '../src/utils/status';

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

export default function OvertimeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [attendancePickerVisible, setAttendancePickerVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [mode, setMode] = useState<OvertimeMode>('attendance');
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
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
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['overtime-history', user?.id, selectedYear, selectedMonth] }),
        queryClient.invalidateQueries({ queryKey: ['overtime-summary', user?.id, selectedYear, selectedMonth] }),
        queryClient.invalidateQueries({ queryKey: ['home-overtime-feed'] }),
        queryClient.invalidateQueries({ queryKey: ['activity-overtime-feed'] }),
        queryClient.refetchQueries({ queryKey: ['overtime-history', user?.id, selectedYear, selectedMonth], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['overtime-summary', user?.id, selectedYear, selectedMonth], type: 'active' }),
      ]);
      setModalVisible(false);
      setAttendancePickerVisible(false);
      setShowSuccessAnim(true);
    },
    onError: (error: any) => {
      Alert.alert('Error', getSubmissionErrorMessage(error));
    },
  });

  const onRefresh = () => {
    refetchHistory();
  };

  const resetAndClose = () => {
    setModalVisible(false);
    setAttendancePickerVisible(false);
    setShowSuccessAnim(false);
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
    setMode('attendance');
    setForm({
      attendance_id: null,
      overtime_date: new Date().toISOString().slice(0, 10),
      start_time: '',
      end_time: '',
      overtime_type: 'REGULAR',
      reason: '',
    });
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
    if (!form.start_time || !form.end_time) {
      Alert.alert('Error', 'Pilih start time dan end time');
      return;
    }

    const startTime = toTimeValue(form.start_time);
    const endTime = toTimeValue(form.end_time);
    if (!startTime || !endTime) {
      Alert.alert('Error', 'Format jam harus HH:MM');
      return;
    }

    createMutation.mutate({
      ...form,
      attendance_id: mode === 'attendance' ? form.attendance_id : null,
      overtime_date: form.overtime_date,
      start_time: toLocalDateTimeString(form.overtime_date, startTime),
      end_time: toLocalDateTimeString(form.overtime_date, endTime),
    });
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
            onPress={() => router.back()}
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
            <Text className="font-inter-bold text-[10px] text-primary">{history.length} Tercatat</Text>
          </View>
        </View>

        {isLoadingHistory ? (
          <Text className="font-inter text-sm text-text-muted mt-4">Memuat riwayat...</Text>
        ) : history.length === 0 ? (
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
          history.map((item) => {
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

                  {item.reason && (
                    <View className="bg-black/5 px-3 py-2 rounded-lg mt-2">
                      <Text className="font-inter text-xs text-text-muted italic" numberOfLines={2}>
                        &quot;{item.reason}&quot;
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
        isSubmitting={createMutation.isPending}
        attendancePickerVisible={attendancePickerVisible}
        setAttendancePickerVisible={setAttendancePickerVisible}
        isLoadingAttendance={isLoadingAttendance}
        selectableAttendanceHistory={selectableAttendanceHistory}
        onPickAttendance={handlePickAttendance}
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
              <ScrollView showsVerticalScrollIndicator={false}>
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
                    {selectedRecordDetail.reason || '-'}
                  </Text>
                </GlassCard>

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
              </ScrollView>
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

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PeriodSelector } from '../src/components/common/PeriodSelector';
import { CorrectionCreateModal } from '../src/components/correction/CorrectionCreateModal';
import { Button } from '../src/components/ui/Button';
import { GlassCard } from '../src/components/ui/GlassCard';
import { SkeletonCard } from '../src/components/ui/Skeleton';
import { StatusBadge } from '../src/components/ui/StatusBadge';
import { SuccessAnimation } from '../src/components/ui/SuccessAnimation';
import { Tokens } from '../src/core/theme/tokens';
import { approvalService } from '../src/services/approval.service';
import { attendanceService } from '../src/services/attendance.service';
import { useAuthStore } from '../src/stores/auth.store';
import { AttendanceItem } from '../src/types/attendance';
import { AttendanceCorrection, CorrectionRequest } from '../src/types/correction';
import { goBackOrTabs } from '../src/utils/navigation';

function formatTime(time?: string | null) {
  if (!time) return '--:--';
  const parsed = new Date(time);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }
  if (time.includes('T')) return time.split('T')[1].slice(0, 5);
  if (time.includes(' ')) return time.split(' ')[1].slice(0, 5);
  return time.slice(0, 5);
}

function getAttendanceDate(item: any) {
  return item.attendance_date || item.date || '-';
}

function getCorrectionDate(item: AttendanceCorrection) {
  if (item.attendance_date) return item.attendance_date;
  if (item.attendance?.attendance_date) return item.attendance.attendance_date;
  if (item.attendance?.date) return item.attendance.date;
  if (item.original_checkin) return item.original_checkin.split('T')[0];
  if (item.corrected_checkin) return item.corrected_checkin.split('T')[0];
  return '-';
}

function getCheckIn(item: any) {
  return item.checkin_at || item.checkin_time;
}

function getCheckOut(item: any) {
  return item.checkout_at || item.checkout_time;
}

function getAttendanceRecordId(item: any) {
  return item?.attendance_id || item?.record_id || item?.attendanceRecordId || item?.id || '';
}

function normalizeTimePart(value: string, fallback: string) {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 2);
  if (!digits) return fallback;
  return digits.padStart(2, '0');
}

function clampTimePart(value: string, max: number, fallback: string) {
  const normalized = normalizeTimePart(value, fallback);
  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) return fallback;
  return String(Math.min(Math.max(parsed, 0), max)).padStart(2, '0');
}

function getTimezoneOffsetString() {
  const date = new Date();
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absMinutes / 60)).padStart(2, '0');
  const mins = String(absMinutes % 60).padStart(2, '0');
  return `${sign}${hours}:${mins}`;
}

function toDateTimeString(dateStr: string, hour: string, minute: string) {
  if (!dateStr) return '';
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const isoLocal = `${cleanDate}T${clampTimePart(hour, 23, '00')}:${clampTimePart(minute, 59, '00')}:00`;
  return `${isoLocal}${getTimezoneOffsetString()}`;
}

export default function CorrectionScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [attendancePickerVisible, setAttendancePickerVisible] = useState(false);
  const [selectedCorrectionId, setSelectedCorrectionId] = useState<string | null>(null);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceItem | null>(null);
  const [reason, setReason] = useState('');
  const [checkinExists, setCheckinExists] = useState(true);
  const [checkoutExists, setCheckoutExists] = useState(true);

  // Date & Time picker fields
  const [checkoutDate, setCheckoutDate] = useState('');
  const [correctedCheckinHour, setCorrectedCheckinHour] = useState('08');
  const [correctedCheckinMin, setCorrectedCheckinMin] = useState('00');
  const [correctedCheckoutHour, setCorrectedCheckoutHour] = useState('17');
  const [correctedCheckoutMin, setCorrectedCheckoutMin] = useState('00');
  // Success Animation State
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const historyQueryKey = ['attendance-corrections', user?.id, selectedYear, selectedMonth] as const;

  // Fetch correction history
  const { data: corrections = [], isLoading: isLoadingHistory, refetch: refetchHistory, isFetching: isFetchingHistory, isError: isErrorHistory } = useQuery({
    queryKey: historyQueryKey,
    queryFn: () => attendanceService.listCorrections({ employee_id: user?.id, year: selectedYear, month: selectedMonth, limit: 100 }),
    enabled: !!user?.id,
  });

  // Fetch selectable attendance list (last 30 days)
  const { data: attendanceHistory = [], isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['attendance-history-pick-correction', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 30);
      return attendanceService.getAttendanceHistory({
        employee_id: user.id,
        date_from: dateFrom.toISOString().split('T')[0],
        date_to: dateTo.toISOString().split('T')[0],
        limit: 100,
      });
    },
    enabled: modalVisible && !!user?.id,
  });

  const { data: selectedCorrectionDetail, isLoading: isLoadingDetail, isError: isDetailError, refetch: refetchDetail } = useQuery({
    queryKey: ['attendance-correction-detail', selectedCorrectionId],
    queryFn: () => attendanceService.getCorrectionDetail(selectedCorrectionId as string),
    enabled: !!selectedCorrectionId && detailModalVisible,
    staleTime: 60_000,
  });

  const { data: selectedCorrectionFeedback, isLoading: isLoadingFeedback } = useQuery({
    queryKey: ['attendance-correction-feedback', selectedCorrectionId],
    queryFn: () => approvalService.getFeedback(selectedCorrectionId as string),
    enabled: !!selectedCorrectionId && detailModalVisible,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CorrectionRequest) => attendanceService.createCorrection(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: historyQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['attendance-history-full'] }),
      ]);
      setModalVisible(false);
      setAttendancePickerVisible(false);
      setShowSuccessAnim(true);
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Gagal mengirim koreksi');
    },
  });

  const resetForm = () => {
    setSelectedAttendance(null);
    setReason('');
    setCheckinExists(true);
    setCheckoutExists(true);
    setCheckoutDate('');
    setCorrectedCheckinHour('08');
    setCorrectedCheckinMin('00');
    setCorrectedCheckoutHour('17');
    setCorrectedCheckoutMin('00');
    setAttendancePickerVisible(false);
    setModalVisible(false);
  };

  const handlePickAttendance = (att: AttendanceItem) => {
    setSelectedAttendance(att);
    const dateStr = getAttendanceDate(att);
    setCheckoutDate(dateStr);

    const checkin = getCheckIn(att);
    if (checkin) {
      const timeStr = formatTime(checkin);
      const [h, m] = timeStr.split(':');
      setCorrectedCheckinHour(h);
      setCorrectedCheckinMin(m);
      setCheckinExists(true);
    } else {
      setCorrectedCheckinHour('08');
      setCorrectedCheckinMin('00');
      setCheckinExists(false);
    }

    const checkout = getCheckOut(att);
    if (checkout) {
      if (typeof checkout === 'string' && checkout.includes('T')) {
        setCheckoutDate(checkout.split('T')[0]);
      }
      const timeStr = formatTime(checkout);
      const [h, m] = timeStr.split(':');
      setCorrectedCheckoutHour(h);
      setCorrectedCheckoutMin(m);
      setCheckoutExists(true);
    } else {
      setCorrectedCheckoutHour('17');
      setCorrectedCheckoutMin('00');
      setCheckoutExists(false);
    }

    setAttendancePickerVisible(false);
  };

  const submitCorrection = () => {
    const attendanceRecordId = getAttendanceRecordId(selectedAttendance);

    if (!attendanceRecordId) {
      Alert.alert('Error', 'Pilih data kehadiran terlebih dahulu');
      return;
    }
    if (reason.trim().length < 5) {
      Alert.alert('Error', 'Alasan minimal 5 karakter');
      return;
    }

    const defaultDate = getAttendanceDate(selectedAttendance);
    const corrected_checkin = checkinExists
      ? toDateTimeString(defaultDate, correctedCheckinHour, correctedCheckinMin)
      : null;
    const corrected_checkout = checkoutExists
      ? toDateTimeString(checkoutDate || defaultDate, correctedCheckoutHour, correctedCheckoutMin)
      : null;

    createMutation.mutate({
      attendance_id: attendanceRecordId,
      reason: reason.trim(),
      corrected_checkin,
      corrected_checkout,
    });
  };

  const getStatusType = (status?: string) => {
    const s = status?.toUpperCase() || 'PENDING';
    switch (s) {
      case 'APPROVED': return 'secondary';
      case 'PENDING': return 'warning';
      case 'REJECTED':
      case 'CANCELLED': return 'error';
      default: return 'warning';
    }
  };

  const onRefresh = () => {
    refetchHistory();
  };

  const openDetail = (correctionId: string) => {
    setSelectedCorrectionId(correctionId);
    setDetailModalVisible(true);
  };

  const closeDetail = () => {
    setDetailModalVisible(false);
    setSelectedCorrectionId(null);
  };

  const attendanceLabel = useMemo(() => {
    if (!selectedAttendance) return 'Silakan pilih kehadiran terlebih dahulu';
    return `${getAttendanceDate(selectedAttendance)} · ${formatTime(getCheckIn(selectedAttendance))} - ${formatTime(getCheckOut(selectedAttendance))}`;
  }, [selectedAttendance]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute top-20 -right-20 w-64 h-64 rounded-full bg-primary/10" />
      <View className="absolute bottom-10 -left-20 w-72 h-72 rounded-full bg-secondary-container/15" />

      {/* Header */}
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
            <Text className="font-manrope-extrabold text-3xl text-primary">Koreksi Kehadiran</Text>
            <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Daftar pengajuan koreksi kehadiran</Text>
          </View>
        </View>
        <Pressable
          className="w-12 h-12 rounded-2xl bg-primary items-center justify-center shadow-lg shadow-primary/30 elevation-8"
          onPress={() => setModalVisible(true)}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetchingHistory} onRefresh={onRefresh} tintColor={Tokens.colors.primary} />
        }
      >
        <View className="mb-6">
          <PeriodSelector
            month={selectedMonth}
            year={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            title="FIlter Riwayat"
            subtitle="Filter koreksi berdasarkan bulan dan tahun"
          />
        </View>

        <View className="flex-row justify-between items-center mt-2 mb-4">
          <Text className="font-manrope-bold text-lg text-primary">Riwayat Koreksi</Text>
          <View className="bg-primary/10 px-3 py-1 rounded-full">
            <Text className="font-inter-bold text-[10px] text-primary">{corrections.length} Tercatat</Text>
          </View>
        </View>

        {isLoadingHistory ? (
          <View className="mt-2">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : isErrorHistory ? (
          <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <GlassCard style={{ alignItems: 'center', padding: 32, marginTop: 10 }}>
              <MaterialIcons name="error-outline" size={48} color={Tokens.colors.error} />
              <Text className="font-manrope-bold text-base text-primary mt-4">Gagal Memuat Data</Text>
              <Text className="font-inter text-xs text-text-muted text-center mt-2 mb-4">
                Ada masalah saat mengambil riwayat koreksi. Silakan coba kembali.
              </Text>
              <Button title="Coba Lagi" onPress={onRefresh} style={{ width: 140 }} />
            </GlassCard>
          </MotiView>
        ) : corrections.length === 0 ? (
          <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <GlassCard style={{ alignItems: 'center', padding: 40, marginTop: 10 }}>
              <MotiView
                from={{ translateY: -8 }}
                animate={{ translateY: 8 }}
                transition={{ type: 'timing', duration: 1500, loop: true, repeatReverse: true }}
              >
                <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-2">
                  <MaterialIcons name="fact-check" size={40} color={Tokens.colors.primary} />
                </View>
              </MotiView>
              <Text className="font-manrope-bold text-lg text-primary mt-4">Belum Ada Pengajuan</Text>
              <Text className="font-inter text-sm text-text-muted text-center mt-2 mb-5">
                Anda belum pernah mengajukan koreksi kehadiran.
              </Text>
            </GlassCard>
          </MotiView>
        ) : (
          <View className="gap-3">
            {corrections.map((item: AttendanceCorrection, index: number) => (
              <MotiView
                key={item.id}
                from={{ opacity: 0, translateY: 15 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400, delay: index * 100 }}
              >
                <Pressable onPress={() => openDetail(item.id)}>
                  <GlassCard style={{ padding: 16 }}>
                    <View className="flex-row justify-between items-start mb-2.5">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2 mb-1">
                          <Text className="font-inter-bold text-[11px] text-text-muted uppercase tracking-widest">
                            Pengajuan Koreksi
                          </Text>
                          <View className="flex-row items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
                            <MaterialIcons name="visibility" size={11} color={Tokens.colors.primary} />
                          </View>
                        </View>
                        <View className="flex-row items-center gap-1.5 mt-1.5">
                          <Text className='font-inter-medium text-xs text-text-muted mr-1'>Untuk tanggal absen:</Text>
                          <Text className="font-inter-bold text-sm text-black">{getCorrectionDate(item)}</Text>
                        </View>
                      </View>
                      <StatusBadge label={item.status || 'PENDING'} type={getStatusType(item.status) as any} />
                    </View>

                    {/* <View className="bg-primary/5 border border-primary/10 p-3 rounded-xl mb-3 mt-1">
                      <View className="flex-row justify-between mb-1">
                        <View className="flex-1">
                          <Text className="font-inter-semibold text-[10px] text-text-muted uppercase mb-0.5">Koreksi Masuk</Text>
                          <Text className="font-manrope-extrabold text-base text-primary">
                            {item.corrected_checkin ? formatTime(item.corrected_checkin) : '--:--'}
                          </Text>
                        </View>
                        <View className="w-[1px] bg-primary/20 mx-3" />
                        <View className="flex-1">
                          <Text className="font-inter-semibold text-[10px] text-text-muted uppercase mb-0.5">Koreksi Pulang</Text>
                          <Text className="font-manrope-extrabold text-base text-primary">
                            {item.corrected_checkout ? formatTime(item.corrected_checkout) : '--:--'}
                          </Text>
                        </View>
                      </View>
                    </View> */}
                    {/* 
                    <View className="border-t border-black/5 pt-2.5">
                      <View className="flex-row items-start gap-1.5">
                        <MaterialIcons name="chat-bubble-outline" size={12} color={Tokens.colors.textMuted} style={{ marginTop: 2 }} />
                        <Text className="font-inter text-xs text-on-surface flex-1">{item.reason}</Text>
                      </View>
                    </View> */}

                    {item.notes ? (
                      <View className="mt-2.5 border-t border-black/5 pt-2">
                        <Text className="font-inter-semibold text-[10px] text-error uppercase mb-1">Catatan HRD</Text>
                        <Text className="font-inter text-xs text-error italic">&quot;{item.notes}&quot;</Text>
                      </View>
                    ) : null}
                  </GlassCard>
                </Pressable>
              </MotiView>
            ))}
          </View>
        )}
      </ScrollView>

      <CorrectionCreateModal
        visible={modalVisible}
        onClose={resetForm}
        attendancePickerVisible={attendancePickerVisible}
        setAttendancePickerVisible={setAttendancePickerVisible}
        selectedAttendance={selectedAttendance}
        attendanceHistory={attendanceHistory}
        isLoadingAttendance={isLoadingAttendance}
        attendanceLabel={attendanceLabel}
        formatTime={formatTime}
        getAttendanceDate={getAttendanceDate}
        getCheckIn={getCheckIn}
        getCheckOut={getCheckOut}
        getAttendanceRecordId={getAttendanceRecordId}
        handlePickAttendance={handlePickAttendance}
        checkoutDate={checkoutDate}
        setCheckoutDate={setCheckoutDate}
        checkinExists={checkinExists}
        setCheckinExists={setCheckinExists}
        checkoutExists={checkoutExists}
        setCheckoutExists={setCheckoutExists}
        correctedCheckinHour={correctedCheckinHour}
        setCorrectedCheckinHour={setCorrectedCheckinHour}
        correctedCheckinMin={correctedCheckinMin}
        setCorrectedCheckinMin={setCorrectedCheckinMin}
        correctedCheckoutHour={correctedCheckoutHour}
        setCorrectedCheckoutHour={setCorrectedCheckoutHour}
        correctedCheckoutMin={correctedCheckoutMin}
        setCorrectedCheckoutMin={setCorrectedCheckoutMin}
        reason={reason}
        setReason={setReason}
        onSubmit={submitCorrection}
        isSubmitting={createMutation.isPending}
      />

      <Modal
        visible={detailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDetail}
      >
        <View className="flex-1 bg-black/45 justify-end">
          <View className="bg-background rounded-t-[32px] p-6 pb-10 max-h-[90%] shadow-2xl">
            <View className="flex-row justify-between items-start mb-5">
              <View className="flex-1 pr-4">
                <Text className="font-manrope-extrabold text-2xl text-primary">Detail Koreksi</Text>
              </View>
              <Pressable className="w-9 h-9 rounded-full bg-black/5 items-center justify-center" onPress={closeDetail}>
                <MaterialIcons name="close" size={20} color={Tokens.colors.text} />
              </Pressable>
            </View>

            {isLoadingDetail ? (
              <View className="mt-2">
                <SkeletonCard />
                <SkeletonCard />
              </View>
            ) : isDetailError || !selectedCorrectionDetail ? (
              <View className="items-center justify-center py-10">
                <MaterialIcons name="error-outline" size={42} color={Tokens.colors.error} />
                <Text className="font-inter-bold text-base text-on-surface mt-3 text-center">Gagal memuat detail koreksi</Text>
                <Text className="font-inter text-sm text-text-muted mt-1 text-center">Silakan coba lagi.</Text>
                <Button title="Retry" onPress={() => refetchDetail()} className="mt-5 h-12 rounded-2xl" />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <GlassCard style={{ padding: 16, marginBottom: 14 }}>
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="font-manrope-bold text-lg text-on-surface">{getCorrectionDate(selectedCorrectionDetail)}</Text>
                      <Text className="font-inter text-xs text-text-muted mt-1">
                        Koreksi absensi untuk kehadiran yang tercatat
                      </Text>
                    </View>
                    <StatusBadge
                      label={selectedCorrectionDetail.status || 'PENDING'}
                      type={getStatusType(selectedCorrectionDetail.status) as any}
                    />
                  </View>
                </GlassCard>

                <View className="flex-row flex-wrap -mx-1.5">
                  <View className="w-1/2 px-1.5 mb-3">
                    <GlassCard style={{ padding: 14, minHeight: 84 }}>
                      <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Absen Masuk Awal</Text>
                      <Text className="font-inter-bold text-sm text-on-surface mt-2">
                        {formatTime(selectedCorrectionDetail.original_checkin)}
                      </Text>
                    </GlassCard>
                  </View>
                  <View className="w-1/2 px-1.5 mb-3">
                    <GlassCard style={{ padding: 14, minHeight: 84 }}>
                      <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Absen Pulang Awal</Text>
                      <Text className="font-inter-bold text-sm text-on-surface mt-2">
                        {formatTime(selectedCorrectionDetail.original_checkout)}
                      </Text>
                    </GlassCard>
                  </View>
                  <View className="w-1/2 px-1.5 mb-3">
                    <GlassCard style={{ padding: 14, minHeight: 84 }}>
                      <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Koreksi Masuk</Text>
                      <Text className="font-inter-bold text-sm text-on-surface mt-2">
                        {formatTime(selectedCorrectionDetail.corrected_checkin)}
                      </Text>
                    </GlassCard>
                  </View>
                  <View className="w-1/2 px-1.5 mb-3">
                    <GlassCard style={{ padding: 14, minHeight: 84 }}>
                      <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Koreksi Pulang</Text>
                      <Text className="font-inter-bold text-sm text-on-surface mt-2">
                        {formatTime(selectedCorrectionDetail.corrected_checkout)}
                      </Text>
                    </GlassCard>
                  </View>
                </View>

                <GlassCard style={{ padding: 14, marginBottom: 14 }}>
                  <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Alasan</Text>
                  <Text className="font-inter text-sm text-on-surface mt-2 leading-6">
                    {selectedCorrectionDetail.reason || '-'}
                  </Text>
                </GlassCard>

                {selectedCorrectionDetail.notes ? (
                  <GlassCard style={{ padding: 14, marginBottom: 14 }}>
                    <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Catatan HRD</Text>
                    <Text className="font-inter text-sm text-on-surface mt-2 leading-6">
                      {selectedCorrectionDetail.notes}
                    </Text>
                  </GlassCard>
                ) : null}

                {selectedCorrectionFeedback?.data?.length ? (
                  <GlassCard style={{ padding: 14, marginBottom: 14 }}>
                    <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Diproses Oleh</Text>
                    <View className="mt-3 gap-3">
                      {selectedCorrectionFeedback.data.map((item) => (
                        <View key={item.id} className="rounded-2xl bg-black/5 px-4 py-3">
                          <View className="flex-row items-start justify-between gap-3">
                            <View className="flex-1">
                              <Text className="font-inter-bold text-sm text-on-surface">
                                {item.hr_name || 'HR Admin'}
                              </Text>
                              <Text className="font-inter text-[11px] text-text-muted mt-1">
                                {item.action === 'APPROVE' ? 'Disetujui' : item.action === 'REJECT' ? 'Ditolak' : 'Diproses'} • {new Date(item.created_at).toLocaleString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
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
        message="Pengajuan Anda sedang meluncur ke HRD."
        onDone={() => {
          setShowSuccessAnim(false);
          resetForm();
        }}
      />
    </SafeAreaView>
  );
}

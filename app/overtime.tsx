import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
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
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/ui/Button';
import { GlassCard } from '../src/components/ui/GlassCard';
import { Input } from '../src/components/ui/Input';
import { SuccessAnimation } from '../src/components/ui/SuccessAnimation';
import { StatusBadge } from '../src/components/ui/StatusBadge';
import { Tokens } from '../src/core/theme/tokens';
import { getAttendanceBadgeProps } from '../src/utils/status';
import { attendanceService } from '../src/services/attendance.service';
import { overtimeService } from '../src/services/overtime.service';
import { useAuthStore } from '../src/stores/auth.store';
import { AttendanceItem } from '../src/types/attendance';
import { CreateOvertimeRequest, OvertimeType } from '../src/types/overtime';

type OvertimeMode = 'attendance' | 'pre_submit';
type TimeField = 'start_time' | 'end_time';

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2);
  const minutes = index % 2 === 0 ? '00' : '30';
  return `${String(hours).padStart(2, '0')}:${minutes}`;
});

function toIsoDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function formatTime(timeStr?: string | null) {
  if (!timeStr) return '--:--';
  if (timeStr.includes('T')) return timeStr.split('T')[1].slice(0, 5);
  return timeStr.slice(0, 5);
}

function getOvertimeStatus(item: any) {
  const rawStatus = String(item?.status || item?.overtime_status || '').toUpperCase();
  if (rawStatus === 'APPROVED' || item?.is_approved || item?.approved_at) return 'APPROVED';
  if (rawStatus === 'REJECTED' || rawStatus === 'DECLINED') return 'REJECTED';
  if (rawStatus === 'CANCELLED') return 'CANCELLED';
  return 'PENDING';
}

export default function OvertimeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [attendancePickerVisible, setAttendancePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timeField, setTimeField] = useState<TimeField>('start_time');
  const [mode, setMode] = useState<OvertimeMode>('attendance');
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [form, setForm] = useState<CreateOvertimeRequest>({
    attendance_id: null,
    overtime_date: new Date().toISOString().slice(0, 10),
    start_time: '',
    end_time: '',
    overtime_type: 'REGULAR',
    reason: '',
  });

  const currentMonthParams = useMemo(() => ({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  }), []);

  const overtimeTypes: OvertimeType[] = ['REGULAR', 'HOLIDAY', 'OFF_DAY'];

  const { data: summary } = useQuery({
    queryKey: ['overtime-summary', user?.id],
    queryFn: () => overtimeService.getSummary(user?.id || '', currentMonthParams),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const { data: history = [], refetch: refetchHistory, isFetching: isFetchingHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['overtime-history', user?.id],
    queryFn: () => overtimeService.listRecords({
      employee_id: user?.id,
      ...currentMonthParams,
      limit: 50,
    }),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const { data: attendanceHistory = [], isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['attendance-history-pick', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 30);
      return attendanceService.getAttendanceHistory({
        employee_id: user.id,
        date_from: dateFrom.toISOString().split('T')[0],
        date_to: dateTo.toISOString().split('T')[0],
        limit: 50,
      });
    },
    enabled: attendancePickerVisible && !!user?.id,
  });

  const selectableAttendanceHistory = useMemo(
    () => attendanceHistory.filter((item) => !!(item.checkout_at || item.checkout_time)),
    [attendanceHistory],
  );

  const createMutation = useMutation({
    mutationFn: (payload: CreateOvertimeRequest) => overtimeService.createRecord(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['overtime-history', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['overtime-summary', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['home-overtime-feed'] }),
        queryClient.invalidateQueries({ queryKey: ['activity-overtime-feed'] }),
        queryClient.refetchQueries({ queryKey: ['overtime-history', user?.id], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['overtime-summary', user?.id], type: 'active' }),
      ]);
      setModalVisible(false);
      setAttendancePickerVisible(false);
      setTimePickerVisible(false);
      setShowSuccessAnim(true);
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to submit overtime');
    },
  });

  const onRefresh = () => {
    refetchHistory();
  };

  const resetAndClose = () => {
    setModalVisible(false);
    setAttendancePickerVisible(false);
    setTimePickerVisible(false);
    setShowSuccessAnim(false);
  };

  const handlePickAttendance = (attendance: AttendanceItem) => {
    setForm(prev => ({
      ...prev,
      attendance_id: attendance.id,
      overtime_date: attendance.attendance_date || attendance.date || prev.overtime_date,
    }));
    setAttendancePickerVisible(false);
  };

  const handleSelectTime = (value: string) => {
    setForm(prev => {
      const next = { ...prev };
      next[timeField] = value;
      return next;
    });
    setTimePickerVisible(false);
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
      Alert.alert('Error', 'Pilih tanggal overtime');
      return;
    }
    if (!form.start_time || !form.end_time) {
      Alert.alert('Error', 'Pilih start time dan end time');
      return;
    }

    createMutation.mutate({
      ...form,
      attendance_id: mode === 'attendance' ? form.attendance_id : null,
      overtime_date: form.overtime_date,
      start_time: toIsoDateTime(form.overtime_date, formatTime(form.start_time)),
      end_time: toIsoDateTime(form.overtime_date, formatTime(form.end_time)),
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

  const attendanceLabel = useMemo(() => {
    if (!form.attendance_id) return 'Pilih attendance';
    const attendance = selectableAttendanceHistory.find(item => item.id === form.attendance_id);
    return attendance
      ? `${attendance.attendance_date || attendance.date || '-'} · ${formatTime(attendance.checkin_at || attendance.checkin_time)}`
      : 'Attendance terpilih';
  }, [form.attendance_id, selectableAttendanceHistory]);

  const selectedTimeLabel = (field: TimeField) => {
    const value = form[field];
    if (!value) return 'Pilih jam';
    return value.includes('T') ? value.slice(11, 16) : value.slice(0, 5);
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
            <Text className="font-manrope-extrabold text-3xl text-primary">Overtime</Text>
            <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Ajukan lembur dari attendance atau pre-submit</Text>
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
          <Text className="font-manrope-bold text-base text-primary mb-3">Bulan Ini</Text>
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
              <Text className="font-inter-semibold text-[10px] text-text-muted uppercase tracking-wider mb-1">Estimasi</Text>
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

        <View className="flex-row justify-between items-center mb-4">
          <Text className="font-manrope-bold text-lg text-primary">Riwayat Lembur</Text>
          <View className="bg-primary/10 px-3 py-1 rounded-full">
            <Text className="font-inter-bold text-[10px] text-primary">{history.length} Records</Text>
          </View>
        </View>

        {isLoadingHistory ? (
          <Text className="font-inter text-sm text-text-muted mt-4">Memuat riwayat...</Text>
        ) : history.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', padding: 40, marginTop: 10 }}>
            <MaterialIcons name="work-history" size={48} color={Tokens.colors.outline} />
            <Text className="font-inter-medium text-sm text-text-muted mt-3 text-center">Belum ada riwayat lembur</Text>
          </GlassCard>
        ) : (
          history.map((item) => {
            const status = getOvertimeStatus(item);
            return (
              <GlassCard key={item.id} style={{ marginBottom: 12, padding: 16 }}>
                <View className="flex-row justify-between items-start mb-2.5">
                  <View className="flex-1">
                    <Text className="font-inter-bold text-[11px] text-text-muted uppercase mb-1 tracking-widest">
                      Pengajuan Lembur
                    </Text>
                    <View className="flex-row items-center gap-1.5 mb-1.5">
                      <MaterialIcons name="calendar-today" size={12} color={Tokens.colors.primary} />
                      <Text className="font-inter-bold text-sm text-black">
                        {item.attendance_date || item.overtime_date || item.created_at?.split('T')[0] || '-'}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-3">
                      <View className="flex-row items-center gap-1">
                        <MaterialIcons name="history" size={12} color={Tokens.colors.primary} />
                        <Text className="font-inter-bold text-xs text-primary">
                          {item.overtime_hours ? `${item.overtime_hours} Jam` : item.overtime_minutes ? `${item.overtime_minutes} Menit` : '-'}
                        </Text>
                      </View>
                      <View className="w-1 h-1 rounded-full bg-outline/30" />
                      <Text className="font-inter-bold text-[10px] text-text-muted uppercase tracking-tighter">
                        {item.overtime_type?.replace('_', ' ')}
                      </Text>
                    </View>
                    {(item.start_time || item.end_time) && (
                      <View className="flex-row items-center gap-1 mt-1.5">
                        <MaterialIcons name="schedule" size={12} color={Tokens.colors.textMuted} />
                        <Text className="font-inter text-xs text-text-muted">
                          {formatTime(item.start_time)} - {formatTime(item.end_time)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View className="items-end">
                    <StatusBadge
                      label={status}
                      type={getStatusType(status) as any}
                    />
                    {!!item.overtime_amount && item.overtime_amount > 0 && (
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
            );
          })
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={resetAndClose}
      >
        <View className="flex-1 bg-primary/40 justify-end">
          <View className="bg-background rounded-t-[32px] p-6 max-h-[92%] shadow-2xl">
            <View className="flex-row justify-between items-start mb-4">
              <View>
                <Text className="font-manrope-extrabold text-2xl text-primary">Ajukan Lembur</Text>
                <Text className="font-inter-medium text-xs text-text-muted mt-0.5">Pilih mode pengajuan</Text>
              </View>
              <Pressable className="w-9 h-9 rounded-full bg-black/5 items-center justify-center" onPress={resetAndClose}>
                <MaterialIcons name="close" size={20} color={Tokens.colors.text} />
              </Pressable>
            </View>

            <View className="flex-row gap-2 mb-5">
              <Pressable
                onPress={() => setMode('attendance')}
                className={`flex-1 py-3 rounded-xl border items-center ${mode === 'attendance' ? 'bg-primary border-primary' : 'bg-[#f8f8f8] border-transparent'}`}
              >
                <Text className={`font-inter-bold text-[10px] ${mode === 'attendance' ? 'text-white' : 'text-text-muted'}`}>From Attendance</Text>
              </Pressable>
              <Pressable
                onPress={() => setMode('pre_submit')}
                className={`flex-1 py-3 rounded-xl border items-center ${mode === 'pre_submit' ? 'bg-primary border-primary' : 'bg-[#f8f8f8] border-transparent'}`}
              >
                <Text className={`font-inter-bold text-[10px] ${mode === 'pre_submit' ? 'text-white' : 'text-text-muted'}`}>Pre Submit</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {mode === 'attendance' ? (
                <View className="mb-4">
                  <Text className="font-inter-bold text-sm text-primary mb-3 ml-1">Pilih Kehadiran</Text>
                  <Pressable
                    className="flex-row items-center justify-between px-4 py-3 rounded-xl bg-[#f8f8f8]"
                    onPress={() => setAttendancePickerVisible(true)}
                  >
                    <View className="flex-1 pr-3">
                      <Text className="font-inter-bold text-sm text-on-surface" numberOfLines={1}>{attendanceLabel}</Text>
                      <Text className="font-inter-medium text-[10px] text-text-muted mt-1">Tap untuk pilih dari daftar kehadiran</Text>
                    </View>
                    <MaterialIcons name="keyboard-arrow-down" size={22} color={Tokens.colors.textMuted} />
                  </Pressable>
                </View>
              ) : (
                <View className="mb-4">
                  <Text className="font-inter-bold text-sm text-primary mb-3 ml-1">Tanggal Overtime</Text>
                  <GlassCard style={{ padding: 10 }}>
                    <Calendar
                      current={form.overtime_date}
                      minDate={new Date().toISOString().slice(0, 10)}
                      onDayPress={(day) => setForm(prev => ({ ...prev, overtime_date: day.dateString }))}
                      markedDates={markedAttendanceDate}
                      theme={{
                        backgroundColor: 'transparent',
                        calendarBackground: 'transparent',
                        textSectionTitleColor: Tokens.colors.primary,
                        selectedDayBackgroundColor: Tokens.colors.primary,
                        selectedDayTextColor: '#ffffff',
                        todayTextColor: Tokens.colors.primary,
                        dayTextColor: Tokens.colors.text,
                        textDisabledColor: Tokens.colors.outline,
                        arrowColor: Tokens.colors.primary,
                        monthTextColor: Tokens.colors.primary,
                        textDayFontFamily: 'Inter_400Regular',
                        textMonthFontFamily: 'Manrope_700Bold',
                        textDayHeaderFontFamily: 'Inter_700Bold',
                      }}
                      style={{ borderRadius: 16 }}
                    />
                  </GlassCard>
                </View>
              )}

              <Text className="font-inter-bold text-sm text-primary mb-3 ml-1">Tipe Lembur</Text>
              <View className="flex-row gap-2 mb-5">
                {overtimeTypes.map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setForm(prev => ({ ...prev, overtime_type: type }))}
                    className={`flex-1 py-3 rounded-xl border items-center ${form.overtime_type === type ? 'bg-primary border-primary' : 'bg-[#f8f8f8] border-transparent'}`}
                  >
                    <Text className={`font-inter-bold text-[10px] ${form.overtime_type === type ? 'text-white' : 'text-text-muted'}`}>{type}</Text>
                  </Pressable>
                ))}
              </View>

              <Text className="font-inter-bold text-sm text-primary mb-3 ml-1">Waktu Lembur</Text>
              <View className="flex-row gap-3 mb-5">
                <Pressable
                  className="flex-1 px-4 py-3 rounded-xl bg-[#f8f8f8]"
                  onPress={() => {
                    setTimeField('start_time');
                    setTimePickerVisible(true);
                  }}
                >
                  <Text className="font-inter-bold text-[10px] text-text-muted uppercase tracking-wider">Start</Text>
                  <Text className="font-inter-bold text-sm text-on-surface mt-1">{selectedTimeLabel('start_time')}</Text>
                </Pressable>
                <Pressable
                  className="flex-1 px-4 py-3 rounded-xl bg-[#f8f8f8]"
                  onPress={() => {
                    setTimeField('end_time');
                    setTimePickerVisible(true);
                  }}
                >
                  <Text className="font-inter-bold text-[10px] text-text-muted uppercase tracking-wider">End</Text>
                  <Text className="font-inter-bold text-sm text-on-surface mt-1">{selectedTimeLabel('end_time')}</Text>
                </Pressable>
              </View>

              <Input
                label="Alasan Lembur (Opsional)"
                value={form.reason}
                onChangeText={(text) => setForm(prev => ({ ...prev, reason: text }))}
                placeholder="Selesaikan laporan bulanan..."
                multiline
                numberOfLines={3}
                style={{ height: 80, textAlignVertical: 'top', paddingTop: 12 }}
              />

              <Button
                title="Kirim Pengajuan"
                onPress={handleCreate}
                loading={createMutation.isPending}
                disabled={createMutation.isPending}
                className="mt-4 h-14 rounded-2xl"
              />
              <View className="h-8" />
            </ScrollView>

            {(attendancePickerVisible || timePickerVisible) ? (
              <View className="absolute inset-0">
                <Pressable
                  className="absolute inset-0 bg-black/40"
                  onPress={() => {
                    setAttendancePickerVisible(false);
                    setTimePickerVisible(false);
                  }}
                />

                {attendancePickerVisible ? (
                  <View className="absolute inset-x-0 bottom-0 bg-background rounded-t-[28px] p-5 max-h-[80%]">
                    <View className="flex-row justify-between items-center mb-4">
                      <View>
                        <Text className="font-manrope-bold text-xl text-primary">Pilih Kehadiran</Text>
                        <Text className="font-inter text-xs text-text-muted">Scroll lalu tap salah satu attendance</Text>
                      </View>
                      <Pressable onPress={() => setAttendancePickerVisible(false)} className="w-9 h-9 rounded-full bg-black/5 items-center justify-center">
                        <MaterialIcons name="close" size={18} color={Tokens.colors.text} />
                      </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                      {isLoadingAttendance ? (
                        <Text className="font-inter text-sm text-text-muted py-6 text-center">Memuat attendance...</Text>
                      ) : attendanceHistory.length === 0 ? (
                        <View className="p-4 bg-black/5 rounded-xl border border-dashed border-outline">
                          <Text className="font-inter text-xs text-text-muted text-center">Tidak ada data kehadiran terbaru</Text>
                        </View>
                      ) : (
                        selectableAttendanceHistory.slice(0, 30).map((att) => {
                          const isSelected = form.attendance_id === att.id;
                          return (
                            <Pressable
                              key={att.id}
                              className={`p-4 rounded-xl border mb-2 ${isSelected ? 'bg-primary/5 border-primary' : 'bg-[#f8f8f8] border-transparent'}`}
                              onPress={() => handlePickAttendance(att)}
                            >
                              <View className="flex-row justify-between items-center">
                                <View className="flex-row items-center gap-3 flex-1">
                                  <View className={`w-8 h-8 rounded-full items-center justify-center ${isSelected ? 'bg-primary' : 'bg-outline/20'}`}>
                                    <MaterialIcons name="event" size={14} color={isSelected ? '#fff' : Tokens.colors.textMuted} />
                                  </View>
                                  <View className="flex-1">
                                    <View className="flex-row items-center gap-2">
                                      <Text className={`font-inter-bold text-sm ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                                        {att.attendance_date || att.date}
                                      </Text>
                                      {att.attendance_status && (() => {
                                        const badgeProps = getAttendanceBadgeProps(att.attendance_status);
                                        return (
                                          <View className={`px-1.5 py-0.5 rounded-md ${badgeProps.bgClass}`}>
                                            <Text className={`font-inter-bold text-[8px] ${badgeProps.textClass}`}>
                                              {badgeProps.label}
                                            </Text>
                                          </View>
                                        );
                                      })()}
                                    </View>
                                    <Text className="font-inter-medium text-[10px] text-text-muted">
                                      {formatTime(att.checkin_at || att.checkin_time)} - {formatTime(att.checkout_at || att.checkout_time)}
                                    </Text>
                                  </View>
                                </View>
                                {isSelected ? <MaterialIcons name="check-circle" size={20} color={Tokens.colors.primary} /> : null}
                              </View>
                            </Pressable>
                          );
                        })
                      )}
                    </ScrollView>
                  </View>
                ) : null}

                {timePickerVisible ? (
                  <View className="absolute inset-x-0 bottom-0 bg-background rounded-t-[28px] p-5 max-h-[70%]">
                    <View className="flex-row justify-between items-center mb-4">
                      <View>
                        <Text className="font-manrope-bold text-xl text-primary">Pilih Jam</Text>
                        <Text className="font-inter text-xs text-text-muted">Scroll untuk memilih {timeField === 'start_time' ? 'start time' : 'end time'}</Text>
                      </View>
                      <Pressable onPress={() => setTimePickerVisible(false)} className="w-9 h-9 rounded-full bg-black/5 items-center justify-center">
                        <MaterialIcons name="close" size={18} color={Tokens.colors.text} />
                      </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                      {TIME_OPTIONS.map((value) => {
                        const active = selectedTimeLabel(timeField) === value;
                        return (
                          <Pressable
                            key={value}
                            onPress={() => handleSelectTime(value)}
                            className={`px-4 py-3 rounded-xl mb-2 ${active ? 'bg-primary/5 border border-primary' : 'bg-[#f8f8f8]'}`}
                          >
                            <Text className={`font-inter-bold text-sm ${active ? 'text-primary' : 'text-on-surface'}`}>{value}</Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            ) : null}
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

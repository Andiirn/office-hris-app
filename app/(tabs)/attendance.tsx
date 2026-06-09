import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/ui/Button';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { Input } from '../../src/components/ui/Input';
import { SkeletonCard } from '../../src/components/ui/Skeleton';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { api } from '../../src/core/api/client';
import { unwrapData } from '../../src/core/api/envelope';
import { Tokens } from '../../src/core/theme/tokens';
import { attendanceService } from '../../src/services/attendance.service';
import { useAuthStore } from '../../src/stores/auth.store';
import { AttendanceItem } from '../../src/types/attendance';
import { AttendanceCorrectionRecord, AttendanceCorrectionRequest } from '../../src/types/attendance-correction';

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

function getAttendanceStatus(item: any) {
  return item.attendance_status || item.status || 'PRESENT';
}

function getCheckIn(item: any) {
  return item.checkin_at || item.checkin_time;
}

function getCheckOut(item: any) {
  return item.checkout_at || item.checkout_time;
}

async function listCorrections(query?: { employee_id?: string; limit?: number }) {
  const response = await api.get('/attendance/corrections', { params: query });
  const data: any = unwrapData(response.data);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && data.data && Array.isArray(data.data.items)) return data.data.items;
  if (data && data.results && Array.isArray(data.results)) return data.results;
  if (data && data.data && data.data.results && Array.isArray(data.data.results)) return data.data.results;
  return [];
}

async function createCorrection(payload: AttendanceCorrectionRequest) {
  const response = await api.post('/attendance/corrections', payload);
  return unwrapData<AttendanceCorrectionRecord>(response.data);
}

function getPeriodDates(offset = 0) {
  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth();
  const day = today.getDate();
  let anchorMonth = day >= 26 ? month + 1 : month;
  anchorMonth += offset;
  const startDate = new Date(year, anchorMonth - 1, 26);
  const endDate = new Date(year, anchorMonth, 25);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateFrom = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`;
  const dateTo = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;
  const todayString = today.toISOString().slice(0, 10);
  return { startDate, endDate, dateFrom, dateTo: endDate > today ? todayString : dateTo };
}

function TimePicker({ visible, title, initialHour, initialMinute, onSave, onClose }: {
  visible: boolean;
  title: string;
  initialHour: string;
  initialMinute: string;
  onSave: (hour: string, minute: string) => void;
  onClose: () => void;
}) {
  const [selectedHour, setSelectedHour] = React.useState(initialHour);
  const [selectedMinute, setSelectedMinute] = React.useState(initialMinute);

  React.useEffect(() => {
    setSelectedHour(initialHour);
    setSelectedMinute(initialMinute);
  }, [initialHour, initialMinute, visible]);

  if (!visible) return null;

  const handleSave = () => {
    const hh = String(parseInt(selectedHour || '0', 10) || 0).padStart(2, '0');
    const mm = String(parseInt(selectedMinute || '0', 10) || 0).padStart(2, '0');
    onSave(hh.slice(-2), mm.slice(-2));
  };

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
    >
      <View className="bg-background rounded-3xl w-full max-w-[300px] overflow-hidden shadow-2xl border border-white/80 p-5 items-center">
        <View className="w-full flex-row justify-between items-center mb-3">
          <Text className="font-manrope-bold text-sm text-text-muted">{title}</Text>
          <TouchableOpacity className="w-7 h-7 rounded-full bg-black/5 items-center justify-center" onPress={onClose} activeOpacity={0.7}>
            <MaterialIcons name="close" size={16} color={Tokens.colors.primary} />
          </TouchableOpacity>
        </View>

        <View className="w-full gap-3 mb-4">
          <View className="bg-primary/5 rounded-2xl border border-primary/10 px-4 py-3">
            <Text className="font-inter-bold text-[11px] text-text-muted uppercase mb-2">Jam</Text>
            <TextInput
              value={selectedHour}
              onChangeText={(text) => setSelectedHour(text.replace(/[^0-9]/g, '').slice(0, 2))}
              keyboardType="number-pad"
              maxLength={2}
              className="font-manrope-extrabold text-3xl text-primary py-0"
              textAlign="center"
            />
          </View>

          <View className="bg-primary/5 rounded-2xl border border-primary/10 px-4 py-3">
            <Text className="font-inter-bold text-[11px] text-text-muted uppercase mb-2">Menit</Text>
            <TextInput
              value={selectedMinute}
              onChangeText={(text) => setSelectedMinute(text.replace(/[^0-9]/g, '').slice(0, 2))}
              keyboardType="number-pad"
              maxLength={2}
              className="font-manrope-extrabold text-3xl text-primary py-0"
              textAlign="center"
            />
          </View>
        </View>

        <TouchableOpacity
          className="bg-primary w-full py-3.5 rounded-2xl items-center justify-center shadow-md active:opacity-90"
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text className="font-inter-bold text-sm text-white">Simpan Waktu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AttendanceScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [periodOffset, setPeriodOffset] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceItem | null>(null);
  const [reason, setReason] = useState('');
  const [checkinExists, setCheckinExists] = useState(true);
  const [checkoutExists, setCheckoutExists] = useState(true);

  // Dropdown states for hour and minute selection
  const [correctedCheckinHour, setCorrectedCheckinHour] = useState('08');
  const [correctedCheckinMin, setCorrectedCheckinMin] = useState('00');
  const [correctedCheckoutHour, setCorrectedCheckoutHour] = useState('17');
  const [correctedCheckoutMin, setCorrectedCheckoutMin] = useState('00');
  const [pickerTarget, setPickerTarget] = useState<'checkin' | 'checkout' | null>(null);

  const period = useMemo(() => getPeriodDates(periodOffset), [periodOffset]);

  const { data: history = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['attendance-history-full', user?.id, period.dateFrom, period.dateTo],
    queryFn: () => attendanceService.getAttendanceHistory({
      employee_id: user?.id,
      date_from: period.dateFrom,
      date_to: period.dateTo,
      limit: 100,
    }),
    enabled: !!user?.id,
  });

  const { data: corrections = [], refetch: refetchCorrections, isFetching: isFetchingCorrections } = useQuery({
    queryKey: ['attendance-corrections', user?.id],
    queryFn: () => listCorrections({ employee_id: user?.id, limit: 50 }),
    enabled: !!user?.id,
  });

  const correctionsByAttendanceId = useMemo(() => {
    const sorted = [...corrections].sort((a: AttendanceCorrectionRecord, b: AttendanceCorrectionRecord) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

    return sorted.reduce((acc, item: AttendanceCorrectionRecord) => {
      if (!item.attendance_id) return acc;
      acc[item.attendance_id] = item;
      return acc;
    }, {} as Record<string, AttendanceCorrectionRecord>);
  }, [corrections]);

  const createMutation = useMutation({
    mutationFn: (payload: AttendanceCorrectionRequest) => createCorrection(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['attendance-corrections'] }),
        queryClient.invalidateQueries({ queryKey: ['attendance-history-full'] }),
      ]);
      setSelectedAttendance(null);
      setReason('');
      setModalVisible(false);
      Alert.alert('Success', 'Pengajuan koreksi berhasil dikirim');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Gagal mengirim koreksi');
    },
  });

  const onRefresh = () => {
    refetch();
    refetchCorrections();
  };

  const openCorrection = (item: AttendanceItem) => {
    setSelectedAttendance(item);
    setReason('');

    // Pre-fill checkin time
    const checkin = getCheckIn(item);
    if (checkin) {
      const timeStr = formatTime(checkin); // "HH:mm"
      const [h, m] = timeStr.split(':');
      setCorrectedCheckinHour(h);
      setCorrectedCheckinMin(m);
      setCheckinExists(true);
    } else {
      setCorrectedCheckinHour('--');
      setCorrectedCheckinMin('--');
      setCheckinExists(false);
    }

    // Pre-fill checkout time
    const checkout = getCheckOut(item);
    if (checkout) {
      const timeStr = formatTime(checkout); // "HH:mm"
      const [h, m] = timeStr.split(':');
      setCorrectedCheckoutHour(h);
      setCorrectedCheckoutMin(m);
      setCheckoutExists(true);
    } else {
      setCorrectedCheckoutHour('--');
      setCorrectedCheckoutMin('--');
      setCheckoutExists(false);
    }

    setModalVisible(true);
  };

  const submitCorrection = () => {
    if (!selectedAttendance?.id) {
      Alert.alert('Error', 'Pilih attendance terlebih dahulu');
      return;
    }
    if (reason.trim().length < 5) {
      Alert.alert('Error', 'Alasan minimal 5 karakter');
      return;
    }
    const dateStr = getAttendanceDate(selectedAttendance);
    const corrected_checkin = checkinExists ? `${dateStr}T${correctedCheckinHour}:${correctedCheckinMin}:00` : null;
    const corrected_checkout = checkoutExists ? `${dateStr}T${correctedCheckoutHour}:${correctedCheckoutMin}:00` : null;

    createMutation.mutate({
      attendance_id: selectedAttendance.id,
      reason: reason.trim(),
      corrected_checkin,
      corrected_checkout,
    });
  };

  const getStatusType = (status?: string) => {
    switch (status) {
      case 'PRESENT': return 'secondary';
      case 'LATE': return 'error';
      case 'ABSENT': return 'error';
      default: return 'secondary';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute top-20 -right-20 w-64 h-64 rounded-full bg-primary/10" />
      <View className="absolute bottom-10 -left-20 w-72 h-72 rounded-full bg-secondary-container/15" />

      <View className="px-5 pt-2 pb-3 z-10">
        <Text className="font-manrope-extrabold text-3xl text-primary">Absensi</Text>
        <Text className="font-inter-medium text-sm text-text-muted mt-0.5">History absensi dan koreksi per item</Text>
      </View>

      <View className="px-5 pb-4 flex-row justify-between items-center z-10">
        <Pressable
          onPress={() => setPeriodOffset(prev => prev - 1)}
          className="w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm active:opacity-60"
        >
          <MaterialIcons name="chevron-left" size={24} color={Tokens.colors.primary} />
        </Pressable>

        <View className="bg-white/80 border border-white/90 px-4 py-2 rounded-2xl items-center justify-center flex-1 mx-3 shadow-sm">
          <Text className="font-inter-bold text-[13px] text-primary">
            {period.startDate.toISOString().slice(0, 10)} - {period.endDate.toISOString().slice(0, 10)}
          </Text>
          <Text className="font-inter text-[9px] text-text-muted mt-0.5 uppercase tracking-wider">
            Periode Gaji & Absensi
          </Text>
        </View>

        <Pressable
          onPress={() => {
            if (periodOffset < 0) setPeriodOffset(prev => prev + 1);
          }}
          disabled={periodOffset >= 0}
          className={`w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm ${periodOffset >= 0 ? 'opacity-30' : 'active:opacity-60'}`}
        >
          <MaterialIcons name="chevron-right" size={24} color={Tokens.colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching || isFetchingCorrections} onRefresh={onRefresh} tintColor={Tokens.colors.primary} />}
      >
        {isLoading ? (
          <View className="mt-2">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : history.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', padding: 40, marginTop: 20 }}>
            <MaterialIcons name="event-busy" size={64} color={Tokens.colors.outline} />
            <Text className="font-manrope-bold text-lg text-primary mt-4">No records found</Text>
            <Text className="font-inter text-sm text-text-muted text-center mt-2">
              {"You haven't recorded any attendance for this period."}
            </Text>
          </GlassCard>
        ) : (
          <View className="gap-3">
            {history.map((item) => (
              <GlassCard key={item.id} style={{ padding: 16 }}>
                <View className="flex-row justify-between items-center mb-4">
                  <View className="flex-row items-center gap-2">
                    <MaterialIcons name="calendar-today" size={16} color={Tokens.colors.primary} />
                    <Text className="font-inter-bold text-base text-black">{getAttendanceDate(item)}</Text>
                  </View>
                  <StatusBadge label={getAttendanceStatus(item)} type={getStatusType(getAttendanceStatus(item)) as any} />
                </View>

                <View className="flex-row justify-between bg-black/5 p-3 rounded-xl">
                  <View className="items-center flex-1">
                    <Text className="font-inter-semibold text-[10px] text-text-muted uppercase mb-1">Check In</Text>
                    <Text className="font-manrope-extrabold text-lg text-primary">{formatTime(getCheckIn(item))}</Text>
                  </View>
                  <View className="w-[1px] bg-black/10 mx-2" />
                  <View className="items-center flex-1">
                    <Text className="font-inter-semibold text-[10px] text-text-muted uppercase mb-1">Check Out</Text>
                    <Text className="font-manrope-extrabold text-lg text-primary">{formatTime(getCheckOut(item))}</Text>
                  </View>
                </View>

                {correctionsByAttendanceId[item.id] ? (
                  <View className="mt-3 rounded-xl border border-primary/10 bg-primary/5 px-3 py-3">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center gap-2">
                        <MaterialIcons name="fact-check" size={16} color={Tokens.colors.primary} />
                        <Text className="font-inter-bold text-xs text-primary uppercase tracking-wider">Koreksi absensi</Text>
                      </View>
                      <StatusBadge label={correctionsByAttendanceId[item.id].status || 'PENDING'} type={getStatusType(correctionsByAttendanceId[item.id].status) as any} />
                    </View>
                    <Text className="font-inter text-xs text-text-muted">
                      {correctionsByAttendanceId[item.id].reason}
                    </Text>
                    <View className="mt-2 flex-row items-center justify-between">
                      <Text className="font-inter-bold text-xs text-primary">
                        Check In: {formatTime(correctionsByAttendanceId[item.id].corrected_checkin)}
                      </Text>
                      <Text className="font-inter-bold text-xs text-primary">
                        Check Out: {formatTime(correctionsByAttendanceId[item.id].corrected_checkout)}
                      </Text>
                    </View>
                  </View>
                ) : null}

                <Pressable
                  className="mt-3 flex-row items-center justify-center gap-2 bg-primary/5 rounded-xl py-3"
                  onPress={() => openCorrection(item)}
                >
                  <MaterialIcons name="fact-check" size={16} color={Tokens.colors.primary} />
                  <Text className="font-inter-bold text-sm text-primary">Ajukan koreksi</Text>
                </Pressable>
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-background rounded-t-[32px] p-6 max-h-[90%] shadow-2xl">
            <View className="flex-row justify-between items-start mb-4">
              <View>
                <Text className="font-manrope-extrabold text-2xl text-primary">Koreksi Absensi</Text>
                <Text className="font-inter-medium text-xs text-text-muted mt-0.5">
                  {selectedAttendance ? getAttendanceDate(selectedAttendance) : 'Pilih attendance'}
                </Text>
              </View>
              <Pressable className="w-9 h-9 rounded-full bg-black/5 items-center justify-center" onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={20} color={Tokens.colors.text} />
              </Pressable>
            </View>

            <View className="flex-row gap-3 mb-4">
              {/* Check In Column */}
              <View className="flex-1 bg-white border border-black/5 rounded-2xl p-3 shadow-sm">
                <Text className="font-inter-bold text-[10px] text-text-muted uppercase mb-1">Check In Awal</Text>
                <Pressable
                  className="bg-primary/5 rounded-2xl border border-primary/10 px-3 py-4 active:opacity-60"
                  onPress={() => setPickerTarget('checkin')}
                >
                  <View className="items-center">
                    {checkinExists ? (
                      <>
                        <Text className="font-manrope-extrabold text-[42px] leading-[46px] text-primary tracking-tight">
                          {correctedCheckinHour} : {correctedCheckinMin}
                        </Text>
                      </>
                    ) : (
                      <Text className="font-manrope-extrabold text-[34px] leading-[40px] text-text-muted tracking-tight">
                        --:--
                      </Text>
                    )}
                  </View>
                </Pressable>
                <Text className="font-inter text-[11px] text-text-muted mt-2 text-center">
                  Tap angka untuk edit jam koreksi
                </Text>
              </View>

              {/* Check Out Column */}
              <View className="flex-1 bg-white border border-black/5 rounded-2xl p-3 shadow-sm">
                <Text className="font-inter-bold text-[10px] text-text-muted uppercase mb-1">Check Out Awal</Text>
                <Pressable
                  className="bg-primary/5 rounded-2xl border border-primary/10 px-3 py-4 active:opacity-60"
                  onPress={() => setPickerTarget('checkout')}
                >
                  <View className="items-center">
                    {checkoutExists ? (
                      <>
                        <Text className="font-manrope-extrabold text-[42px] leading-[46px] text-primary tracking-tight">
                          {correctedCheckoutHour}:{correctedCheckoutMin}
                        </Text>
                      </>
                    ) : (
                      <Text className="font-manrope-extrabold text-[34px] leading-[40px] text-text-muted tracking-tight">
                        --:--
                      </Text>
                    )}
                  </View>
                </Pressable>
                <Text className="font-inter text-[11px] text-text-muted mt-2 text-center">
                  Tap angka untuk edit jam koreksi
                </Text>
              </View>
            </View>

            <Input
              label="Alasan Koreksi"
              value={reason}
              onChangeText={setReason}
              placeholder="Contoh: checkout tidak tercatat"
              multiline
              numberOfLines={3}
              style={{ height: 88, textAlignVertical: 'top', paddingTop: 12 }}
            />

            <Button
              title="Kirim Koreksi"
              onPress={submitCorrection}
              loading={createMutation.isPending}
              disabled={createMutation.isPending}
              className="h-14 rounded-2xl mt-2"
            />

            {selectedAttendance && correctionsByAttendanceId[selectedAttendance.id] ? (
              <View className="mt-5 rounded-2xl border border-primary/10 bg-white p-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="font-manrope-bold text-lg text-primary">Riwayat Koreksi</Text>
                  <StatusBadge label={correctionsByAttendanceId[selectedAttendance.id].status || 'PENDING'} type={getStatusType(correctionsByAttendanceId[selectedAttendance.id].status) as any} />
                </View>
                <Text className="font-inter text-sm text-text-muted">
                  {correctionsByAttendanceId[selectedAttendance.id].reason}
                </Text>
                <View className="mt-3 gap-2">
                  <Text className="font-inter-bold text-xs text-primary">
                    Check In Koreksi: {formatTime(correctionsByAttendanceId[selectedAttendance.id].corrected_checkin)}
                  </Text>
                  <Text className="font-inter-bold text-xs text-primary">
                    Check Out Koreksi: {formatTime(correctionsByAttendanceId[selectedAttendance.id].corrected_checkout)}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
          <TimePicker
            visible={pickerTarget !== null}
            title={pickerTarget === 'checkin' ? 'Koreksi Check In' : 'Koreksi Check Out'}
            initialHour={pickerTarget === 'checkin' ? correctedCheckinHour : correctedCheckoutHour}
            initialMinute={pickerTarget === 'checkin' ? correctedCheckinMin : correctedCheckoutMin}
            onSave={(h, m) => {
              if (pickerTarget === 'checkin') {
                setCorrectedCheckinHour(h);
                setCorrectedCheckinMin(m);
                setCheckinExists(true);
              } else {
                setCorrectedCheckoutHour(h);
                setCorrectedCheckoutMin(m);
                setCheckoutExists(true);
              }
              setPickerTarget(null);
              refetchCorrections();
            }}
            onClose={() => setPickerTarget(null)}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

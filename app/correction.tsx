import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/ui/Button';
import { GlassCard } from '../src/components/ui/GlassCard';
import { Input } from '../src/components/ui/Input';
import { SkeletonCard } from '../src/components/ui/Skeleton';
import { StatusBadge } from '../src/components/ui/StatusBadge';
import { Tokens } from '../src/core/theme/tokens';
import { attendanceService } from '../src/services/attendance.service';
import { useAuthStore } from '../src/stores/auth.store';
import { AttendanceItem } from '../src/types/attendance';
import { AttendanceCorrection, CorrectionRequest } from '../src/types/correction';

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

function getCheckIn(item: any) {
  return item.checkin_at || item.checkin_time;
}

function getCheckOut(item: any) {
  return item.checkout_at || item.checkout_time;
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
        zIndex: 2000
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

export default function CorrectionScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [attendancePickerVisible, setAttendancePickerVisible] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceItem | null>(null);
  const [reason, setReason] = useState('');
  const [checkinExists, setCheckinExists] = useState(true);
  const [checkoutExists, setCheckoutExists] = useState(true);

  // Time picker fields
  const [correctedCheckinHour, setCorrectedCheckinHour] = useState('08');
  const [correctedCheckinMin, setCorrectedCheckinMin] = useState('00');
  const [correctedCheckoutHour, setCorrectedCheckoutHour] = useState('17');
  const [correctedCheckoutMin, setCorrectedCheckoutMin] = useState('00');
  const [pickerTarget, setPickerTarget] = useState<'checkin' | 'checkout' | null>(null);

  // Fetch correction history
  const { data: corrections = [], isLoading: isLoadingHistory, refetch: refetchHistory, isFetching: isFetchingHistory, isError: isErrorHistory } = useQuery({
    queryKey: ['attendance-corrections', user?.id],
    queryFn: () => attendanceService.listCorrections({ employee_id: user?.id, limit: 100 }),
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
    enabled: attendancePickerVisible && !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CorrectionRequest) => attendanceService.createCorrection(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['attendance-corrections'] }),
        queryClient.invalidateQueries({ queryKey: ['attendance-history-full'] }),
      ]);
      resetForm();
      Alert.alert('Success', 'Pengajuan koreksi berhasil dikirim');
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
    setCorrectedCheckinHour('08');
    setCorrectedCheckinMin('00');
    setCorrectedCheckoutHour('17');
    setCorrectedCheckoutMin('00');
    setModalVisible(false);
  };

  const handlePickAttendance = (att: AttendanceItem) => {
    setSelectedAttendance(att);
    
    const checkin = getCheckIn(att);
    if (checkin) {
      const timeStr = formatTime(checkin);
      const [h, m] = timeStr.split(':');
      setCorrectedCheckinHour(h);
      setCorrectedCheckinMin(m);
      setCheckinExists(true);
    } else {
      setCorrectedCheckinHour('--');
      setCorrectedCheckinMin('--');
      setCheckinExists(false);
    }

    const checkout = getCheckOut(att);
    if (checkout) {
      const timeStr = formatTime(checkout);
      const [h, m] = timeStr.split(':');
      setCorrectedCheckoutHour(h);
      setCorrectedCheckoutMin(m);
      setCheckoutExists(true);
    } else {
      setCorrectedCheckoutHour('--');
      setCorrectedCheckoutMin('--');
      setCheckoutExists(false);
    }

    setAttendancePickerVisible(false);
  };

  const submitCorrection = () => {
    if (!selectedAttendance?.id) {
      Alert.alert('Error', 'Pilih data kehadiran terlebih dahulu');
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

  const attendanceLabel = useMemo(() => {
    if (!selectedAttendance) return 'Tap untuk pilih dari daftar';
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
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm active:opacity-60"
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <MaterialIcons name="arrow-back" size={22} color={Tokens.colors.primary} />
          </Pressable>
          <View className="flex-1">
            <Text className="font-manrope-extrabold text-3xl text-primary">Koreksi Absen</Text>
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
        {isLoadingHistory ? (
          <View className="mt-2">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : isErrorHistory ? (
          <GlassCard style={{ alignItems: 'center', padding: 32, marginTop: 20 }}>
            <MaterialIcons name="error-outline" size={48} color={Tokens.colors.error} />
            <Text className="font-manrope-bold text-base text-primary mt-4">Gagal Memuat Data</Text>
            <Text className="font-inter text-xs text-text-muted text-center mt-2 mb-4">
              Ada masalah saat mengambil riwayat koreksi. Silakan coba kembali.
            </Text>
            <Button title="Coba Lagi" onPress={onRefresh} style={{ width: 140 }} />
          </GlassCard>
        ) : corrections.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', padding: 40, marginTop: 20 }}>
            <MaterialIcons name="fact-check" size={64} color={Tokens.colors.outline} />
            <Text className="font-manrope-bold text-lg text-primary mt-4">Belum Ada Pengajuan</Text>
            <Text className="font-inter text-sm text-text-muted text-center mt-2 mb-4">
              Anda belum pernah mengajukan koreksi kehadiran atau data kosong.
            </Text>
            <Button title="Ajukan Koreksi Baru" onPress={() => setModalVisible(true)} />
          </GlassCard>
        ) : (
          <View className="gap-3">
            {corrections.map((item: AttendanceCorrection) => (
              <GlassCard key={item.id} style={{ padding: 16 }}>
                <View className="flex-row justify-between items-center mb-3">
                  <View className="flex-row items-center gap-2">
                    <MaterialIcons name="calendar-today" size={16} color={Tokens.colors.primary} />
                    <Text className="font-inter-bold text-base text-black">{item.attendance_date || '-'}</Text>
                  </View>
                  <StatusBadge label={item.status || 'PENDING'} type={getStatusType(item.status) as any} />
                </View>

                <View className="bg-black/5 p-3 rounded-xl mb-3">
                  <View className="flex-row justify-between mb-2">
                    <View className="items-center flex-1">
                      <Text className="font-inter-semibold text-[10px] text-text-muted uppercase mb-0.5">Koreksi Masuk</Text>
                      <Text className="font-manrope-extrabold text-base text-primary">
                        {item.corrected_checkin ? formatTime(item.corrected_checkin) : '--:--'}
                      </Text>
                    </View>
                    <View className="w-[1px] bg-black/10 mx-2" />
                    <View className="items-center flex-1">
                      <Text className="font-inter-semibold text-[10px] text-text-muted uppercase mb-0.5">Koreksi Pulang</Text>
                      <Text className="font-manrope-extrabold text-base text-primary">
                        {item.corrected_checkout ? formatTime(item.corrected_checkout) : '--:--'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="border-t border-black/5 pt-2.5">
                  <Text className="font-inter-semibold text-[10px] text-text-muted uppercase mb-1">Alasan</Text>
                  <Text className="font-inter text-xs text-on-surface">{item.reason}</Text>
                </View>

                {item.notes ? (
                  <View className="mt-2.5 border-t border-black/5 pt-2">
                    <Text className="font-inter-semibold text-[10px] text-error uppercase mb-1">Catatan HRD</Text>
                    <Text className="font-inter text-xs text-error italic">{item.notes}</Text>
                  </View>
                ) : null}
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Creation Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={resetForm}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-background rounded-t-[32px] p-6 max-h-[90%] shadow-2xl">
            <View className="flex-row justify-between items-start mb-4">
              <View>
                <Text className="font-manrope-extrabold text-2xl text-primary">Ajukan Koreksi</Text>
                <Text className="font-inter-medium text-xs text-text-muted mt-0.5">
                  Koreksi jam masuk/pulang kehadiran yang keliru
                </Text>
              </View>
              <Pressable className="w-9 h-9 rounded-full bg-black/5 items-center justify-center" onPress={resetForm}>
                <MaterialIcons name="close" size={20} color={Tokens.colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Select Attendance Field */}
              <View className="mb-4">
                <Text className="font-inter-bold text-sm text-primary mb-2">Pilih Kehadiran</Text>
                <Pressable
                  className="flex-row items-center justify-between px-4 py-3 rounded-xl bg-primary/5 border border-primary/10 active:opacity-60"
                  onPress={() => setAttendancePickerVisible(true)}
                >
                  <View className="flex-1 pr-3">
                    <Text className="font-inter-bold text-sm text-on-surface" numberOfLines={1}>
                      {selectedAttendance ? attendanceLabel : 'Tap untuk memilih data kehadiran'}
                    </Text>
                    {selectedAttendance && (
                      <Text className="font-inter-medium text-[10px] text-text-muted mt-0.5">
                        Jam awal: {formatTime(getCheckIn(selectedAttendance))} - {formatTime(getCheckOut(selectedAttendance))}
                      </Text>
                    )}
                  </View>
                  <MaterialIcons name="keyboard-arrow-down" size={22} color={Tokens.colors.textMuted} />
                </Pressable>
              </View>

              {selectedAttendance && (
                <>
                  <View className="flex-row gap-3 mb-4">
                    {/* Check In Column */}
                    <View className="flex-1 bg-white border border-black/5 rounded-2xl p-3 shadow-sm">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="font-inter-bold text-[10px] text-text-muted uppercase">Check In</Text>
                        <Pressable onPress={() => setCheckinExists(!checkinExists)}>
                          <MaterialIcons
                            name={checkinExists ? "check-box" : "check-box-outline-blank"}
                            size={18}
                            color={Tokens.colors.primary}
                          />
                        </Pressable>
                      </View>
                      <Pressable
                        className={`bg-primary/5 rounded-2xl border border-primary/10 px-3 py-4 ${!checkinExists && 'opacity-40'}`}
                        onPress={() => checkinExists && setPickerTarget('checkin')}
                        disabled={!checkinExists}
                      >
                        <View className="items-center">
                          {checkinExists ? (
                            <Text className="font-manrope-extrabold text-[32px] leading-[36px] text-primary tracking-tight">
                              {correctedCheckinHour}:{correctedCheckinMin}
                            </Text>
                          ) : (
                            <Text className="font-manrope-extrabold text-[28px] leading-[36px] text-text-muted tracking-tight">
                              --:--
                            </Text>
                          )}
                        </View>
                      </Pressable>
                      <Text className="font-inter text-[10px] text-text-muted mt-2 text-center">
                        Tap untuk ubah jam
                      </Text>
                    </View>

                    {/* Check Out Column */}
                    <View className="flex-1 bg-white border border-black/5 rounded-2xl p-3 shadow-sm">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="font-inter-bold text-[10px] text-text-muted uppercase">Check Out</Text>
                        <Pressable onPress={() => setCheckoutExists(!checkoutExists)}>
                          <MaterialIcons
                            name={checkoutExists ? "check-box" : "check-box-outline-blank"}
                            size={18}
                            color={Tokens.colors.primary}
                          />
                        </Pressable>
                      </View>
                      <Pressable
                        className={`bg-primary/5 rounded-2xl border border-primary/10 px-3 py-4 ${!checkoutExists && 'opacity-40'}`}
                        onPress={() => checkoutExists && setPickerTarget('checkout')}
                        disabled={!checkoutExists}
                      >
                        <View className="items-center">
                          {checkoutExists ? (
                            <Text className="font-manrope-extrabold text-[32px] leading-[36px] text-primary tracking-tight">
                              {correctedCheckoutHour}:{correctedCheckoutMin}
                            </Text>
                          ) : (
                            <Text className="font-manrope-extrabold text-[28px] leading-[36px] text-text-muted tracking-tight">
                              --:--
                            </Text>
                          )}
                        </View>
                      </Pressable>
                      <Text className="font-inter text-[10px] text-text-muted mt-2 text-center">
                        Tap untuk ubah jam
                      </Text>
                    </View>
                  </View>

                  <Input
                    label="Alasan Koreksi"
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Contoh: lupa absen check-in karena buru-buru"
                    multiline
                    numberOfLines={3}
                    style={{ height: 88, textAlignVertical: 'top', paddingTop: 12 }}
                  />

                  <Button
                    title="Kirim Koreksi"
                    onPress={submitCorrection}
                    loading={createMutation.isPending}
                    disabled={createMutation.isPending}
                    className="h-14 rounded-2xl mt-4"
                  />
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Attendance Picker Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={attendancePickerVisible}
        onRequestClose={() => setAttendancePickerVisible(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-background rounded-t-[28px] p-5 max-h-[80%]">
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="font-manrope-bold text-xl text-primary">Pilih Kehadiran</Text>
                <Text className="font-inter text-xs text-text-muted">Tap salah satu baris absensi 30 hari terakhir</Text>
              </View>
              <Pressable onPress={() => setAttendancePickerVisible(false)} className="w-9 h-9 rounded-full bg-black/5 items-center justify-center">
                <MaterialIcons name="close" size={18} color={Tokens.colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {isLoadingAttendance ? (
                <Text className="font-inter text-sm text-text-muted py-6 text-center">Memuat data...</Text>
              ) : attendanceHistory.length === 0 ? (
                <View className="p-4 bg-black/5 rounded-xl border border-dashed border-outline">
                  <Text className="font-inter text-xs text-text-muted text-center">Tidak ada data kehadiran</Text>
                </View>
              ) : (
                attendanceHistory.map((att: AttendanceItem) => {
                  const isSelected = selectedAttendance?.id === att.id;
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
                                {getAttendanceDate(att)}
                              </Text>
                              {att.attendance_status && (
                                <View className={`px-1.5 py-0.5 rounded-md ${att.attendance_status === 'PRESENT' ? 'bg-secondary-container' : 'bg-error-container/10'}`}>
                                  <Text className={`font-inter-bold text-[8px] ${att.attendance_status === 'PRESENT' ? 'text-secondary' : 'text-error'}`}>
                                    {att.attendance_status === 'PRESENT' ? 'HADIR' : att.attendance_status === 'LATE' ? 'TERLAMBAT' : 'TIDAK HADIR'}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text className="font-inter-medium text-[10px] text-text-muted mt-0.5">
                              {formatTime(getCheckIn(att))} - {formatTime(getCheckOut(att))}
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
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <TimePicker
        visible={pickerTarget !== null}
        title={pickerTarget === 'checkin' ? 'Koreksi Jam Masuk' : 'Koreksi Jam Pulang'}
        initialHour={pickerTarget === 'checkin' ? correctedCheckinHour : correctedCheckoutHour}
        initialMinute={pickerTarget === 'checkin' ? correctedCheckinMin : correctedCheckoutMin}
        onSave={(h, m) => {
          if (pickerTarget === 'checkin') {
            setCorrectedCheckinHour(h);
            setCorrectedCheckinMin(m);
          } else {
            setCorrectedCheckoutHour(h);
            setCorrectedCheckoutMin(m);
          }
          setPickerTarget(null);
        }}
        onClose={() => setPickerTarget(null)}
      />
    </SafeAreaView>
  );
}

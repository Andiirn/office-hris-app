import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/ui/Button';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { Input } from '../../src/components/ui/Input';
import { SkeletonCard } from '../../src/components/ui/Skeleton';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { Tokens } from '../../src/core/theme/tokens';
import { attendanceService } from '../../src/services/attendance.service';
import { api } from '../../src/core/api/client';
import { unwrapData } from '../../src/core/api/envelope';
import { useAuthStore } from '../../src/stores/auth.store';
import { AttendanceItem } from '../../src/types/attendance';
import { AttendanceCorrectionRecord, AttendanceCorrectionRequest } from '../../src/types/attendance-correction';

function formatTime(time?: string | null) {
  if (!time) return '--:--';
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

export default function AttendanceScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [periodOffset, setPeriodOffset] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceItem | null>(null);
  const [reason, setReason] = useState('');

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

  const { data: corrections = [], isLoading: isLoadingCorrections, refetch: refetchCorrections, isFetching: isFetchingCorrections } = useQuery({
    queryKey: ['attendance-corrections', user?.id],
    queryFn: () => listCorrections({ employee_id: user?.id, limit: 50 }),
    enabled: !!user?.id,
  });

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
    createMutation.mutate({
      attendance_id: selectedAttendance.id,
      reason: reason.trim(),
      corrected_checkin: getCheckIn(selectedAttendance) || null,
      corrected_checkout: getCheckOut(selectedAttendance) || null,
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

            <View className="flex-row gap-2 mb-4">
              <View className="flex-1">
                <Text className="font-inter-bold text-xs text-text-muted mb-2 ml-1">Check In</Text>
                <View className="px-4 py-3 rounded-xl bg-[#f8f8f8]">
                  <Text className="font-inter-bold text-sm text-on-surface">
                    {selectedAttendance ? formatTime(getCheckIn(selectedAttendance)) : '--:--'}
                  </Text>
                </View>
              </View>
              <View className="flex-1">
                <Text className="font-inter-bold text-xs text-text-muted mb-2 ml-1">Check Out</Text>
                <View className="px-4 py-3 rounded-xl bg-[#f8f8f8]">
                  <Text className="font-inter-bold text-sm text-on-surface">
                    {selectedAttendance ? formatTime(getCheckOut(selectedAttendance)) : '--:--'}
                  </Text>
                </View>
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

            <Text className="font-manrope-bold text-lg text-primary mt-5 mb-3">History Koreksi</Text>
            {isLoadingCorrections ? (
              <View className="gap-3">
                <SkeletonCard />
                <SkeletonCard />
              </View>
            ) : corrections.length === 0 ? (
              <GlassCard style={{ alignItems: 'center', padding: 24 }}>
                <MaterialIcons name="assignment" size={40} color={Tokens.colors.outline} />
                <Text className="font-inter-medium text-sm text-text-muted mt-3 text-center">Belum ada pengajuan koreksi</Text>
              </GlassCard>
            ) : (
              <View className="gap-3">
                {corrections.map((item: AttendanceCorrectionRecord) => (
                  <GlassCard key={item.id} style={{ padding: 16 }}>
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1 pr-3">
                        <Text className="font-inter-bold text-xs text-text-muted uppercase tracking-widest">Attendance Correction</Text>
                        <Text className="font-inter-bold text-base text-black mt-1">{item.attendance_date || '-'}</Text>
                        <Text className="font-inter text-xs text-text-muted mt-1" numberOfLines={2}>{item.reason}</Text>
                      </View>
                      <StatusBadge label={item.status || 'PENDING'} type={getStatusType(item.status) as any} />
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/ui/Button';
import { GlassCard } from '../src/components/ui/GlassCard';
import { Input } from '../src/components/ui/Input';
import { SkeletonCard } from '../src/components/ui/Skeleton';
import { StatusBadge } from '../src/components/ui/StatusBadge';
import { Tokens } from '../src/core/theme/tokens';
import { leaveService } from '../src/services/leave.service';
import { useAuthStore } from '../src/stores/auth.store';
import { CreateLeaveRequest } from '../src/types/leave';

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2);
  const minutes = index % 2 === 0 ? '00' : '30';
  return `${String(hours).padStart(2, '0')}:${minutes}`;
});

type TimeField = 'start_time' | 'end_time';

function formatTime(timeStr?: string | null) {
  if (!timeStr) return '--:--';
  if (timeStr.includes('T')) return timeStr.split('T')[1].slice(0, 5);
  return timeStr.slice(0, 5);
}

function isHourlyLeaveType(type?: { code?: string | null; name?: string | null; category?: string | null } | null) {
  const haystack = `${type?.code || ''} ${type?.name || ''} ${type?.category || ''}`.toLowerCase();
  return /hour|jam|per\s*jam|hourly/.test(haystack);
}

function isAnnualLeaveType(type?: { code?: string | null; name?: string | null; category?: string | null } | null) {
  const haystack = `${type?.code || ''} ${type?.name || ''} ${type?.category || ''}`.toLowerCase();
  return /annual|tahunan|cuti\s*tahunan/.test(haystack);
}

export default function LeaveScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timeField, setTimeField] = useState<TimeField>('start_time');
  const [selectedRange, setSelectedRange] = useState<{ start?: string, end?: string }>({});
  const [selectedHourlyDate, setSelectedHourlyDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [documentFile, setDocumentFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [form, setForm] = useState<CreateLeaveRequest>({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    reason: '',
  });

  // 1. Fetch History
  const { data: history = [], isLoading: isLoadingHistory, refetch: refetchHistory, isFetching: isFetchingHistory } = useQuery({
    queryKey: ['leave-history', user?.id],
    queryFn: () => leaveService.getRequests({ employee_id: user?.id, limit: 50 }),
    enabled: !!user?.id,
  });

  // 2. Fetch Leave Types
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leave-types', user?.company_id],
    queryFn: () => leaveService.getTypes(user?.company_id || null),
    enabled: !!user?.company_id,
  });

  const selectedLeaveType = useMemo(
    () => leaveTypes.find((type) => type.id === form.leave_type_id),
    [form.leave_type_id, leaveTypes],
  );
  const isHourlyLeave = isHourlyLeaveType(selectedLeaveType);
  const isAnnualLeave = isAnnualLeaveType(selectedLeaveType);

  const { data: balances = [] } = useQuery({
    queryKey: ['leave-balances', user?.id, new Date().getFullYear()],
    queryFn: () => leaveService.getBalances(user?.id || '', new Date().getFullYear()),
    enabled: !!user?.id && !!isAnnualLeave,
  });

  const annualLeaveBalance = useMemo(() => {
    if (!selectedLeaveType) return null;
    return balances.find((item) => {
      const left = `${item.leave_type_name || ''}`.toLowerCase();
      const right = `${selectedLeaveType.name || ''} ${selectedLeaveType.code || ''} ${selectedLeaveType.category || ''}`.toLowerCase();
      return left.includes('annual') || left.includes('tahunan') || right.includes(left) || left.includes(right);
    }) || balances[0] || null;
  }, [balances, selectedLeaveType]);

  // 3. Create Request Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: { request: CreateLeaveRequest; documentFile: DocumentPicker.DocumentPickerAsset | null }) => {
      const request = await leaveService.createRequest(payload.request);
      if (payload.documentFile) {
        try {
          await leaveService.uploadDocument(request.id, {
            uri: payload.documentFile.uri,
            name: payload.documentFile.name,
            type: payload.documentFile.mimeType,
          });
        } catch (uploadError) {
          console.warn('[Leave] Upload document failed:', uploadError);
        }
      }
      return request;
    },
    onSuccess: async () => {
      console.log('[Leave] Request submitted successfully, refreshing data...');

      // Invalidate and refetch to ensure UI updates immediately
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['leave-history'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar-leaves'] })
      ]);

      setModalVisible(false);
      setSelectedRange({});
      setSelectedHourlyDate(new Date().toISOString().slice(0, 10));
      setDocumentFile(null);
      setForm({
        leave_type_id: '',
        start_date: '',
        end_date: null,
        start_time: '',
        end_time: '',
        reason: '',
      });
      Alert.alert('Success', 'Leave request submitted successfully');
    },
    onError: (error: any) => {
      const response = error?.response?.data;
      const message = response?.message || 'Failed to submit leave request';
      const fieldErrors = Array.isArray(response?.errors) ? response.errors : [];

      if (fieldErrors.length > 0) {
        const normalized = fieldErrors
          .map((item: any) => `${item.field || 'field'}: ${item.message || 'invalid'}`)
          .join('\n');
        Alert.alert('Error', `${message}\n\n${normalized}`);
        return;
      }

      Alert.alert('Error', message);
    }
  });

  // 4. Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => leaveService.cancelRequest(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['leave-history'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar-leaves'] })
      ]);
      Alert.alert('Success', 'Leave request cancelled');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to cancel request');
    }
  });

  const onRefresh = () => {
    refetchHistory();
  };

  const onDayPress = (day: any) => {
    if (isHourlyLeave) return;
    const dateString = day.dateString;

    if (!selectedRange.start || (selectedRange.start && selectedRange.end)) {
      setSelectedRange({ start: dateString });
    } else {
      let start = selectedRange.start;
      let end = dateString;

      if (new Date(start) > new Date(end)) {
        [start, end] = [end, start];
      }

      setSelectedRange({ start, end });
      setForm(prev => ({ ...prev, start_date: start, end_date: end }));
    }
  };

  const markedDates = useMemo(() => {
    const marks: any = {};

    history.forEach((req) => {
      if (req.status === 'APPROVED' || req.status === 'PENDING') {
        const color = req.status === 'APPROVED' ? '#d9e6da' : '#ffdbd0';
        const textColor = req.status === 'APPROVED' ? '#5b675e' : '#e17c5a';

        marks[req.start_date] = {
          startingDay: true,
          color,
          textColor,
          endingDay: !req.end_date || req.end_date === req.start_date
        };

        if (req.end_date && req.end_date !== req.start_date) {
          marks[req.end_date] = { endingDay: true, color, textColor };
        }
      }
    });

    if (selectedRange.start) {
      marks[selectedRange.start] = {
        ...marks[selectedRange.start],
        startingDay: true,
        color: Tokens.colors.primary,
        textColor: '#fff',
        endingDay: !selectedRange.end
      };
    }
    if (selectedRange.end) {
      marks[selectedRange.end] = {
        ...marks[selectedRange.end],
        endingDay: true,
        color: Tokens.colors.primary,
        textColor: '#fff'
      };

      let start = new Date(selectedRange.start!);
      let end = new Date(selectedRange.end);
      let curr = new Date(start);
      curr.setDate(curr.getDate() + 1);

      while (curr < end) {
        const d = curr.toISOString().split('T')[0];
        marks[d] = { color: 'rgba(0, 6, 102, 0.2)', textColor: Tokens.colors.primary };
        curr.setDate(curr.getDate() + 1);
      }
    }

    return marks;
  }, [history, selectedRange]);

  const handleCreate = () => {
    const payload = isHourlyLeave
      ? {
        ...form,
        start_date: selectedHourlyDate,
        end_date: selectedHourlyDate,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
      }
      : {
        ...form,
        end_date: form.end_date || null,
        start_time: null,
        end_time: null,
      };

    if (!payload.leave_type_id) {
      Alert.alert('Error', 'Pilih jenis izin/cuti terlebih dahulu');
      return;
    }

    if (!payload.reason || payload.reason.trim().length < 5) {
      Alert.alert('Error', 'Reason minimal 5 karakter');
      return;
    }

    if (isHourlyLeave) {
      if (!payload.start_time || !payload.end_time) {
        Alert.alert('Error', 'Pilih start time dan end time');
        return;
      }
    } else if (!payload.start_date || !payload.end_date) {
      Alert.alert('Error', 'Pilih tanggal mulai dan selesai');
      return;
    }

    console.log('[Leave] Submitting payload:', payload);
    createMutation.mutate({
      request: payload,
      documentFile,
    });
  };

  const requiresDocument = /sakit/i.test(
    `${selectedLeaveType?.name || ''} ${selectedLeaveType?.description || ''}`,
  );

  const today = new Date().toISOString().slice(0, 10);

  const handleSelectLeaveType = (typeId: string) => {
    const nextType = leaveTypes.find((type) => type.id === typeId);
    const nextIsHourly = isHourlyLeaveType(nextType);

    setForm((prev) => ({
      ...prev,
      leave_type_id: typeId,
      start_date: nextIsHourly ? selectedHourlyDate : prev.start_date,
      end_date: nextIsHourly ? selectedHourlyDate : prev.end_date,
      start_time: nextIsHourly ? prev.start_time : '',
      end_time: nextIsHourly ? prev.end_time : '',
    }));
    setSelectedRange({});
    setSelectedHourlyDate(today);
    setTimePickerVisible(false);
    setModalVisible(true);
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) return;
      setDocumentFile(result.assets[0]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Gagal memilih file');
    }
  };

  const clearDocument = () => setDocumentFile(null);

  const handleSelectTime = (value: string) => {
    setForm((prev) => ({ ...prev, [timeField]: value }));
    setTimePickerVisible(false);
  };

  const selectedTimeLabel = (field: TimeField) => {
    const value = form[field];
    if (!value) return 'Pilih jam';
    return formatTime(value);
  };

  const handleCancel = (id: string) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this leave request?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: () => cancelMutation.mutate(id), style: 'destructive' }
      ]
    );
  };

  const getStatusType = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'secondary';
      case 'PENDING': return 'secondary';
      case 'REJECTED': return 'error';
      case 'CANCELLED': return 'error';
      default: return 'secondary';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Decorative Background Elements */}
      <View className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-on-primary-container/15" />
      <View className="absolute top-64 -left-24 w-72 h-72 rounded-full bg-error-container/10" />
      <View className="absolute -bottom-12 -right-4 w-44 h-44 rounded-full bg-secondary-container/20" />

      <View className="flex-row justify-between items-center px-5 pt-2 pb-5 z-10">
        <Text className="font-manrope-extrabold text-3xl text-primary">Pengajuan izin & cuti</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetchingHistory} onRefresh={onRefresh} tintColor={Tokens.colors.primary} />
        }
      >
        {isAnnualLeave && annualLeaveBalance ? (
          <GlassCard style={{ padding: 16, marginBottom: 20, backgroundColor: '#f7f9ff' }}>
            <Text className="font-inter-bold text-sm text-primary mb-1">Informasi Cuti Tahunan</Text>
            <Text className="font-inter text-sm text-on-surface leading-5">
              Berdasarkan data kepegawaian di perusahaan, anda dapat mengajaukan cuti tahunan sebanyak {annualLeaveBalance.remaining_days} hari.
            </Text>
          </GlassCard>
        ) : null}

        <GlassCard style={{ padding: 16, marginBottom: 20 }}>
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="font-manrope-bold text-lg text-primary">Pilih Tipe</Text>
              <Text className="font-inter text-xs text-text-muted mt-1">Pilih dulu jenis pengajuan yang ingin dibuat</Text>
            </View>
            {selectedLeaveType ? (
              <View className="bg-primary/10 px-3 py-1.5 rounded-full">
                <Text className="font-inter-bold text-[10px] text-primary uppercase tracking-wider">
                  {isHourlyLeave ? 'Izin per jam' : 'Cuti / Izin'}
                </Text>
              </View>
            ) : null}
          </View>

          {leaveTypes.length === 0 ? (
            <Text className="font-inter text-sm text-text-muted">Memuat tipe pengajuan...</Text>
          ) : (
            <View className="flex-row flex-wrap gap-2.5">
              {leaveTypes.map((type) => {
                const active = form.leave_type_id === type.id;
                return (
                  <Pressable
                    key={type.id}
                    className={`px-4 py-3 rounded-2xl border ${active ? 'bg-primary border-primary' : 'bg-[#f0eded] border-transparent'}`}
                    onPress={() => handleSelectLeaveType(type.id)}
                  >
                    <Text className={`font-inter-bold text-sm ${active ? 'text-white' : 'text-text-muted'}`}>
                      {type.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </GlassCard>

        <View className="flex-row justify-between items-center mt-6 mb-4">
          <Text className="font-manrope-bold text-lg text-primary ">History</Text>
          <Text className="font-inter-semibold text-xs text-text-muted">{history.length} Requests</Text>
        </View>

        {isLoadingHistory ? (
          <View className="mt-2">
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : history.length === 0 ? (
          <GlassCard style={{ padding: 0, marginTop: 10 }}>
            <View className="items-center justify-center py-10 w-full">
              <MaterialIcons name="history" size={48} color={Tokens.colors.outline} />
              <Text className="font-inter-medium text-sm text-text-muted mt-3 text-center">
                No history found
              </Text>
            </View>
          </GlassCard>
        ) : (
          history.map((item) => (
            <GlassCard key={item.id} style={{ marginBottom: 12, padding: 16 }}>
              <View className="flex-row justify-between items-start mb-2.5">
                <View className="flex-1">
                  <Text className="font-inter-bold text-base text-black">{item.leave_type_name || 'Leave Request'}</Text>
                  <View className="flex-row items-center mt-1 gap-1.5">
                    <MaterialIcons name="calendar-today" size={12} color={Tokens.colors.textMuted} />
                    <Text className="font-inter-medium text-xs text-text-muted">
                      {item.start_date} {item.end_date ? `to ${item.end_date}` : ''}
                    </Text>
                  </View>
                </View>
                <StatusBadge label={item.status} type={getStatusType(item.status) as any} />
              </View>
              <Text className="font-inter text-sm text-black leading-5 bg-black/5 p-2.5 rounded-lg" numberOfLines={2}>
                {item.reason}
              </Text>

              {item.status === 'PENDING' && (
                <Pressable
                  onPress={() => handleCancel(item.id)}
                  className="mt-3.5 flex-row items-center gap-1 self-start"
                >
                  <MaterialIcons name="close" size={14} color={Tokens.colors.error} />
                  <Text className="font-inter-bold text-xs text-error">Cancel Request</Text>
                </Pressable>
              )}
            </GlassCard>
          ))
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedRange({});
          setTimePickerVisible(false);
          setDocumentFile(null);
        }}
      >
        <View className="flex-1 bg-primary/40 justify-end">
          <View className="bg-background rounded-t-[32px] p-6 max-h-[85%] shadow-2xl">
            <View className="flex-row justify-between items-start mb-6">
              <View>
                <Text className="font-manrope-extrabold text-2xl text-primary">Pengajuan {selectedLeaveType?.name || ''}</Text>
              </View>
              <Pressable
                className="w-9 h-9 rounded-full bg-black/5 items-center justify-center"
                onPress={() => {
                  setModalVisible(false);
                  setSelectedRange({});
                  setTimePickerVisible(false);
                }}
              >
                <MaterialIcons name="close" size={20} color={Tokens.colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {isHourlyLeave ? (
                <GlassCard style={{ padding: 14, marginBottom: 16 }}>
                  <Text className="font-inter-bold text-sm text-primary mb-2">Izin per jam</Text>
                  <Text className="font-inter text-xs text-text-muted">
                    Pilih tanggal dulu, lalu isi jam mulai dan selesai.
                  </Text>
                  <View className="mt-4">
                    <Calendar
                      current={selectedHourlyDate}
                      onDayPress={(day) => setSelectedHourlyDate(day.dateString)}
                      markedDates={{
                        [selectedHourlyDate]: {
                          selected: true,
                          selectedColor: Tokens.colors.primary,
                        },
                      }}
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
                        textDayFontFamily: 'Inter_500Medium',
                        textMonthFontFamily: 'Manrope_700Bold',
                        textDayHeaderFontFamily: 'Inter_700Bold',
                      }}
                      style={{ borderRadius: 16 }}
                    />
                    <Text className="font-inter text-[11px] text-text-muted mt-2 text-center">
                      Tanggal terpilih: {selectedHourlyDate}
                    </Text>
                  </View>
                  <View className="flex-row gap-3 mt-4">
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
                </GlassCard>
              ) : (
                <GlassCard style={{ padding: 10, marginBottom: 16 }}>
                  <Calendar
                    current={selectedRange.start || form.start_date || today}
                    theme={{
                      backgroundColor: 'transparent',
                      calendarBackground: 'transparent',
                      textSectionTitleColor: Tokens.colors.primary,
                      selectedDayBackgroundColor: Tokens.colors.primary,
                      selectedDayTextColor: '#ffffff',
                      todayTextColor: Tokens.colors.primary,
                      dayTextColor: Tokens.colors.text,
                      textDisabledColor: Tokens.colors.outline,
                      dotColor: Tokens.colors.primary,
                      selectedDotColor: '#ffffff',
                      arrowColor: Tokens.colors.primary,
                      monthTextColor: Tokens.colors.primary,
                      indicatorColor: Tokens.colors.primary,
                      textDayFontFamily: 'Inter_500Medium',
                      textMonthFontFamily: 'Manrope_700Bold',
                      textDayHeaderFontFamily: 'Inter_700Bold',
                      textDayFontSize: 12,
                      textMonthFontSize: 16,
                      textDayHeaderFontSize: 12
                    }}
                    markingType={'period'}
                    markedDates={markedDates}
                    onDayPress={onDayPress}
                  />
                  <View className="flex-row items-center justify-center gap-1.5 mt-2.5 pt-2.5 border-t border-black/5">
                    <MaterialIcons name="info-outline" size={14} color={Tokens.colors.textMuted} />
                    <Text className="font-inter-medium text-[11px] text-text-muted">Pilih tanggal mulai dan akhir untuk ajukan cuti</Text>
                  </View>
                </GlassCard>
              )}

              <Input
                label="Reason"
                value={form.reason}
                onChangeText={(text) => setForm({ ...form, reason: text })}
                placeholder="Masukkan Alasan Cuti?"
                multiline
                numberOfLines={3}
                style={{ height: 100, textAlignVertical: 'top', paddingTop: 12 }}
              />

              {requiresDocument ? (
                <GlassCard style={{ padding: 14, marginTop: 12 }}>
                  <Text className="font-inter-bold text-sm text-primary mb-2">Dokumen Pendukung</Text>
                  <Text className="font-inter text-xs text-text-muted mb-3">
                    Opsional. Kalau ada surat dokter / bukti sakit, silakan upload. Kalau tidak, langsung kirim saja.
                  </Text>

                  {documentFile ? (
                    <View className="flex-row items-center justify-between bg-black/5 px-3 py-3 rounded-xl">
                      <View className="flex-1 pr-3">
                        <Text className="font-inter-bold text-sm text-on-surface" numberOfLines={1}>
                          {documentFile.name}
                        </Text>
                        <Text className="font-inter text-[10px] text-text-muted mt-1">
                          {documentFile.mimeType || 'file'}
                        </Text>
                      </View>
                      <Pressable onPress={clearDocument} className="w-8 h-8 rounded-full bg-white items-center justify-center">
                        <MaterialIcons name="close" size={18} color={Tokens.colors.error} />
                      </Pressable>
                    </View>
                  ) : null}

                  <View className="flex-row gap-2 mt-3">
                    <Pressable
                      onPress={pickDocument}
                      className="flex-1 py-3 rounded-xl bg-primary/5 border border-primary/10 items-center"
                    >
                      <Text className="font-inter-bold text-[12px] text-primary">Upload File</Text>
                    </Pressable>
                    <Pressable
                      onPress={clearDocument}
                      className="flex-1 py-3 rounded-xl bg-[#f8f8f8] items-center"
                    >
                      <Text className="font-inter-bold text-[12px] text-text-muted">Lewati</Text>
                    </Pressable>
                  </View>
                </GlassCard>
              ) : null}

              <Button
                title="Submit Request"
                onPress={handleCreate}
                loading={createMutation.isPending}
                className="mt-5 h-14 rounded-2xl"
              />
              <View className="h-10" />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={timePickerVisible}
        onRequestClose={() => setTimePickerVisible(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-background rounded-t-[28px] p-5 max-h-[70%]">
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="font-manrope-bold text-xl text-primary">Pilih Jam</Text>
                <Text className="font-inter text-xs text-text-muted">Scroll untuk memilih {timeField === 'start_time' ? 'start time' : 'end time'}</Text>
              </View>
              <Pressable onPress={() => setTimePickerVisible(false)} className="w-9 h-9 rounded-full bg-black/5 items-center justify-center">
                <MaterialIcons name="close" size={18} color={Tokens.colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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
        </View>
      </Modal>
    </SafeAreaView>
  )
}

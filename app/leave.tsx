import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PeriodSelector } from '../src/components/common/PeriodSelector';
import { Button } from '../src/components/ui/Button';
import { GlassCard } from '../src/components/ui/GlassCard';
import { Input } from '../src/components/ui/Input';
import { SkeletonCard } from '../src/components/ui/Skeleton';
import { StatusBadge } from '../src/components/ui/StatusBadge';
import { SuccessAnimation } from '../src/components/ui/SuccessAnimation';
import { Tokens } from '../src/core/theme/tokens';
import { approvalService } from '../src/services/approval.service';
import { authService } from '../src/services/auth.service';
import { employeeService } from '../src/services/employee.service';
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

function formatLeaveTypeName(name?: string | null) {
  if (!name) return '';
  // Remove "Cuti " or "cuti " prefix, case-insensitive
  return name.replace(/^Cuti\s+/i, '');
}

function getLeaveStatus(item: { status?: string | null; is_approved?: boolean; approved_at?: string | null }) {
  const rawStatus = String(item?.status || '').toUpperCase();
  if (rawStatus === 'APPROVED' || item?.is_approved || item?.approved_at) return 'APPROVED';
  if (rawStatus === 'REJECTED' || rawStatus === 'DECLINED') return 'REJECTED';
  if (rawStatus === 'CANCELLED') return 'CANCELLED';
  return rawStatus || 'PENDING';
}

export default function LeaveScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [modalVisible, setModalVisible] = useState(false);
  const [replacementModalVisible, setReplacementModalVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [timeField, setTimeField] = useState<TimeField>('start_time');
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start?: string, end?: string }>({});
  const [selectedHourlyDate, setSelectedHourlyDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [documentFile, setDocumentFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [form, setForm] = useState<CreateLeaveRequest>({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    reason: '',
    replacement_id: '',
  });

  const [colleagueSearch, setColleagueSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const historyQueryKey = ['leave-history', user?.id, selectedYear, selectedMonth] as const;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(colleagueSearch);
    }, 500);
    return () => clearTimeout(handler);
  }, [colleagueSearch]);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => authService.getProfile(),
    enabled: !!user?.id,
  });

  // 1. Fetch History
  const { data: history = [], isLoading: isLoadingHistory, refetch: refetchHistory, isFetching: isFetchingHistory } = useQuery({
    queryKey: historyQueryKey,
    queryFn: () => leaveService.getRequests({ employee_id: user?.id, year: selectedYear, month: selectedMonth, limit: 100 }),
    enabled: !!user?.id,
  });

  const { data: selectedLeaveDetail, isLoading: isLoadingDetail, isError: isDetailError, refetch: refetchDetail } = useQuery({
    queryKey: ['leave-detail', selectedDetailId],
    queryFn: () => leaveService.getRequest(selectedDetailId as string),
    enabled: !!selectedDetailId && detailModalVisible,
    staleTime: 60_000,
  });

  const { data: selectedLeaveFeedback, isLoading: isLoadingFeedback } = useQuery({
    queryKey: ['leave-feedback', selectedDetailId],
    queryFn: () => approvalService.getFeedback(selectedDetailId as string),
    enabled: !!selectedDetailId && detailModalVisible,
    staleTime: 60_000,
  });

  // 2. Fetch Leave Types
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leave-types', user?.company_id],
    queryFn: () => leaveService.getTypes(user?.company_id || null),
  });

  const selectedLeaveType = useMemo(
    () => leaveTypes.find((type) => type.id === form.leave_type_id),
    [form.leave_type_id, leaveTypes],
  );
  const isHourlyLeave = isHourlyLeaveType(selectedLeaveType);

  const { data: colleagues = [], isLoading: isLoadingColleagues } = useQuery({
    queryKey: ['colleagues', profile?.division_id, debouncedSearch],
    queryFn: () => employeeService.getColleagues(profile?.division_id, debouncedSearch),
    enabled: !!profile?.division_id,
  });

  // Leave balances logic removed per HR request

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

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: historyQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['calendar-leaves'] }),
        queryClient.refetchQueries({ queryKey: historyQueryKey, type: 'active' }),
      ]);

      setModalVisible(false);
      setTimePickerVisible(false);
      setSelectedRange({});
      setSelectedHourlyDate(new Date().toISOString().slice(0, 10));
      setDocumentFile(null);
      setReplacementModalVisible(false);
      setColleagueSearch('');
      setShowSuccessAnim(true);
    },
    onError: (error: any) => {
      const response = error?.response?.data;
      const message = response?.message || 'Gagal mengajukan cuti';
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
        queryClient.invalidateQueries({ queryKey: historyQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['calendar-leaves'] }),
        queryClient.refetchQueries({ queryKey: historyQueryKey, type: 'active' }),
      ]);
      Alert.alert('Berhasil', 'Pengajuan berhasil dibatalkan');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Gagal membatalkan pengajuan');
    }
  });

  const onRefresh = () => {
    refetchHistory();
  };

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        refetchHistory();
      }
    }, [refetchHistory, user?.id])
  );

  const openDetail = (id: string) => {
    setSelectedDetailId(id);
    setDetailModalVisible(true);
  };

  const closeDetail = () => {
    setDetailModalVisible(false);
    setSelectedDetailId(null);
  };

  const onDayPress = (day: any) => {
    if (isHourlyLeave) return;
    const dateString = day.dateString;

    if (!selectedRange.start || (selectedRange.start && selectedRange.end)) {
      setSelectedRange({ start: dateString });
      setForm(prev => ({ ...prev, start_date: dateString, end_date: dateString }));
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
      const status = getLeaveStatus(req);

      if (status === 'APPROVED' || status === 'PENDING') {
        const color = status === 'APPROVED' ? '#d9e6da' : '#ffdbd0';
        const textColor = status === 'APPROVED' ? '#5b675e' : '#e17c5a';

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
        endingDay: !selectedRange.end || selectedRange.start === selectedRange.end
      };
    }
    if (selectedRange.end && selectedRange.start !== selectedRange.end) {
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
        marks[d] = { color: 'rgba(244, 63, 94, 0.15)', textColor: Tokens.colors.primary };
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
        replacement_id: form.replacement_id || null,
      }
      : {
        ...form,
        end_date: form.end_date || null,
        start_time: null,
        end_time: null,
        replacement_id: form.replacement_id || null,
      };

    if (!payload.leave_type_id) {
      Alert.alert('Pilih jenis izin/cuti terlebih dahulu');
      return;
    }

    if (!payload.reason || payload.reason.trim().length < 5) {
      Alert.alert('Mohon masukkan alasan minimal 5 karakter');
      return;
    }

    if (isHourlyLeave) {
      if (!payload.start_time || !payload.end_time) {
        Alert.alert('Error', 'Pilih jam mulai dan jam selesai');
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

  const resetForm = () => {
    setForm({
      leave_type_id: '',
      start_date: '',
      end_date: null,
      start_time: '',
      end_time: '',
      reason: '',
      replacement_id: '',
    });
    setSelectedRange({});
    setSelectedHourlyDate(new Date().toISOString().slice(0, 10));
    setDocumentFile(null);
    setColleagueSearch('');
    setTimePickerVisible(false);
    setReplacementModalVisible(false);
    setModalVisible(false);
  };

  const selectedTimeLabel = (field: TimeField) => {
    const value = form[field];
    if (!value) return 'Pilih jam';
    return formatTime(value);
  };

  const handleCancel = (id: string) => {
    Alert.alert(
      'Batalkan Pengajuan',
      'Apakah Anda yakin ingin membatalkan pengajuan ini?',
      [
        { text: 'Tidak', style: 'cancel' },
        { text: 'Ya', onPress: () => cancelMutation.mutate(id), style: 'destructive' }
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

      <View className="flex-row items-center px-5 pt-2 pb-5 z-10">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm active:opacity-60"
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <MaterialIcons name="arrow-back" size={22} color={Tokens.colors.primary} />
        </Pressable>
        <View className="flex-1 ml-3">
          <Text className="font-manrope-extrabold text-3xl text-primary">Pengajuan izin & cuti</Text>
          <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Ajukan dan pantau izin atau cuti</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetchingHistory} onRefresh={onRefresh} tintColor={Tokens.colors.primary} />
        }
      >
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
                    className={`px-4 py-2.5 rounded-full border ${active ? 'bg-primary border-primary' : 'bg-primary/5 border-primary/10'}`}
                    onPress={() => handleSelectLeaveType(type.id)}
                  >
                    <Text className={`font-inter-bold text-[13px] ${active ? 'text-white' : 'text-primary'}`}>
                      {formatLeaveTypeName(type.name)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </GlassCard>

        <View className="mb-6">
          <PeriodSelector
            month={selectedMonth}
            year={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            title="Periode Riwayat"
            subtitle="Riwayat pengajuan berdasarkan bulan dan tahun"
          />
        </View>

        <View className="flex-row justify-between items-center mt-6 mb-4">
          <Text className="font-manrope-bold text-lg text-primary ">Riwayat Pengajuan</Text>
          <Text className="font-inter-semibold text-xs text-text-muted">{history.length} Pengajuan</Text>
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
          <View className="gap-0">
            {history.map((item, index) => {
              const typeName = item.leave_type_name || leaveTypes.find(t => t.id === item.leave_type_id)?.name;
              const displayTitle = typeName ? `Pengajuan cuti ${formatLeaveTypeName(typeName)}` : 'Pengajuan Izin/Cuti';

              const isSameDate = item.start_date === item.end_date || !item.end_date;
              const timeString = item.start_time && item.end_time ? ` (${formatTime(item.start_time)} - ${formatTime(item.end_time)})` : '';
              const dateDisplay = isSameDate ? `${item.start_date}${timeString}` : `${item.start_date} - ${item.end_date}`;
              const status = getLeaveStatus(item);

              return (
                <Pressable
                  key={item.id}
                  onPress={() => openDetail(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Lihat detail ${displayTitle}`}
                  className="mb-3"
                >
                  <View className="bg-white/80 rounded-[20px] px-4 py-4 border border-white/90 shadow-sm">
                    <View className="flex-row justify-between items-start mb-2.5">
                      <View className="flex-1 pr-2">
                        <View className="flex-row items-center gap-2">
                          <Text className="font-inter-bold text-base text-on-surface">{displayTitle}</Text>
                          <View className="flex-row items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
                            <MaterialIcons name="visibility" size={11} color={Tokens.colors.primary} />
                            <Text className="font-inter-bold text-[10px] text-primary uppercase tracking-wider">Detail</Text>
                          </View>
                        </View>
                        <View className="flex-row items-center mt-1 gap-1.5">
                          <MaterialIcons name="calendar-today" size={12} color={Tokens.colors.textMuted} />
                          <Text className="font-inter-medium text-xs text-text-muted">
                            {dateDisplay}
                          </Text>
                        </View>
                      </View>
                      <StatusBadge label={status} type={getStatusType(status) as any} />
                    </View>
                    <Text className="font-inter text-[13px] text-text-muted leading-5 mt-1" numberOfLines={2}>
                      {item.reason}
                    </Text>

                    {status === 'PENDING' && (
                      <Pressable
                        onPress={() => handleCancel(item.id)}
                        className="mt-4 flex-row items-center justify-center gap-1.5 bg-error/10 px-4 py-2 rounded-full self-start"
                      >
                        <MaterialIcons name="close" size={14} color={Tokens.colors.error} />
                        <Text className="font-inter-bold text-[11px] text-error uppercase tracking-wider">Batalkan</Text>
                      </Pressable>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedRange({});
          setTimePickerVisible(false);
          setDocumentFile(null);
          setColleagueSearch('');
        }}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-background rounded-t-[32px] p-6 pb-12 max-h-[90%] shadow-2xl">
            <View className="flex-row justify-between items-start mb-6">
              <View>
                <Text className="font-manrope-extrabold text-2xl text-primary">Pengajuan {formatLeaveTypeName(selectedLeaveType?.name)}</Text>
              </View>
              <Pressable
                className="w-9 h-9 rounded-full bg-black/5 items-center justify-center"
                onPress={() => {
                  setModalVisible(false);
                  setSelectedRange({});
                  setTimePickerVisible(false);
                  setColleagueSearch('');
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
                      <Text className="font-inter-bold text-[10px] text-text-muted uppercase tracking-wider">Mulai</Text>
                      <Text className="font-inter-bold text-sm text-on-surface mt-1">{selectedTimeLabel('start_time')}</Text>
                    </Pressable>
                    <Pressable
                      className="flex-1 px-4 py-3 rounded-xl bg-[#f8f8f8]"
                      onPress={() => {
                        setTimeField('end_time');
                        setTimePickerVisible(true);
                      }}
                    >
                      <Text className="font-inter-bold text-[10px] text-text-muted uppercase tracking-wider">Selesai</Text>
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
                label="Alasan"
                value={form.reason}
                onChangeText={(text) => setForm({ ...form, reason: text })}
                placeholder="Masukkan Alasan Cuti?"
                multiline
                numberOfLines={3}
                style={{ height: 100, textAlignVertical: 'top', paddingTop: 12 }}
              />

              <GlassCard style={{ padding: 14, marginTop: 12 }}>
                <Text className="font-inter-bold text-sm text-primary mb-2">Pengganti (Opsional)</Text>
                <Text className="font-inter text-xs text-text-muted mb-3">
                  Pilih rekan 1 divisi untuk menggantikan Anda selama cuti.
                </Text>
                <Pressable
                  onPress={() => setReplacementModalVisible(true)}
                  className="flex-row items-center justify-between px-4 py-3 bg-black/5 rounded-xl border border-outline"
                >
                  <Text className={`font-inter-medium text-sm ${form.replacement_id ? 'text-black' : 'text-text-muted'}`}>
                    {form.replacement_id
                      ? colleagues.find(c => c.id === form.replacement_id)?.full_name || 'Karyawan Terpilih'
                      : 'Pilih Pengganti'}
                  </Text>
                  <MaterialIcons name="chevron-right" size={20} color={Tokens.colors.textMuted} />
                </Pressable>
              </GlassCard>

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
              <View className="h-6" />
            </ScrollView>
          </View>
        </View>

        {timePickerVisible && (
          <View className="absolute inset-0 z-50 flex-1 bg-black/40 justify-end">
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
        )}

        {replacementModalVisible && (
          <View className="absolute inset-0 z-50 flex-1 bg-black/40 justify-end">
            <View className="bg-background rounded-t-[28px] p-5 h-[80%] shadow-2xl">
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text className="font-manrope-bold text-xl text-primary">Pilih Pengganti</Text>
                  <Text className="font-inter text-xs text-text-muted">Cari rekan 1 divisi</Text>
                </View>
                <Pressable onPress={() => { setReplacementModalVisible(false); setColleagueSearch(''); }} className="w-9 h-9 rounded-full bg-black/5 items-center justify-center">
                  <MaterialIcons name="close" size={18} color={Tokens.colors.text} />
                </Pressable>
              </View>

              <Input
                placeholder="Cari nama karyawan..."
                value={colleagueSearch}
                onChangeText={setColleagueSearch}
              />

              <ScrollView showsVerticalScrollIndicator={false} className="mt-4">
                {isLoadingColleagues ? (
                  <Text className="font-inter text-center text-sm text-text-muted mt-4">Memuat data...</Text>
                ) : colleagues.filter(c => c.id !== user?.id).length > 0 ? (
                  colleagues.filter(c => c.id !== user?.id).map((c) => {
                    const active = form.replacement_id === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => {
                          setForm({ ...form, replacement_id: active ? '' : c.id });
                          setReplacementModalVisible(false);
                          setColleagueSearch('');
                        }}
                        className={`flex-row items-center justify-between p-4 mb-2 rounded-xl border ${active ? 'bg-primary/5 border-primary' : 'bg-white border-outline'}`}
                      >
                        <View>
                          <Text className={`font-inter-bold text-sm ${active ? 'text-primary' : 'text-on-surface'}`}>{c.full_name}</Text>
                          <Text className="font-inter text-[11px] text-text-muted mt-0.5">{c.nik}</Text>
                        </View>
                        {active && <MaterialIcons name="check-circle" size={20} color={Tokens.colors.primary} />}
                      </Pressable>
                    );
                  })
                ) : debouncedSearch ? (
                  <Text className="font-inter text-center text-sm text-text-muted mt-4">Tidak ada hasil untuk &quot;{debouncedSearch}&quot;</Text>
                ) : (
                  <Text className="font-inter text-center text-sm text-text-muted mt-4">Ketik nama untuk mencari</Text>
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={closeDetail}
      >
        <View className="flex-1 bg-black/45 justify-end">
          <View className="bg-background rounded-t-[32px] p-6 pb-10 max-h-[90%] shadow-2xl">
            <View className="flex-row justify-between items-start mb-5">
              <View className="flex-1 pr-4">
                <Text className="font-manrope-extrabold text-2xl text-primary">Detail Pengajuan</Text>
              </View>
              <Pressable
                className="w-9 h-9 rounded-full bg-black/5 items-center justify-center"
                onPress={closeDetail}
              >
                <MaterialIcons name="close" size={20} color={Tokens.colors.text} />
              </Pressable>
            </View>

            {isLoadingDetail ? (
              <View className="gap-3">
                <SkeletonCard />
                <SkeletonCard />
              </View>
            ) : isDetailError || !selectedLeaveDetail ? (
              <View className="items-center justify-center py-10">
                <MaterialIcons name="error-outline" size={42} color={Tokens.colors.error} />
                <Text className="font-inter-bold text-base text-on-surface mt-3 text-center">Gagal memuat detail cuti</Text>
                <Text className="font-inter text-sm text-text-muted mt-1 text-center">Silakan coba lagi.</Text>
                <Button
                  title="Retry"
                  onPress={() => refetchDetail()}
                  className="mt-5 h-12 rounded-2xl"
                />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedLeaveFeedback?.data?.length ? (
                  <GlassCard style={{ padding: 14, marginBottom: 14 }}>
                    <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Diproses Oleh</Text>
                    <View className="mt-3 gap-3">
                      {selectedLeaveFeedback.data.map((item) => (
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
                  <View className="mb-3">
                    <SkeletonCard />
                  </View>
                ) : null}

                <GlassCard style={{ padding: 16, marginBottom: 14 }}>
                  <View className="flex-row items-center gap-3">
                    <View className="w-16 h-16 rounded-2xl overflow-hidden bg-primary/10 items-center justify-center">
                      {selectedLeaveDetail.employee?.photo_url ? (
                        <Image
                          source={{ uri: selectedLeaveDetail.employee.photo_url }}
                          className="w-16 h-16"
                          resizeMode="cover"
                        />
                      ) : (
                        <Text className="font-manrope-extrabold text-lg text-primary">
                          {(selectedLeaveDetail.employee?.full_name || selectedLeaveDetail.employee_id || '?').charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="font-manrope-bold text-lg text-on-surface" numberOfLines={1}>
                        {selectedLeaveDetail.employee?.full_name || 'Karyawan'}
                      </Text>
                      <Text className="font-inter text-xs text-text-muted mt-0.5">
                        {selectedLeaveDetail.employee?.nik || selectedLeaveDetail.employee_id || '-'}
                      </Text>
                      <View className="flex-row items-center gap-2 mt-2 flex-wrap">
                        <StatusBadge label={getLeaveStatus(selectedLeaveDetail)} type={getStatusType(getLeaveStatus(selectedLeaveDetail)) as any} />
                        {selectedLeaveDetail.document_url ? (
                          <View className="bg-secondary-container px-2.5 py-1 rounded-full">
                            <Text className="font-inter-bold text-[10px] text-on-surface uppercase tracking-wider">Ada dokumen</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </GlassCard>

                <View className="flex-row flex-wrap -mx-1.5">
                  <View className="w-1/2 px-1.5 mb-3">
                    <GlassCard style={{ padding: 14, minHeight: 84 }}>
                      <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Jenis Cuti</Text>
                      <Text className="font-inter-bold text-sm text-on-surface mt-2">
                        {selectedLeaveDetail.leave_type?.name || selectedLeaveDetail.leave_type_name || '-'}
                      </Text>
                    </GlassCard>
                  </View>
                  <View className="w-1/2 px-1.5 mb-3">
                    <GlassCard style={{ padding: 14, minHeight: 84 }}>
                      <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Total Hari</Text>
                      <Text className="font-inter-bold text-sm text-on-surface mt-2">
                        {typeof selectedLeaveDetail.total_days === 'number' ? `${selectedLeaveDetail.total_days} hari` : '-'}
                      </Text>
                    </GlassCard>
                  </View>
                  <View className="w-1/2 px-1.5 mb-3">
                    <GlassCard style={{ padding: 14, minHeight: 84 }}>
                      <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Mulai</Text>
                      <Text className="font-inter-bold text-sm text-on-surface mt-2">
                        {formatDateLabel(selectedLeaveDetail.start_date)}
                      </Text>
                    </GlassCard>
                  </View>
                  <View className="w-1/2 px-1.5 mb-3">
                    <GlassCard style={{ padding: 14, minHeight: 84 }}>
                      <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Selesai</Text>
                      <Text className="font-inter-bold text-sm text-on-surface mt-2">
                        {formatDateLabel(selectedLeaveDetail.end_date || selectedLeaveDetail.start_date)}
                      </Text>
                    </GlassCard>
                  </View>
                </View>

                <GlassCard style={{ padding: 14, marginBottom: 14 }}>
                  <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Alasan</Text>
                  <Text className="font-inter text-sm text-on-surface mt-2 leading-6">
                    {selectedLeaveDetail.reason || '-'}
                  </Text>
                </GlassCard>

                {selectedLeaveDetail.replacement ? (
                  <GlassCard style={{ padding: 14, marginBottom: 14 }}>
                    <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Pengganti</Text>
                    <Text className="font-inter-bold text-sm text-on-surface mt-2">
                      {selectedLeaveDetail.replacement.full_name || selectedLeaveDetail.replacement_id || '-'}
                    </Text>
                  </GlassCard>
                ) : null}

                <GlassCard style={{ padding: 14, marginBottom: 14 }}>
                  <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Dokumen Pendukung</Text>
                  {selectedLeaveDetail.document_url ? (
                    <Pressable
                      onPress={async () => {
                        try {
                          await Linking.openURL(selectedLeaveDetail.document_url as string);
                        } catch {
                          Alert.alert('Error', 'Gagal membuka dokumen');
                        }
                      }}
                      className="mt-3 flex-row items-center justify-between rounded-2xl bg-primary/5 px-4 py-3"
                    >
                      <View className="flex-row items-center gap-2 flex-1 pr-3">
                        <MaterialIcons name="description" size={18} color={Tokens.colors.primary} />
                        <Text className="font-inter-bold text-sm text-primary" numberOfLines={1}>
                          Buka dokumen lampiran
                        </Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={18} color={Tokens.colors.primary} />
                    </Pressable>
                  ) : (
                    <Text className="font-inter text-sm text-text-muted mt-2">Tidak ada dokumen lampiran.</Text>
                  )}
                </GlassCard>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <SuccessAnimation
        visible={showSuccessAnim}
        title="Terkirim!"
        message="Pengajuan izin atau cuti Anda sedang diproses."
        onDone={() => {
          setShowSuccessAnim(false);
          resetForm();
        }}
      />
    </SafeAreaView>
  )
}

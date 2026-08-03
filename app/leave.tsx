import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { MotiView } from 'moti';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PeriodSelector } from '../src/components/common/PeriodSelector';
import { LeaveCreateModal } from '../src/components/leave/LeaveCreateModal';
import { Button } from '../src/components/ui/Button';
import { GlassCard } from '../src/components/ui/GlassCard';
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
import { goBackOrTabs } from '../src/utils/navigation';

function formatTime(timeStr?: string | null) {
  if (!timeStr) return '--:--';
  if (timeStr.includes('T')) return timeStr.split('T')[1].slice(0, 5);
  return timeStr.slice(0, 5);
}

function normalizeTimeInput(value: string) {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function toTimeValue(value?: string | null) {
  if (!value) return null;
  const [hours = '', minutes = ''] = value.split(':');
  const hh = Number(hours);
  const mm = Number(minutes);
  if (!hours || !minutes || Number.isNaN(hh) || Number.isNaN(mm) || hh > 23 || mm > 59) return null;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function isHourlyLeaveType(type?: { code?: string | null; name?: string | null; category?: string | null } | null) {
  const haystack = `${type?.code || ''} ${type?.name || ''} ${type?.category || ''}`.toLowerCase();
  return /hour|jam|per\s*jam|hourly/.test(haystack);
}

function allowsReplacement(type?: { code?: string | null; name?: string | null; category?: string | null } | null) {
  const haystack = `${type?.code || ''} ${type?.name || ''} ${type?.category || ''}`.toLowerCase();
  return /khusus|tahunan/.test(haystack);
}

function isBalanceBypassLeaveType(type?: { code?: string | null; category?: string | null } | null) {
  const code = String(type?.code || '').toUpperCase();
  const category = String(type?.category || '').toUpperCase();
  return code === 'SICK'
    || category === 'SICK'
    || category === 'SPECIAL'
    || category === 'PERMISSION_HOURLY'
    || category === 'PERMISSION_DAILY';
}

function getLeaveDayCount(startDate?: string | null, endDate?: string | null) {
  if (!startDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${(endDate || startDate)}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / 86_400_000) + 1;
}

function formatLeaveTypeName(name?: string | null) {
  if (!name) return '';
  // Remove "Cuti " or "cuti " prefix, case-insensitive
  return name.replace(/^Cuti\s+/i, '');
}

function resolveDocumentUrl(rawUrl?: string | null) {
  if (!rawUrl) return null;
  return rawUrl.startsWith('http')
    ? rawUrl
    : `${process.env.EXPO_PUBLIC_API_URL || 'https://hris.javasuperfood.com'}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
}

function getFileNameFromUrl(rawUrl?: string | null) {
  if (!rawUrl) return 'Lampiran';
  const clean = rawUrl.split('?')[0].split('#')[0];
  const lastPart = clean.split('/').filter(Boolean).pop();
  return lastPart || 'Lampiran';
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
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start?: string, end?: string }>({});
  const [selectedHourlyDate, setSelectedHourlyDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [documentFile, setDocumentFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [openingDocument, setOpeningDocument] = useState(false);
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
  const { data: history = [], isLoading: isLoadingHistory, isError: isHistoryError, refetch: refetchHistory, isFetching: isFetchingHistory } = useQuery({
    queryKey: historyQueryKey,
    queryFn: () => leaveService.getRequests({ employee_id: user?.id, year: selectedYear, month: selectedMonth, limit: 100 }),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (isHistoryError) {
      Alert.alert('Gagal', 'Gagal memuat riwayat cuti. Silakan coba lagi.');
    }
  }, [isHistoryError]);

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
  const visibleLeaveTypes = useMemo(
    () => leaveTypes.filter((type) => !user?.company_id || !type.company_id || type.company_id === user.company_id),
    [leaveTypes, user?.company_id],
  );

  const selectedLeaveType = useMemo(
    () => visibleLeaveTypes.find((type) => type.id === form.leave_type_id),
    [form.leave_type_id, visibleLeaveTypes],
  );

  const { data: colleagues = [], isLoading: isLoadingColleagues } = useQuery({
    queryKey: ['colleagues', profile?.division_id, debouncedSearch],
    queryFn: () => employeeService.getColleagues(profile?.division_id, debouncedSearch),
    enabled: !!profile?.division_id,
  });

  const { data: leaveBalances = [] } = useQuery({
    queryKey: ['leave-balances', user?.id, selectedYear],
    queryFn: () => leaveService.getBalances(user?.id as string, selectedYear),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const selectedLeaveBalance = useMemo(
    () => leaveBalances.find((balance) => balance.leave_type_id === form.leave_type_id),
    [form.leave_type_id, leaveBalances],
  );

  const isHourlyLeave = isHourlyLeaveType(selectedLeaveType);
  const canChooseReplacement = allowsReplacement(selectedLeaveType);
  const isBalanceBypassed = isBalanceBypassLeaveType(selectedLeaveType);
  const requestedLeaveDays = isHourlyLeave ? 1 : getLeaveDayCount(form.start_date, form.end_date);
  const remainingLeaveDays = selectedLeaveBalance?.remaining_days ?? selectedLeaveType?.max_days_per_year ?? null;
  const isBalanceExceeded = Boolean(selectedLeaveType?.id)
    && !isBalanceBypassed
    && remainingLeaveDays != null
    && requestedLeaveDays > 0
    && requestedLeaveDays > remainingLeaveDays;
  const balanceMessage = selectedLeaveType
    ? (selectedLeaveType.max_days_per_year == null || isBalanceBypassed
      ? 'Tipe cuti ini tidak dibatasi oleh saldo tahunan.'
      : `Sisa cuti ${selectedLeaveType.name} tinggal ${remainingLeaveDays ?? 0} hari.`
    )
    : null;

  // 3. Create Request Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: { request: CreateLeaveRequest; documentFile: { uri: string; name: string; mimeType?: string } | null }) => {
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
      Alert.alert('Gagal', message);
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
    setTimeout(() => {
      setSelectedDetailId(null);
    }, 400);
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

    const isDocStrictlyRequired = Boolean(selectedLeaveType?.requires_document && !selectedLeaveType?.optional_document);
    if (isDocStrictlyRequired && !documentFile) {
      Alert.alert('Gagal', `Pengajuan ${selectedLeaveType?.name || 'izin'} ini mewajibkan Anda melampirkan dokumen pendukung.`);
      return;
    }

    if (!isBalanceBypassed && selectedLeaveType?.max_days_per_year != null) {
      if (isBalanceExceeded) {
        Alert.alert('Gagal', `Sisa cuti ${selectedLeaveType.name} tinggal ${remainingLeaveDays ?? 0} hari.`);
        return;
      }
    }

    if (!payload.reason || payload.reason.trim().length < 5) {
      Alert.alert('Mohon masukkan alasan minimal 5 karakter');
      return;
    }

    if (isHourlyLeave) {
      const startTime = toTimeValue(payload.start_time);
      const endTime = toTimeValue(payload.end_time);
      if (!startTime || !endTime) {
        Alert.alert('Upss!', 'Pilih jam mulai dan jam selesai dahulu');
        return;
      }
      payload.start_time = startTime;
      payload.end_time = endTime;
    } else if (!payload.start_date || !payload.end_date) {
      Alert.alert('Upss!', 'Pilih tanggal dahulu');
      return;
    }

    // console.log('[Leave] Submitting payload:', payload);
    createMutation.mutate({
      request: payload,
      documentFile,
    });
  };

  useEffect(() => {
    if (!form.leave_type_id) return;
    if (visibleLeaveTypes.some((type) => type.id === form.leave_type_id)) return;

    setForm((prev) => ({ ...prev, leave_type_id: '' }));
  }, [form.leave_type_id, setForm, visibleLeaveTypes]);

  const today = new Date().toISOString().slice(0, 10);

  const handleSelectLeaveType = (typeId: string) => {
    const nextType = visibleLeaveTypes.find((type) => type.id === typeId);
    const nextIsHourly = isHourlyLeaveType(nextType);
    const nextCanChooseReplacement = allowsReplacement(nextType);

    setForm((prev) => ({
      ...prev,
      leave_type_id: typeId,
      start_date: nextIsHourly ? selectedHourlyDate : prev.start_date,
      end_date: nextIsHourly ? selectedHourlyDate : prev.end_date,
      start_time: nextIsHourly ? prev.start_time : '',
      end_time: nextIsHourly ? prev.end_time : '',
      replacement_id: nextCanChooseReplacement ? prev.replacement_id : '',
    }));
    setSelectedRange({});
    setSelectedHourlyDate(today);
    if (!nextType?.requires_document && !nextType?.optional_document) {
      setDocumentFile(null);
    }
    if (!nextCanChooseReplacement) {
      setReplacementModalVisible(false);
      setColleagueSearch('');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setDocumentFile({
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
      });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Gagal memilih gambar');
    }
  };

  const clearDocument = () => setDocumentFile(null);

  const openLeaveDocument = async (rawUrl?: string | null) => {
    if (!rawUrl) return;

    const fullUrl = resolveDocumentUrl(rawUrl);
    if (!fullUrl) return;

    try {
      setOpeningDocument(true);
      const fileName = getFileNameFromUrl(rawUrl);
      const localUri = `${FileSystem.cacheDirectory}${fileName}`;
      const result = await FileSystem.downloadAsync(fullUrl, localUri);
      await Sharing.shareAsync(result.uri);
    } catch (error: any) {
      Alert.alert('Gagal', error?.message || 'Gagal membuka dokumen');
    } finally {
      setOpeningDocument(false);
    }
  };

  const resetAndCloseCreate = () => {
    setModalVisible(false);
    setSelectedRange({});
    setDocumentFile(null);
    setColleagueSearch('');
    setReplacementModalVisible(false);
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
    setReplacementModalVisible(false);
    setModalVisible(false);
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
          onPress={() => goBackOrTabs(router)}
          className="w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm active:opacity-60"
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <MaterialIcons name="arrow-back" size={22} color={Tokens.colors.primary} />
        </Pressable>
        <View className="flex-1 ml-3">
          <Text className="font-manrope-extrabold text-3xl text-primary">Izin & Cuti</Text>
          <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Ajukan dan pantau izin atau cuti</Text>
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
          <PeriodSelector
            month={selectedMonth}
            year={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            title="FIlter Riwayat"
            subtitle="Riwayat pengajuan berdasarkan bulan dan tahun"
          />
        </View>

        <View className="flex-row justify-between items-center mb-4">
          <Text className="font-manrope-bold text-lg text-primary">Riwayat Izin & Cuti</Text>
          <View className="bg-primary/10 px-3 py-1 rounded-full">
            <Text className="font-inter-bold text-[10px] text-primary">{history.length} Tercatat</Text>
          </View>
        </View>

        {isLoadingHistory ? (
          <View className="mt-2">
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : history.length === 0 ? (
          <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'timing', duration: 400 }}>
            <GlassCard style={{ alignItems: 'center', padding: 24, paddingVertical: 48, marginTop: 16 }}>
              <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 500, delay: 200 }}
              >
                <MaterialIcons name="event-busy" size={64} color={Tokens.colors.outline} />
              </MotiView>
              <Text className="font-manrope-bold text-lg text-primary mt-4">Belum Ada Pengajuan</Text>
              <Text className="font-inter text-sm text-text-muted text-center mt-2 mb-5">
                Anda belum pernah mengajukan izin / cuti.
              </Text>
            </GlassCard>
          </MotiView>
        ) : (
          <View className="gap-0">
            {history.map((item, index) => {
              const typeName = item.leave_type_name || leaveTypes.find(t => t.id === item.leave_type_id)?.name;
              const displayTitle = typeName ? `Pengajuan cuti ${formatLeaveTypeName(typeName)}` : 'Pengajuan Izin/Cuti';

              const isSameDate = item.start_date === item.end_date || !item.end_date;
              const timeString = item.start_time && item.end_time ? ` (${formatTime(item.start_time)} - ${formatTime(item.end_time)})` : '';
              const dateDisplay = isSameDate ? `${item.start_date}${timeString}` : `${item.start_date} to ${item.end_date}`;
              const status = getLeaveStatus(item);

              return (
                <Pressable
                  key={item.id}
                  onPress={() => openDetail(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Lihat detail ${displayTitle}`}
                >
                  <GlassCard style={{ padding: 16, marginBottom: 12 }}>
                    <View className="flex-row justify-between items-start mb-2.5">
                      <View className="flex-1 pr-2">
                        <View className="flex-row items-center gap-2 mb-1">
                          <Text className="font-inter-bold text-[11px] text-text-muted uppercase tracking-widest" numberOfLines={1}>
                            {displayTitle}
                          </Text>
                          <View className="flex-row items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
                            <MaterialIcons name="visibility" size={11} color={Tokens.colors.primary} />
                          </View>
                        </View>
                        <View className="flex-row items-center gap-1.5 mt-1.5">
                          <Text className="font-inter-medium text-xs text-text-muted mr-1">Tanggal:</Text>
                          <Text className="font-semibold text-sm text-black">
                            {dateDisplay}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-1.5 mt-1">
                          <Text className="font-inter-medium text-xs text-text-muted mr-1">Dibuat:</Text>
                          <Text className="font-inter-medium text-xs text-text-muted">
                            {formatDateTimeLabel(item.created_at)}
                          </Text>
                        </View>
                      </View>
                      <StatusBadge label={status} type={getStatusType(status) as any} />
                    </View>
                  </GlassCard>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <LeaveCreateModal
        visible={modalVisible}
        onClose={resetAndCloseCreate}
        leaveTypes={visibleLeaveTypes}
        companyId={user?.company_id}
        form={form}
        onSelectLeaveType={handleSelectLeaveType}
        formatLeaveTypeName={formatLeaveTypeName}
        isHourlyLeave={isHourlyLeave}
        selectedHourlyDate={selectedHourlyDate}
        setSelectedHourlyDate={setSelectedHourlyDate}
        normalizeTimeInput={normalizeTimeInput}
        selectedRange={selectedRange}
        today={today}
        markedDates={markedDates}
        onDayPress={onDayPress}
        setForm={setForm}
        canChooseReplacement={canChooseReplacement}
        replacementModalVisible={replacementModalVisible}
        setReplacementModalVisible={setReplacementModalVisible}
        colleagues={colleagues}
        isLoadingColleagues={isLoadingColleagues}
        colleagueSearch={colleagueSearch}
        setColleagueSearch={setColleagueSearch}
        userId={user?.id}
        documentFile={documentFile}
        onClearDocument={clearDocument}
        onPickImage={pickImage}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
        leaveBalance={selectedLeaveBalance}
        leaveLimit={selectedLeaveType?.max_days_per_year ?? null}
        canSubmit={!isBalanceExceeded && !createMutation.isPending}
        balanceMessage={balanceMessage}
      />

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
                  {(isHourlyLeaveType(selectedLeaveDetail.leave_type) || selectedLeaveDetail.start_time || selectedLeaveDetail.end_time) ? (
                    <View className="w-full px-1.5 mb-3">
                      <GlassCard style={{ padding: 14, minHeight: 84 }}>
                        <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Jam Sesi (Izin Jam)</Text>
                        <Text className="font-inter-bold text-sm text-on-surface mt-2">
                          {formatTime(selectedLeaveDetail.start_time)} - {formatTime(selectedLeaveDetail.end_time)}
                        </Text>
                      </GlassCard>
                    </View>
                  ) : null}
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
                    <View className="mt-3">
                      {(() => {
                        const rawUrl = selectedLeaveDetail.document_url as string;
                        const fullUrl = resolveDocumentUrl(rawUrl);
                        const fileName = getFileNameFromUrl(rawUrl);
                        const isImage = !!fullUrl?.match(/\.(jpeg|jpg|gif|png|webp)$/i);

                        return (
                          <>
                            {isImage && fullUrl ? (
                              <Pressable
                                onPress={() => setPreviewImageUri(fullUrl)}
                                className="relative w-full h-48 rounded-xl overflow-hidden mb-3 bg-black/5 border border-black/5 active:opacity-90"
                              >
                                <Image
                                  source={{ uri: fullUrl }}
                                  className="w-full h-full"
                                  resizeMode="cover"
                                />
                              </Pressable>
                            ) : (
                              <View className="flex-row items-center justify-between bg-black/5 px-3 py-3 rounded-xl">
                                <View className="flex-1 pr-3">
                                  <Text className="font-inter-bold text-sm text-on-surface" numberOfLines={1}>
                                    {fileName}
                                  </Text>
                                  <Text className="font-inter text-[10px] text-text-muted mt-1" numberOfLines={1}>
                                    {fullUrl || rawUrl}
                                  </Text>
                                </View>
                                <Pressable
                                  onPress={() => openLeaveDocument(rawUrl)}
                                  disabled={openingDocument}
                                  className="h-9 px-3 rounded-full bg-primary items-center justify-center disabled:opacity-60"
                                >
                                  <Text className="font-inter-bold text-[11px] text-white">
                                    {openingDocument ? 'Membuka...' : 'Buka'}
                                  </Text>
                                </Pressable>
                              </View>
                            )}
                          </>
                        );
                      })()}
                    </View>
                  ) : (
                    <Text className="font-inter text-sm text-text-muted mt-2">Tidak ada dokumen lampiran.</Text>
                  )}
                </GlassCard>

                {getLeaveStatus(selectedLeaveDetail) === 'PENDING' && (
                  <Pressable
                    onPress={() => {
                      closeDetail();
                      setTimeout(() => {
                        handleCancel(selectedLeaveDetail.id);
                      }, 300);
                    }}
                    className="mt-2 mb-4 flex-row items-center justify-center gap-2 bg-error/10 px-4 py-3.5 rounded-2xl"
                  >
                    <MaterialIcons name="close" size={18} color={Tokens.colors.error} />
                    <Text className="font-inter-bold text-sm text-error uppercase tracking-wider">Batalkan Pengajuan</Text>
                  </Pressable>
                )}
              </ScrollView>
            )}

            {/* Image Preview / Zoom Modal */}
            <Modal
              visible={!!previewImageUri}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setPreviewImageUri(null)}
            >
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
                <Pressable
                  onPress={() => setPreviewImageUri(null)}
                  style={{ position: 'absolute', top: 50, right: 20, zIndex: 50, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <MaterialIcons name="close" size={28} color="#FFFFFF" />
                </Pressable>

                {previewImageUri ? (
                  <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
                    minimumZoomScale={1}
                    maximumZoomScale={4}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <Image
                      source={{ uri: previewImageUri }}
                      style={{ width: '100%', height: '80%' }}
                      resizeMode="contain"
                    />
                  </ScrollView>
                ) : null}
              </View>
            </Modal>
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

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../src/components/ui/GlassCard';
import { StatusBadge } from '../src/components/ui/StatusBadge';
import { Tokens } from '../src/core/theme/tokens';
import { formatOvertimeTime } from '../src/features/overtime/time';
import { approvalService } from '../src/services/approval.service';
import { useAuthStore } from '../src/stores/auth.store';
import {
  ApprovalItem,
  getApprovalReferenceDetail,
  getCorrectionApprovalDetail,
  getLeaveApprovalDetail,
  getOvertimeApprovalDetail,
  getResignApprovalDetail,
} from '../src/types/approval';

export default function ApprovalsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null);
  const approvalSource = tab === 'pending' ? 'pending' : 'history';

  // 1. Query data
  const {
    data: approvals = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['approvals', approvalSource, user?.id],
    queryFn: async () => {
      try {
        return tab === 'pending'
          ? await approvalService.getPending()
          : await approvalService.getHistory();
      } catch (err: any) {
        console.error(`[ApprovalsScreen] Fetch error:`, err?.message || err);
        throw err;
      }
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    placeholderData: (previous) => previous,
  });

  useFocusEffect(
    React.useCallback(() => {
      if (!user?.id) return;
      refetch();
    }, [approvalSource, refetch, user?.id])
  );

  // 2. Process Approval/Rejection Mutation
  const processMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      approvalService.processAction(id, action),
    onSuccess: async (_, variables) => {
      Alert.alert(
        'Sukses',
        variables.action === 'APPROVE' ? 'Permintaan berhasil disetujui' : 'Permintaan berhasil ditolak'
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['approvals', 'pending', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['approvals', 'history', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['home-approvals', user?.id] }),
        queryClient.refetchQueries({ queryKey: ['approvals', approvalSource, user?.id], type: 'active' }),
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Gagal', error.response?.data?.message || 'Gagal memproses persetujuan');
    }
  });

  const handleAction = (id: string, action: 'APPROVE' | 'REJECT') => {
    Alert.alert(
      action === 'APPROVE' ? 'Setujui Permintaan' : 'Tolak Permintaan',
      `Apakah Anda yakin ingin ${action === 'APPROVE' ? 'menyetujui' : 'menolak'} pengajuan ini?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: action === 'APPROVE' ? 'Setujui' : 'Tolak',
          style: action === 'APPROVE' ? 'default' : 'destructive',
          onPress: () => processMutation.mutate({ id, action }),
        }
      ]
    );
  };

  const onRefresh = () => {
    refetch();
  };

  // Filter types for chips
  const moduleFilters = [
    { key: 'all', label: 'Semua' },
    { key: 'LEAVE', label: 'Cuti / Izin' },
    { key: 'OVERTIME', label: 'Lembur' },
    { key: 'ATTENDANCE_CORRECTION', label: 'Koreksi Absen' },
    { key: 'VISIT', label: 'Dinas Luar' },
    { key: 'RESIGN', label: 'Resign' },
  ];

  const getModuleLabel = (moduleName: string) => {
    switch (moduleName) {
      case 'LEAVE': return 'Cuti & Izin';
      case 'OVERTIME': return 'Kerja Lembur';
      case 'ATTENDANCE_CORRECTION': return 'Koreksi Absen';
      case 'VISIT': return 'Kunjungan Dinas';
      case 'RESIGN': return 'Resign Kerja';
      default: return moduleName;
    }
  };

  const getApprovalTypeLabel = (item: ApprovalItem) => {
    const referenceType = String(item.reference_type || '').toLowerCase();
    switch (referenceType) {
      case 'overtime_record':
        return 'Lembur';
      case 'leave_request':
        return 'Cuti / Izin';
      case 'attendance_correction':
        return 'Koreksi Absen';
      case 'attendance_visit':
        return 'Dinas Luar';
      case 'resign_request':
        return 'Resign';
      default:
        return getModuleLabel(item.module_name);
    }
  };

  const getRequesterDisplayName = (item: ApprovalItem) =>
    item.requester_name || item.requester?.full_name || item.employee_name || '-';

  const filteredApprovals = useMemo(() => {
    const list = approvals;
    const getApprovalState = (item: ApprovalItem) => String(item.action || item.status || '').toUpperCase();

    const byModule = selectedModule === 'all'
      ? list
      : list.filter((item) => String(item.module_name || '').toUpperCase() === selectedModule);

    const byTab = tab === 'pending'
      ? byModule.filter((item) => getApprovalState(item) === 'PENDING')
      : byModule.filter((item) => getApprovalState(item) !== 'PENDING');

    const term = searchQuery.trim().toLowerCase();
    if (!term) return byTab;

    return byTab.filter((item) => {
      const haystack = [
        item.requester_name,
        item.module_name,
        item.reference_type,
        item.status,
        item.action,
        item.comment,
        item.approved_at,
        item.description,
        item.reference_detail?.reason,
        item.level_order
      ]
        .filter(Boolean)
        .map((val) => String(val).toLowerCase());

      return haystack.some((val) => val.includes(term));
    });
  }, [approvals, selectedModule, searchQuery, tab]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      const day = d.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${day} ${months[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return dateStr;
    }
  };

  const parseDateOnly = (value?: string | null) => {
    if (!value) return null;
    const dateOnly = value.split('T')[0].split(' ')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  };

  const formatDayLabel = (value?: string | null) => {
    const date = parseDateOnly(value);
    if (!date) return '-';
    return new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(date);
  };

  const formatDateLabel = (value?: string | null) => {
    const date = parseDateOnly(value);
    if (!date) return '-';
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  };

  const getLeaveTotalDays = (detail: { start_date?: string | null; end_date?: string | null; total_days?: number | null }) => {
    if (typeof detail.total_days === 'number' && Number.isFinite(detail.total_days) && detail.total_days > 0) {
      return detail.total_days;
    }

    const start = parseDateOnly(detail.start_date);
    const end = parseDateOnly(detail.end_date || detail.start_date);
    if (!start || !end) return null;

    return Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
  };

  const formatFullDate = (date?: string) => {
    if (!date) return '-';

    return new Date(date).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };


  const renderDetailFields = (item: ApprovalItem) => {
    const detail = getApprovalReferenceDetail(item);
    const createdDate = item.requested_at || item.created_at;
    const approvalDate = item.approved_at || createdDate;
    const createdAtField = (
      <Text className="font-inter text-xs text-text-muted">
        Diajukan Pada: <Text className="font-inter-semibold text-on-surface">{formatDate(createdDate)}</Text>
      </Text>
    );

    if (!detail) {
      const timestampLabel = tab === 'pending' ? 'Diajukan pada' : 'Diproses pada';
      return (
        <View className="gap-1 mt-1">
          {createdAtField}
          <Text className="font-inter text-xs text-text-muted">
            {timestampLabel}: <Text className="font-inter-semibold text-on-surface">{formatDate(approvalDate)}</Text>
          </Text>
          {item.comment ? <Text className="font-inter text-xs text-text-muted italic mt-0.5">Catatan: &quot;{item.comment}&quot;</Text> : null}
        </View>
      );
    }

    switch (item.module_name) {
      case 'LEAVE': {
        const detail = ((getLeaveApprovalDetail(item) || getApprovalReferenceDetail(item) || {}) as Record<string, any>);
        const totalDays = getLeaveTotalDays(detail);
        const rawDocumentUrl = detail.document_url ? String(detail.document_url) : null;
        const documentUrl = rawDocumentUrl
          ? rawDocumentUrl.startsWith('http')
            ? rawDocumentUrl
            : `${process.env.EXPO_PUBLIC_API_URL || 'https://hris.javasuperfood.com'}${rawDocumentUrl.startsWith('/') ? '' : '/'}${rawDocumentUrl}`
          : null;
        const hasImageDocument = !!documentUrl && /\.(jpeg|jpg|gif|png)$/i.test(documentUrl);
        const replacementLabel = detail.replacement?.full_name || detail.replacement_name || detail.replacement_id || null;
        return (
          <View className="gap-1 mt-1">
            {createdAtField}
            <Text className="font-inter text-xs text-text-muted">
              Tipe: <Text className="font-inter-semibold text-on-surface">{detail.leave_type_name || detail.leave_type?.name || '-'}</Text>
            </Text>
            <Text className="font-inter text-xs text-text-muted">
              Untuk Tanggal:{' '}
              <Text className="font-inter-semibold text-on-surface">
                {detail.start_date
                  ? detail.end_date && detail.end_date !== detail.start_date
                    ? `${formatFullDate(detail.start_date)} s/d ${formatFullDate(detail.end_date)}`
                    : formatFullDate(detail.start_date)
                  : '-'}
              </Text>

              {typeof totalDays === 'number' && (
                <Text className="font-inter-semibold text-on-surface">
                  {' '}· {totalDays} {totalDays > 1 ? 'hari' : 'hari'}
                </Text>
              )}
            </Text>
            {replacementLabel ? (
              <Text className="font-inter text-xs text-text-muted">
                Pengganti: <Text className="font-inter-semibold text-on-surface">{replacementLabel}</Text>
              </Text>
            ) : null}
            {hasImageDocument ? (
              <Text className="font-inter text-xs text-text-muted">
                Dokumen:{' '}
                <Text
                  onPress={() => setPhotoModalUrl(documentUrl)}
                  className="font-inter-semibold text-primary underline"
                >
                  Lihat dokumen
                </Text>
              </Text>
            ) : null}
            {detail.reason ? <Text className="font-inter text-xs text-text-muted italic mt-0.5">Alasan: &quot;{detail.reason}&quot;</Text> : null}
          </View>
        );
      }
      case 'OVERTIME': {
        const detail = ((getOvertimeApprovalDetail(item) || getApprovalReferenceDetail(item) || {}) as Record<string, any>);
        return (
          <View className="gap-1 mt-1">
            {createdAtField}
            <Text className="font-inter text-xs text-text-muted">
              Tanggal Lembur:{' '}
              <Text className="font-inter-semibold text-on-surface">
                {detail.overtime_date || detail.date ? (
                  <>
                    {formatDayLabel(detail.overtime_date || detail.date)},{' '}
                    {formatDateLabel(detail.overtime_date || detail.date)}
                  </>
                ) : (
                  '-'
                )}
              </Text>
            </Text>
            <Text className="font-inter text-xs text-text-muted">
              Durasi: <Text className="font-inter-semibold text-on-surface">{detail.overtime_hours || detail.hours || '-'} Jam</Text>
            </Text>
            {(detail.start_time || detail.end_time) ? (
              <Text className="font-inter text-xs text-text-muted">
                Jam: <Text className="font-inter-semibold text-on-surface">{formatOvertimeTime(detail.start_time)} - {formatOvertimeTime(detail.end_time)}</Text>
              </Text>
            ) : null}
            <Text className="font-inter text-xs text-text-muted">
              Tipe: <Text className="font-inter-semibold text-on-surface">{detail.overtime_type || '-'}</Text>
            </Text>
            <Text className="font-inter text-xs text-text-muted">
              Nominal: <Text className="font-inter-semibold text-on-surface">
                {typeof detail.overtime_amount === 'number' ? `Rp ${detail.overtime_amount.toLocaleString('id-ID')}` : detail.overtime_amount || '-'}
              </Text>
            </Text>
            {detail.reason ? <Text className="font-inter text-xs text-text-muted italic mt-0.5">Alasan: &quot;{detail.reason}&quot;</Text> : null}
          </View>
        );
      }
      case 'ATTENDANCE_CORRECTION': {
        const detail = ((getCorrectionApprovalDetail(item) || getApprovalReferenceDetail(item) || {}) as Record<string, any>);
        return (
          <View className="gap-1 mt-1">
            {createdAtField}
            <Text className="font-inter text-xs text-text-muted">
              Koreksi Masuk: <Text className="font-inter-semibold text-on-surface">{detail.corrected_checkin || '-'}</Text>
            </Text>
            <Text className="font-inter text-xs text-text-muted">
              Koreksi Pulang: <Text className="font-inter-semibold text-on-surface">{detail.corrected_checkout || '-'}</Text>
            </Text>
            {detail.reason ? <Text className="font-inter text-xs text-text-muted italic mt-0.5">Alasan: &quot;{detail.reason}&quot;</Text> : null}
          </View>
        );
      }
      case 'ATTENDANCE_VISIT':
      case 'VISIT': {
        const detail = ((getApprovalReferenceDetail(item) || {}) as Record<string, any>);
        return (
          <View className="gap-1 mt-1">
            {createdAtField}
            <Text className="font-inter text-xs text-text-muted">
              Kunjungan Ke: <Text className="font-inter-semibold text-on-surface">{detail.location_name || '-'}</Text>
            </Text>
            {detail.notes ? <Text className="font-inter text-xs text-text-muted italic mt-0.5">Catatan: &quot;{detail.notes}&quot;</Text> : null}
          </View>
        );
      }
      case 'RESIGN': {
        const detail = ((getResignApprovalDetail(item) || getApprovalReferenceDetail(item) || {}) as Record<string, any>);
        return (
          <View className="gap-1 mt-1">
            {createdAtField}
            <Text className="font-inter text-xs text-text-muted">
              Efektif Resign: <Text className="font-inter-semibold text-on-surface">{detail.resign_date || '-'}</Text>
            </Text>
            {detail.reason ? <Text className="font-inter text-xs text-text-muted italic mt-0.5">Alasan: &quot;{detail.reason}&quot;</Text> : null}
          </View>
        );
      }
      default:
        return (
          <View className="gap-1 mt-1">
            {createdAtField}
            {detail.reason ? <Text className="font-inter text-xs text-text-muted italic">Catatan: &quot;{detail.reason}&quot;</Text> : null}
          </View>
        );
    }
  };

  const renderPendingNotice = (item: ApprovalItem) => {
    const histories = [...(item.histories ?? [])].sort((a, b) => (a.level_order ?? 0) - (b.level_order ?? 0));
    const lastAction = histories.length > 0 ? histories[histories.length - 1] : null;
    const hasRejected = histories.some((history) => String(history.action || '').toUpperCase() === 'REJECT');
    const previousApproverNames = histories
      .map((history) => history.approver?.full_name)
      .filter((name): name is string => Boolean(name))
      .join(', ');

    return (
      <View className="mt-2 rounded-xl bg-primary/5 px-3 py-2">
        <Text className="font-inter-semibold text-[11px] text-primary">
          {hasRejected ? 'Pengajuan sudah ditolak' : 'Menunggu persetujuan kamu'}
        </Text>
        {previousApproverNames ? (
          <View className="mt-1.5">
            <Text className="font-inter text-[11px] text-text-muted">
              Diproses sebelumnya: <Text className="font-inter-semibold text-on-surface">{previousApproverNames}</Text>
            </Text>
            {lastAction?.comment ? (
              <Text className="font-inter text-[11px] text-text-muted italic mt-1">
                Catatan: &quot;{lastAction.comment}&quot;
              </Text>
            ) : null}
          </View>
        ) : (
          <Text className="font-inter text-[11px] text-text-muted mt-0.5">
            Kamu yang memproses pertama.
          </Text>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 pt-2 pb-4 flex-row items-center gap-3 z-10">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm active:opacity-60"
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <MaterialIcons name="arrow-back" size={22} color={Tokens.colors.primary} />
        </Pressable>
        <View className="flex-1">
          <Text className="font-manrope-extrabold text-2xl text-primary">Persetujuan Tim</Text>
          <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Kelola permintaan persetujuan tim</Text>
        </View>
      </View>

      {/* Tabs */}
      <View className="px-5 mb-4 flex-row" style={{ gap: 8 }}>
        <Pressable
          onPress={() => setTab('pending')}
          className={`flex-1 py-3 rounded-2xl border items-center justify-center ${tab === 'pending' ? 'bg-primary border-primary' : 'bg-white border-black/5'
            }`}
        >
          <Text className={`font-inter-bold text-xs ${tab === 'pending' ? 'text-white' : 'text-text-muted'}`}>
            Menunggu Persetujuan
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('history')}
          className={`flex-1 py-3 rounded-2xl border items-center justify-center ${tab === 'history' ? 'bg-primary border-primary' : 'bg-white border-black/5'
            }`}
        >
          <Text className={`font-inter-bold text-xs ${tab === 'history' ? 'text-white' : 'text-text-muted'}`}>
            Riwayat Proses
          </Text>
        </Pressable>
      </View>

      {/* Search Bar */}
      <View className="px-5 mb-4">
        <View className="bg-white border border-black/5 rounded-2xl flex-row items-center px-4 h-12 shadow-sm">
          <MaterialIcons name="search" size={20} color={Tokens.colors.textMuted} />
          <TextInput
            placeholder="Cari nama, tipe, status..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2 font-inter text-sm text-on-surface"
            placeholderTextColor="#8d8fa3"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <MaterialIcons name="cancel" size={16} color={Tokens.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Module Horizontal Chips Filter */}
      <View className="mb-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          className="flex-grow-0"
        >
          {moduleFilters.map((mod) => {
            const isSelected = selectedModule === mod.key;
            return (
              <Pressable
                key={mod.key}
                onPress={() => setSelectedModule(mod.key)}
                className={`px-4 py-2.5 rounded-full border ${isSelected ? 'bg-primary border-primary' : 'bg-white border-black/5'
                  }`}
              >
                <Text className={`font-inter-semibold text-xs ${isSelected ? 'text-white' : 'text-text-muted'}`}>
                  {mod.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main List */}
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={Tokens.colors.primary} />
        }
      >
        {isLoading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color={Tokens.colors.primary} />
          </View>
        ) : filteredApprovals.length === 0 ? (
          <View className="py-20 items-center justify-center">
            <View className="w-16 h-16 rounded-full bg-primary/5 items-center justify-center mb-4">
              <MaterialIcons name="done-all" size={30} color={Tokens.colors.primary} />
            </View>
            <Text className="font-manrope-bold text-lg text-primary">Semua Beres!</Text>
            <Text className="font-inter text-sm text-text-muted text-center mt-1 px-10">
              {tab === 'pending'
                ? 'Tidak ada permintaan persetujuan pending.'
                : 'Belum ada riwayat persetujuan.'}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filteredApprovals.map((item) => {
              const status = item.status || 'PENDING';
              const isPending = tab === 'pending' && (status === 'PENDING' || status === 'IN_PROGRESS');

              return (
                <GlassCard key={item.id} style={{ padding: 16, backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-row items-center flex-1 mr-2" style={{ gap: 8 }}>
                      <View className="w-9 h-9 rounded-2xl bg-primary/5 items-center justify-center">
                        <MaterialIcons name="person" size={20} color={Tokens.colors.primary} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-manrope-bold text-sm text-on-surface" numberOfLines={1}>
                          {getRequesterDisplayName(item)}
                        </Text>
                        <Text className="font-inter-medium text-[10px] text-text-muted uppercase tracking-wider">
                          {getApprovalTypeLabel(item)}
                        </Text>
                      </View>
                    </View>
                    <StatusBadge
                      label={status}
                      type={status === 'APPROVED' ? 'secondary' : status === 'REJECTED' ? 'error' : 'warning'}
                    />
                  </View>

                  {tab === 'history' ? (
                    <View className="my-2 py-2 border-t border-b border-black/5 gap-1.5">
                      <View className="flex-row items-center" style={{ gap: 6 }}>
                        <MaterialIcons name="access-time" size={13} color={Tokens.colors.textMuted} />
                        <Text className="font-inter text-[11px] text-text-muted">
                          Diproses pada {formatDate(item.approved_at || item.requested_at || item.created_at)}
                        </Text>
                      </View>
                      {renderDetailFields(item)}
                    </View>
                  ) : null}

                  {tab === 'pending' ? renderPendingNotice(item) : null}
                  {tab === 'pending' ? (
                    <View className="my-2 py-2 border-t border-b border-black/5 gap-1.5">
                      {renderDetailFields(item)}
                    </View>
                  ) : null}

                  {isPending ? (
                    <View className="flex-row mt-2" style={{ gap: 8 }}>
                      <Pressable
                        onPress={() => handleAction(item.request_id || item.approval_request_id || item.id, 'REJECT')}
                        disabled={processMutation.isPending && processMutation.variables?.id === (item.request_id || item.approval_request_id || item.id)}
                        className="flex-1 h-10 border border-error rounded-xl flex-row items-center justify-center"
                      >
                        {processMutation.isPending &&
                          processMutation.variables?.id === (item.request_id || item.approval_request_id || item.id) &&
                          processMutation.variables?.action === 'REJECT' ? (
                          <ActivityIndicator size="small" color={Tokens.colors.error} />
                        ) : (
                          <>
                            <MaterialIcons name="close" size={16} color={Tokens.colors.error} style={{ marginRight: 4 }} />
                            <Text className="font-inter-bold text-xs text-error">Tolak</Text>
                          </>
                        )}
                      </Pressable>
                      <Pressable
                        onPress={() => handleAction(item.request_id || item.approval_request_id || item.id, 'APPROVE')}
                        disabled={processMutation.isPending && processMutation.variables?.id === (item.request_id || item.approval_request_id || item.id)}
                        className="flex-1 h-10 bg-primary rounded-xl flex-row items-center justify-center"
                      >
                        {processMutation.isPending &&
                          processMutation.variables?.id === (item.request_id || item.approval_request_id || item.id) &&
                          processMutation.variables?.action === 'APPROVE' ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <MaterialIcons name="check" size={16} color="#fff" style={{ marginRight: 4 }} />
                            <Text className="font-inter-bold text-xs text-white">Setujui</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  ) : null}
                </GlassCard>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!photoModalUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoModalUrl(null)}
      >
        <View className="flex-1 bg-black/90" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View className="px-5 pt-2 pb-4 flex-row items-center justify-between">
            <Text className="font-manrope-bold text-lg text-white">Dokumen Pengajuan</Text>
            <Pressable
              onPress={() => setPhotoModalUrl(null)}
              className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
            >
              <MaterialIcons name="close" size={22} color="#fff" />
            </Pressable>
          </View>

          <View className="flex-1 items-center justify-center px-4 pb-6">
            {photoModalUrl ? (
              <Image
                source={{ uri: photoModalUrl }}
                className="w-full h-full"
                resizeMode="contain"
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../src/components/ui/GlassCard';
import { StatusBadge } from '../src/components/ui/StatusBadge';
import { Tokens } from '../src/core/theme/tokens';
import { buildApprovalHistoryLines, getApprovalStatusBadgeType, getApprovalStatusLabel, isApprovalInHistoryForUser, isApprovalPendingForUser } from '../src/features/approvals/status';
import { formatOvertimeTime } from '../src/features/overtime/time';
import { approvalService } from '../src/services/approval.service';
import { useAuthStore } from '../src/stores/auth.store';
import { goBackOrTabs } from '../src/utils/navigation';
import {
  ApprovalItem,
  getApprovalReferenceDetail,
  getCorrectionApprovalDetail,
  getLeaveApprovalDetail,
  getOvertimeApprovalDetail,
  getResignApprovalDetail,
} from '../src/types/approval';

function isHourlyLeaveType(type?: { code?: string | null; name?: string | null; category?: string | null } | null) {
  const haystack = `${type?.code || ''} ${type?.name || ''} ${type?.category || ''}`.toLowerCase();
  return /hour|jam|per\s*jam|hourly/.test(haystack);
}

export default function ApprovalsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null);
  const approvalSource = tab === 'pending' ? 'pending' : 'history';

  const pageSize = 10;

  // 1. Query data
  const {
    data,
    isLoading,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['approvals', approvalSource, user?.id],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        return tab === 'pending'
          ? await approvalService.getPending({ page: pageParam as number, limit: pageSize })
          : await approvalService.getHistory({ page: pageParam as number, limit: pageSize });
      } catch (err: any) {
        console.error(`[ApprovalsScreen] Fetch error:`, err?.message || err);
        throw err;
      }
    },
    enabled: !!user?.id,
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length < pageSize ? undefined : Number(lastPageParam) + 1,
    staleTime: 30 * 1000,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
  });

  const approvals = useMemo(() => data?.pages.flat() ?? [], [data]);

  useFocusEffect(
    React.useCallback(() => {
      if (!user?.id) return;
      refetch();
    }, [refetch, user?.id])
  );

  useEffect(() => {
    if (!searchQuery.trim() || !hasNextPage || isFetchingNextPage) return;

    // ponytail: client-side search scans paginated results; use server-side search when supported.
    void fetchNextPage();
  }, [searchQuery, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // State Modal Konfirmasi Alasan Approver
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ id: string; action: 'APPROVE' | 'REJECT' } | null>(null);
  const [actionComment, setActionComment] = useState('');

  // 2. Process Approval/Rejection Mutation
  const processMutation = useMutation({
    mutationFn: ({ id, action, comment }: { id: string; action: 'APPROVE' | 'REJECT'; comment?: string }) =>
      approvalService.processAction(id, action, comment),
    onSuccess: async (_, variables) => {
      Alert.alert(
        'Sukses',
        variables.action === 'APPROVE' ? 'Permintaan berhasil disetujui' : 'Permintaan berhasil ditolak'
      );
      setActionModalVisible(false);
      setPendingAction(null);
      setActionComment('');
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
    setPendingAction({ id, action });
    setActionComment('');
    setActionModalVisible(true);
  };

  const confirmAction = () => {
    if (!pendingAction) return;
    processMutation.mutate({
      id: pendingAction.id,
      action: pendingAction.action,
      comment: actionComment.trim() || undefined,
    });
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

    const byModule = selectedModule === 'all'
      ? list
      : list.filter((item) => String(item.module_name || '').toUpperCase() === selectedModule);

    const byTab = tab === 'pending'
      ? byModule.filter((item) => isApprovalPendingForUser(item, user?.id))
      : byModule.filter((item) => isApprovalInHistoryForUser(item, user?.id));

    const term = searchQuery.trim().toLowerCase();
    const searchFiltered = !term
      ? byTab
      : byTab.filter((item) => {
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

    // Urutkan selalu paling baru di paling atas (Descending berdasarkan timestamp terbaru)
    return [...searchFiltered].sort((a, b) => {
      const getTime = (item: ApprovalItem) => {
        const rawDate = item.requested_at || item.created_at || item.approved_at;
        return rawDate ? new Date(rawDate).getTime() : 0;
      };
      return getTime(b) - getTime(a);
    });
  }, [approvals, selectedModule, searchQuery, tab, user?.id]);

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

    if (!detail) {
      const timestampLabel = tab === 'pending' ? 'Diajukan pada' : 'Diproses pada';
      return (
        <View className="gap-1 mt-1">
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
        const isHourly = isHourlyLeaveType(detail.leave_type || { name: detail.leave_type_name, code: detail.leave_type_code, category: detail.leave_type_category });

        return (
          <View className="gap-1 mt-1">
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
            {isHourly || detail.start_time || detail.end_time ? (
              <Text className="font-inter text-xs text-text-muted">
                Jam: <Text className="font-inter-semibold text-on-surface">{formatOvertimeTime(detail.start_time)} - {formatOvertimeTime(detail.end_time)}</Text>
              </Text>
            ) : null}
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
        const segments: any[] = Array.isArray(detail.segments) ? detail.segments : [];
        const additionalSegments = segments.filter((seg: any) => typeof seg.sort_order === 'number' ? seg.sort_order > 0 : true);
        const reasonText =
          detail.reason ||
          (detail as any).notes ||
          (item as any).reason ||
          (item as any).notes ||
          (item.reference_detail as any)?.reason ||
          (item.reference_detail as any)?.notes ||
          null;

        return (
          <View className="gap-1 mt-1">
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
                Sesi Utama: <Text className="font-inter-semibold text-on-surface">{formatOvertimeTime(detail.start_time)} - {formatOvertimeTime(detail.end_time)}</Text>
              </Text>
            ) : null}

            {additionalSegments.map((seg, idx) => (
              <Text key={seg.id || idx} className="font-inter text-xs text-text-muted">
                Sesi Tambahan {idx + 1}: <Text className="font-inter-semibold text-on-surface">{formatOvertimeTime(seg.start_time)} - {formatOvertimeTime(seg.end_time)}</Text>
              </Text>
            ))}

            <Text className="font-inter text-xs text-text-muted">
              Tipe: <Text className="font-inter-semibold text-on-surface">{detail.overtime_type || '-'}</Text>
            </Text>
            <Text className="font-inter text-xs text-text-muted">
              Nominal: <Text className="font-inter-semibold text-on-surface">
                {typeof detail.overtime_amount === 'number' ? `Rp ${detail.overtime_amount.toLocaleString('id-ID')}` : detail.overtime_amount || '-'}
              </Text>
            </Text>
            {reasonText ? <Text className="font-inter text-xs text-text-muted italic mt-0.5">Alasan: &quot;{reasonText}&quot;</Text> : null}
          </View>
        );
      }
      case 'ATTENDANCE_CORRECTION': {
        const detail = ((getCorrectionApprovalDetail(item) || getApprovalReferenceDetail(item) || {}) as Record<string, any>);
        const checkinFormatted = detail.corrected_checkin ? formatOvertimeTime(detail.corrected_checkin) : '-';
        const checkoutFormatted = detail.corrected_checkout ? formatOvertimeTime(detail.corrected_checkout) : '-';
        const origCheckinFormatted = detail.original_checkin || detail.attendance?.checkin_time || detail.attendance?.checkin_at
          ? formatOvertimeTime(detail.original_checkin || detail.attendance?.checkin_time || detail.attendance?.checkin_at)
          : '-';
        const origCheckoutFormatted = detail.original_checkout || detail.attendance?.checkout_time || detail.attendance?.checkout_at
          ? formatOvertimeTime(detail.original_checkout || detail.attendance?.checkout_time || detail.attendance?.checkout_at)
          : '-';
        const correctionDate = detail.attendance_date || detail.date || detail.attendance?.date || detail.attendance?.attendance_date;

        return (
          <View className="gap-1 mt-1">
            {correctionDate ? (
              <Text className="font-inter text-xs text-text-muted">
                Tanggal Absen:{' '}
                <Text className="font-inter-semibold text-on-surface">
                  {formatDayLabel(correctionDate)}, {formatDateLabel(correctionDate)}
                </Text>
              </Text>
            ) : null}

            <Text className="font-inter text-xs text-text-muted">
              Jam Original: <Text className="font-inter-semibold text-on-surface">{origCheckinFormatted} s/d {origCheckoutFormatted}</Text>
            </Text>

            <Text className="font-inter text-xs text-text-muted">
              Koreksi Masuk: <Text className="font-inter-semibold text-on-surface">{checkinFormatted}</Text>
            </Text>
            <Text className="font-inter text-xs text-text-muted">
              Koreksi Pulang: <Text className="font-inter-semibold text-on-surface">{checkoutFormatted}</Text>
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
            {detail.reason ? <Text className="font-inter text-xs text-text-muted italic">Catatan: &quot;{detail.reason}&quot;</Text> : null}
          </View>
        );
    }
  };

  const renderPendingNotice = (item: ApprovalItem) => {
    const histories = [...(item.histories ?? [])].sort((a, b) => (a.level_order ?? 0) - (b.level_order ?? 0));
    const lastAction = histories.length > 0 ? histories[histories.length - 1] : null;
    const hasRejected = histories.some((history) => String(history.action || '').toUpperCase() === 'REJECT');
    const historyLines = buildApprovalHistoryLines(item);

    return (
      <View className="mt-2 rounded-xl bg-primary/5 px-3 py-2">
        <Text className="font-inter-semibold text-[11px] text-primary">
          {hasRejected ? 'Pengajuan sudah ditolak' : 'Menunggu persetujuan kamu'}
        </Text>
        {historyLines.length > 0 ? (
          <View className="mt-1.5">
            {historyLines.map((line) => (
              <Text key={line} className="font-inter text-[11px] text-text-muted">
                {line}
              </Text>
            ))}
            {lastAction?.comment ? (
              <Text className="font-inter text-[11px] text-text-muted italic mt-1">
                Catatan : &quot;{lastAction.comment}&quot;
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
            onPress={() => goBackOrTabs(router)}
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
          <RefreshControl refreshing={isFetching && !isFetchingNextPage} onRefresh={onRefresh} tintColor={Tokens.colors.primary} />
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
            {hasNextPage ? (
              <Pressable
                onPress={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="mt-4 py-3 items-center justify-center active:opacity-60 flex-row"
                style={{ gap: 8 }}
              >
                {isFetchingNextPage ? (
                  <ActivityIndicator size="small" color={Tokens.colors.primary} />
                ) : (
                  <>
                    <MaterialIcons name="expand-more" size={18} color={Tokens.colors.primary} />
                    <Text className="font-inter-bold text-xs text-primary">Muat Lebih Banyak</Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filteredApprovals.map((item) => {
              const status = item.status || 'PENDING';
              const statusLabel = getApprovalStatusLabel(item, user?.id);
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
                    <View className="items-end">
                      <StatusBadge
                        label={statusLabel}
                        type={getApprovalStatusBadgeType(item, user?.id)}
                      />
                      <Text className="font-inter text-[11px] text-text-muted mt-1">
                        Dibuat: {formatDate(item.requested_at || item.created_at)}
                      </Text>
                    </View>
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
                      {(() => {
                        const histories = item.histories ?? [];
                        const userHistory = histories.find((h) => h.approver_id === user?.id) || histories[histories.length - 1];
                        const commentText = userHistory?.comment || item.comment;
                        if (!commentText) return null;
                        return (
                          <View className="mt-1.5 p-2.5 rounded-xl bg-primary/5 border border-primary/10">
                            <Text className="font-inter-bold text-[11px] text-primary mb-0.5">Catatan Saya: {commentText}</Text>
                          </View>
                        );
                      })()}
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

            {hasNextPage && (
              <Pressable
                onPress={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="mt-2 py-3 items-center justify-center active:opacity-60 flex-row"
                style={{ gap: 8 }}
              >
                {isFetchingNextPage ? (
                  <ActivityIndicator size="small" color={Tokens.colors.primary} />
                ) : (
                  <>
                    <MaterialIcons name="expand-more" size={18} color={Tokens.colors.primary} />
                    <Text className="font-inter-bold text-xs text-primary">
                      Muat Lebih Banyak
                    </Text>
                  </>
                )}
              </Pressable>
            )}
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

      {/* Modal Alasan Persetujuan / Penolakan */}
      <Modal
        visible={actionModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          if (!processMutation.isPending) {
            setActionModalVisible(false);
            setPendingAction(null);
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View className="flex-1 bg-black/45 justify-end">
            <Pressable
              className="absolute inset-0"
              onPress={() => {
                if (!processMutation.isPending) {
                  setActionModalVisible(false);
                  setPendingAction(null);
                }
              }}
            />
            <KeyboardAwareScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              enableOnAndroid
              enableAutomaticScroll
              enableResetScrollToCoords={false}
              extraScrollHeight={Platform.OS === 'ios' ? 24 : 260}
              extraHeight={260}
              keyboardOpeningTime={0}
              style={{ width: '100%', maxHeight: '90%' }}
            >
              <View className="bg-background rounded-t-[32px] p-6 pb-10 shadow-2xl">
              <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1 pr-3">
                  <Text className="font-manrope-extrabold text-2xl text-primary">
                    {pendingAction?.action === 'APPROVE' ? 'Setujui Pengajuan' : 'Tolak Pengajuan'}
                  </Text>
                  <Text className="font-inter text-xs text-text-muted mt-1">
                    {pendingAction?.action === 'APPROVE'
                      ? 'Tambahkan alasan atau catatan persetujuan (opsional).'
                      : 'Tambahkan alasan atau catatan penolakan.'}
                  </Text>
                </View>
                <Pressable
                  disabled={processMutation.isPending}
                  onPress={() => {
                    setActionModalVisible(false);
                    setPendingAction(null);
                  }}
                  className="w-9 h-9 rounded-full bg-black/5 items-center justify-center"
                >
                  <MaterialIcons name="close" size={20} color={Tokens.colors.text} />
                </Pressable>
              </View>

              <View className="mb-4">
                <Text className="font-inter-bold text-xs text-on-surface mb-2">
                  Catatan / Alasan {pendingAction?.action === 'REJECT' ? '(Disarankan)' : '(Opsional)'}
                </Text>
                <TextInput
                  value={actionComment}
                  onChangeText={setActionComment}
                  placeholder={pendingAction?.action === 'APPROVE' ? 'Contoh: Disetujui, sesuai rencana kerja' : 'Contoh: Kurang dokumen pendukung / jadwal belum sesuai'}
                  multiline
                  numberOfLines={3}
                  className="bg-white border border-black/10 rounded-2xl p-3 font-inter text-sm text-on-surface"
                  style={{ height: 90, textAlignVertical: 'top' }}
                />
              </View>

              <View className="flex-row gap-3">
                <Pressable
                  disabled={processMutation.isPending}
                  onPress={() => {
                    setActionModalVisible(false);
                    setPendingAction(null);
                  }}
                  className="flex-1 h-12 rounded-2xl bg-black/5 items-center justify-center"
                >
                  <Text className="font-inter-bold text-sm text-on-surface">Batal</Text>
                </Pressable>
                <Pressable
                  disabled={processMutation.isPending}
                  onPress={confirmAction}
                  className={`flex-1 h-12 rounded-2xl items-center justify-center ${pendingAction?.action === 'APPROVE' ? 'bg-primary' : 'bg-error'
                    }`}
                >
                  {processMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="font-inter-bold text-sm text-white">
                      {pendingAction?.action === 'APPROVE' ? 'Ya, Setujui' : 'Ya, Tolak'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
            </KeyboardAwareScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

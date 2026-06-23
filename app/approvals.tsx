import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tokens } from '../src/core/theme/tokens';
import { approvalService } from '../src/services/approval.service';
import { useAuthStore } from '../src/stores/auth.store';
import { GlassCard } from '../src/components/ui/GlassCard';
import { StatusBadge } from '../src/components/ui/StatusBadge';
import { ApprovalItem } from '../src/types/approval';

export default function ApprovalsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Query data
  const {
    data: approvals = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['approvals', tab, user?.id],
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
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previous) => previous,
  });

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
        queryClient.invalidateQueries({ queryKey: ['approvals', tab, user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['approvals', 'pending', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['home-approvals', user?.id] }),
        queryClient.refetchQueries({ queryKey: ['approvals', tab, user?.id], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['approvals', 'pending', user?.id], type: 'active' }),
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
    { key: 'ATTENDANCE_VISIT', label: 'Dinas Luar' },
    { key: 'RESIGN', label: 'Resign' },
  ];

  const getModuleLabel = (moduleName: string) => {
    switch (moduleName) {
      case 'LEAVE': return 'Cuti & Izin';
      case 'OVERTIME': return 'Kerja Lembur';
      case 'ATTENDANCE_CORRECTION': return 'Koreksi Absen';
      case 'ATTENDANCE_VISIT': return 'Kunjungan Dinas';
      case 'RESIGN': return 'Resign Kerja';
      default: return moduleName;
    }
  };

  const filteredApprovals = useMemo(() => {
    const list = approvals;

    const byModule = selectedModule === 'all'
      ? list
      : list.filter((item) => String(item.module_name || '').toUpperCase() === selectedModule);

    const term = searchQuery.trim().toLowerCase();
    if (!term) return byModule;

    return byModule.filter((item) => {
      const haystack = [
        item.employee_name,
        item.module_name,
        item.reference_type,
        item.status,
        item.description,
        item.reference_detail?.reason
      ]
        .filter(Boolean)
        .map((val) => String(val).toLowerCase());

      return haystack.some((val) => val.includes(term));
    });
  }, [approvals, selectedModule, searchQuery]);

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

  const renderDetailFields = (item: ApprovalItem) => {
    const detail = item.reference_detail;
    if (!detail) return null;

    switch (item.module_name) {
      case 'LEAVE':
        return (
          <View className="gap-1 mt-1">
            <Text className="font-inter text-xs text-text-muted">
              Tipe: <Text className="font-inter-semibold text-on-surface">{detail.leave_type_name || '-'}</Text>
            </Text>
            <Text className="font-inter text-xs text-text-muted">
              Tanggal: <Text className="font-inter-semibold text-on-surface">{detail.start_date} s/d {detail.end_date || detail.start_date}</Text>
            </Text>
            {detail.reason ? <Text className="font-inter text-xs text-text-muted italic mt-0.5">Alasan: &quot;{detail.reason}&quot;</Text> : null}
          </View>
        );
      case 'OVERTIME':
        return (
          <View className="gap-1 mt-1">
            <Text className="font-inter text-xs text-text-muted">
              Tanggal Lembur: <Text className="font-inter-semibold text-on-surface">{detail.overtime_date || detail.date || '-'}</Text>
            </Text>
            <Text className="font-inter text-xs text-text-muted">
              Durasi: <Text className="font-inter-semibold text-on-surface">{detail.overtime_hours || detail.hours || '-'} Jam</Text>
            </Text>
            {detail.reason ? <Text className="font-inter text-xs text-text-muted italic mt-0.5">Alasan: &quot;{detail.reason}&quot;</Text> : null}
          </View>
        );
      case 'ATTENDANCE_CORRECTION':
        return (
          <View className="gap-1 mt-1">
            <Text className="font-inter text-xs text-text-muted">
              Koreksi Masuk: <Text className="font-inter-semibold text-on-surface">{detail.corrected_checkin || '-'}</Text>
            </Text>
            <Text className="font-inter text-xs text-text-muted">
              Koreksi Pulang: <Text className="font-inter-semibold text-on-surface">{detail.corrected_checkout || '-'}</Text>
            </Text>
            {detail.reason ? <Text className="font-inter text-xs text-text-muted italic mt-0.5">Alasan: &quot;{detail.reason}&quot;</Text> : null}
          </View>
        );
      case 'ATTENDANCE_VISIT':
        return (
          <View className="gap-1 mt-1">
            <Text className="font-inter text-xs text-text-muted">
              Kunjungan Ke: <Text className="font-inter-semibold text-on-surface">{detail.location_name || '-'}</Text>
            </Text>
            {detail.notes ? <Text className="font-inter text-xs text-text-muted italic mt-0.5">Catatan: &quot;{detail.notes}&quot;</Text> : null}
          </View>
        );
      case 'RESIGN':
        return (
          <View className="gap-1 mt-1">
            <Text className="font-inter text-xs text-text-muted">
              Efektif Resign: <Text className="font-inter-semibold text-on-surface">{detail.resign_date || '-'}</Text>
            </Text>
            {detail.reason ? <Text className="font-inter text-xs text-text-muted italic mt-0.5">Alasan: &quot;{detail.reason}&quot;</Text> : null}
          </View>
        );
      default:
        return detail.reason ? <Text className="font-inter text-xs text-text-muted italic mt-1">Catatan: &quot;{detail.reason}&quot;</Text> : null;
    }
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
                          {item.employee_name}
                        </Text>
                        <Text className="font-inter-medium text-[10px] text-text-muted uppercase tracking-wider">
                          {getModuleLabel(item.module_name)}
                        </Text>
                      </View>
                    </View>
                    <StatusBadge
                      label={status}
                      type={status === 'APPROVED' ? 'secondary' : status === 'REJECTED' ? 'error' : 'warning'}
                    />
                  </View>

                  <View className="my-2 py-2 border-t border-b border-black/5 gap-1.5">
                    <View className="flex-row items-center" style={{ gap: 6 }}>
                      <MaterialIcons name="access-time" size={13} color={Tokens.colors.textMuted} />
                      <Text className="font-inter text-[11px] text-text-muted">
                        Diajukan pada {formatDate(item.requested_at)}
                      </Text>
                    </View>
                    {renderDetailFields(item)}
                  </View>

                  {isPending ? (
                    <View className="flex-row mt-2" style={{ gap: 8 }}>
                      <Pressable
                        onPress={() => handleAction(item.id, 'REJECT')}
                        disabled={processMutation.isPending && processMutation.variables?.id === item.id}
                        className="flex-1 h-10 border border-error rounded-xl flex-row items-center justify-center"
                      >
                        {processMutation.isPending &&
                          processMutation.variables?.id === item.id &&
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
                        onPress={() => handleAction(item.id, 'APPROVE')}
                        disabled={processMutation.isPending && processMutation.variables?.id === item.id}
                        className="flex-1 h-10 bg-primary rounded-xl flex-row items-center justify-center"
                      >
                        {processMutation.isPending &&
                          processMutation.variables?.id === item.id &&
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
    </View>
  );
}

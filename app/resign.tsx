import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../src/components/ui/Button';
import { GlassCard } from '../src/components/ui/GlassCard';
import { Input } from '../src/components/ui/Input';
import { SkeletonCard } from '../src/components/ui/Skeleton';
import { StatusBadge } from '../src/components/ui/StatusBadge';
import { Tokens } from '../src/core/theme/tokens';
import { resignService } from '../src/services/resign.service';
import { useAuthStore } from '../src/stores/auth.store';
import { CreateResignRequest } from '../src/types/resign';

LocaleConfig.locales.id = {
  monthNames: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
  monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  dayNames: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
  dayNamesShort: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
  today: 'Hari ini',
};
LocaleConfig.defaultLocale = 'id';

const MONTH_LABELS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAY_LABELS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function getDefaultResignDate() {
  return new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10);
}

function formatIndonesianDate(dateString?: string) {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString || '-';
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return `${DAY_LABELS[date.getDay()]}, ${String(day).padStart(2, '0')} ${MONTH_LABELS[month - 1]} ${year}`;
}

export default function ResignScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [form, setForm] = useState<CreateResignRequest>({
    resign_date: getDefaultResignDate(),
    reason: '',
    handover_notes: '',
  });

  // 1. Fetch My Requests
  const { data: history = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['resign-history', user?.id],
    queryFn: () => resignService.getMyRequests(),
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    placeholderData: (previous) => previous,
  });

  // 2. Submit Mutation
  const submitMutation = useMutation({
    mutationFn: (payload: CreateResignRequest) => resignService.submitRequest(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['resign-history', user?.id] }),
        queryClient.refetchQueries({ queryKey: ['resign-history', user?.id], type: 'active' }),
      ]);
      setModalVisible(false);
      setForm({
        resign_date: getDefaultResignDate(),
        reason: '',
        handover_notes: '',
      });
      Alert.alert('Berhasil', 'Pengajuan pengunduran diri berhasil dikirim');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Gagal mengirim pengajuan');
    }
  });

  const onRefresh = () => {
    refetch();
  };

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        refetch();
      }
    }, [refetch, user?.id])
  );

  const getStatusType = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'secondary';
      case 'PENDING': return 'secondary';
      case 'REJECTED': return 'error';
      case 'CANCELLED': return 'error';
      default: return 'secondary';
    }
  };
  const createHeaderTopPadding = Math.max(insets.top, 12);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute top-16 -right-20 w-72 h-72 rounded-full bg-error/5" />
      <View className="absolute bottom-10 -left-24 w-80 h-80 rounded-full bg-primary/5" />

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
            <Text className="font-manrope-extrabold text-3xl text-primary">Resign</Text>
            <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Daftar pengajuan pengunduran diri</Text>
          </View>
        </View>
        <Pressable
          className="w-12 h-12 rounded-2xl bg-error items-center justify-center shadow-lg shadow-error/30 elevation-8"
          onPress={() => setModalVisible(true)}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={onRefresh}
            tintColor={Tokens.colors.primary}
          />
        }
      >
        <GlassCard style={{ padding: 20, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: Tokens.colors.error }}>
          <Text className="font-inter-bold text-sm text-black mb-2">Penting!</Text>
          <Text className="font-inter text-xs text-text-muted leading-5">
            Pengajuan pengunduran diri membutuhkan waktu proses minimal 7 hari (One Week Notice) sesuai kebijakan perusahaan.
          </Text>
        </GlassCard>

        <Text className="font-manrope-bold text-lg text-primary mb-4">Riwayat Pengajuan</Text>

        {isLoading ? (
          <View className="mt-2">
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : history.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', padding: 40, marginTop: 8 }}>
            <MaterialIcons name="assignment-late" size={64} color={Tokens.colors.outline} />
            <Text className="font-manrope-bold text-lg text-primary mt-4 text-center">
              Belum Ada Pengajuan
            </Text>
            <Text className="font-inter-medium text-sm text-text-muted mt-2 text-center">
              Belum ada pengajuan resign yang dibuat untuk akun ini.
            </Text>
          </GlassCard>
        ) : (
          <View className="gap-4">
            {history.map((item) => (
              <GlassCard key={item.id} style={{ padding: 16 }}>
                <View className="flex-row justify-between items-start mb-3">
                  <View>
                    <Text className="font-inter-bold text-base text-black">Pengajuan Resign</Text>
                    <Text className="font-inter-medium text-xs text-text-muted mt-1">Tanggal efektif: {formatIndonesianDate(item.resign_date)}</Text>
                  </View>
                  <StatusBadge label={item.status} type={getStatusType(item.status) as any} />
                </View>
                <View className="bg-black/5 p-3 rounded-xl">
                  <Text className="font-inter text-sm text-black leading-5">{item.reason}</Text>
                </View>
                <Text className="font-inter-medium text-[10px] text-text-muted mt-3 italic">Diajukan pada: {formatIndonesianDate(item.created_at.split('T')[0])}</Text>
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-background" edges={['left', 'right', 'bottom']}>
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View className="flex-row justify-between items-start px-5 pb-5" style={{ paddingTop: createHeaderTopPadding }}>
              <View className="flex-row items-center gap-3 flex-1">
                <Pressable
                  onPress={() => setModalVisible(false)}
                  className="w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm active:opacity-60"
                  accessibilityRole="button"
                  accessibilityLabel="Tutup form resign"
                >
                  <MaterialIcons name="arrow-back" size={22} color={Tokens.colors.primary} />
                </Pressable>
                <View className="flex-1">
                  <Text className="font-manrope-extrabold text-3xl text-primary">Ajukan Resign</Text>
                  <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Lengkapi alasan dan tanggal efektif</Text>
                </View>
              </View>
            </View>

            <View className="flex-1 relative">
              <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={{ marginBottom: 16 }}>
                  <Text className="font-inter-bold text-[12px] text-black mb-2 ml-1">Tanggal Efektif</Text>
                  <Pressable
                    onPress={() => setCalendarVisible(true)}
                    className="flex-row items-center justify-between px-4 py-4 rounded-2xl bg-black/[0.03]"
                    accessibilityRole="button"
                    accessibilityLabel="Pilih tanggal efektif"
                  >
                    <View className="flex-1 pr-3">
                      <Text className="font-inter text-base text-black">
                        {formatIndonesianDate(form.resign_date)}
                      </Text>
                      <Text className="font-inter-medium text-[11px] text-text-muted mt-1">
                        Ketuk untuk membuka kalender
                      </Text>
                    </View>
                    <MaterialIcons name="calendar-today" size={20} color={Tokens.colors.primary} />
                  </Pressable>
                </View>

                <Input
                  label="Alasan Pengunduran Diri"
                  value={form.reason}
                  onChangeText={(text) => setForm({ ...form, reason: text })}
                  placeholder="Tulis alasan Anda mengundurkan diri"
                  multiline
                  numberOfLines={3}
                  style={{ height: 100, textAlignVertical: 'top', paddingTop: 12 }}
                />

                <Input
                  label="Catatan Handover (Opsional)"
                  value={form.handover_notes || ''}
                  onChangeText={(text) => setForm({ ...form, handover_notes: text })}
                  placeholder="Catatan singkat tentang tanggung jawab Anda"
                  multiline
                  numberOfLines={2}
                  style={{ height: 80, textAlignVertical: 'top', paddingTop: 12 }}
                />

                <View className="bg-error/5 p-4 rounded-xl mb-6">
                  <Text className="font-inter-medium text-xs text-error text-center">
                    Tindakan ini bersifat permanen setelah disetujui oleh HR.
                  </Text>
                </View>

                <Button
                  title="Konfirmasi Pengajuan"
                  onPress={() => {
                    if (!form.reason || !form.resign_date) {
                      Alert.alert('Error', 'Harap isi tanggal efektif dan alasan');
                      return;
                    }
                    submitMutation.mutate(form);
                  }}
                  loading={submitMutation.isPending}
                  className="bg-error h-14 rounded-2xl"
                />
              </ScrollView>

              {calendarVisible ? (
                <View className="absolute inset-0">
                  <Pressable
                    className="absolute inset-0 bg-black/40"
                    onPress={() => setCalendarVisible(false)}
                  />

                  <View className="absolute inset-x-0 bottom-0 bg-background rounded-t-[28px] p-5 max-h-[80%]">
                    <View className="flex-row justify-between items-center mb-4">
                      <View>
                        <Text className="font-manrope-bold text-xl text-primary">Pilih Tanggal Efektif</Text>
                        <Text className="font-inter text-xs text-text-muted">Tap tanggal untuk memilih</Text>
                      </View>
                      <Pressable
                        onPress={() => setCalendarVisible(false)}
                        className="w-9 h-9 rounded-full bg-black/5 items-center justify-center"
                      >
                        <MaterialIcons name="close" size={18} color={Tokens.colors.text} />
                      </Pressable>
                    </View>

                    <Calendar
                      current={form.resign_date}
                      minDate={new Date().toISOString().slice(0, 10)}
                      onDayPress={(day) => {
                        setForm((current) => ({ ...current, resign_date: day.dateString }));
                        setCalendarVisible(false);
                      }}
                      markedDates={{
                        [form.resign_date]: {
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
                    <Text className="font-inter-medium text-xs text-text-muted mt-3 text-center">
                      Terpilih: {formatIndonesianDate(form.resign_date)}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

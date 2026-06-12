import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/ui/Button';
import { GlassCard } from '../src/components/ui/GlassCard';
import { Input } from '../src/components/ui/Input';
import { SkeletonCard } from '../src/components/ui/Skeleton';
import { StatusBadge } from '../src/components/ui/StatusBadge';
import { Tokens } from '../src/core/theme/tokens';
import { resignService } from '../src/services/resign.service';
import { useAuthStore } from '../src/stores/auth.store';
import { CreateResignRequest } from '../src/types/resign';

export default function ResignScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<CreateResignRequest>({
    resign_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10),
    reason: '',
    handover_notes: '',
  });

  // 1. Fetch My Requests
  const { data: history = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['resign-history', user?.id],
    queryFn: () => resignService.getMyRequests(),
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
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
        resign_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10),
        reason: '',
        handover_notes: '',
      });
      Alert.alert('Success', 'Resignation request submitted');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to submit request');
    }
  });

  const onRefresh = () => {
    refetch();
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
            Pengajuan pengunduran diri membutuhkan waktu proses minimal 30 hari (One Month Notice) sesuai kebijakan perusahaan.
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
            <Button title="Ajukan Resign Baru" onPress={() => setModalVisible(true)} style={{ marginTop: 16 }} />
          </GlassCard>
        ) : (
          <View className="gap-4">
            {history.map((item) => (
              <GlassCard key={item.id} style={{ padding: 16 }}>
                <View className="flex-row justify-between items-start mb-3">
                  <View>
                    <Text className="font-inter-bold text-base text-black">Resign Request</Text>
                    <Text className="font-inter-medium text-xs text-text-muted mt-1">Effective: {item.resign_date}</Text>
                  </View>
                  <StatusBadge label={item.status} type={getStatusType(item.status) as any} />
                </View>
                <View className="bg-black/5 p-3 rounded-xl">
                  <Text className="font-inter text-sm text-black leading-5">{item.reason}</Text>
                </View>
                <Text className="font-inter-medium text-[10px] text-text-muted mt-3 italic">Submitted on: {item.created_at.split('T')[0]}</Text>
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-background rounded-t-[32px] p-6 max-h-[85%] shadow-2xl">
            <View className="flex-row justify-between items-start mb-6">
              <View>
                <Text className="font-manrope-extrabold text-2xl text-primary">Submit Resign</Text>
                <Text className="font-inter-medium text-xs text-text-muted mt-0.5">Please provide your reasons</Text>
              </View>
              <Pressable className="w-9 h-9 rounded-full bg-black/5 items-center justify-center" onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={20} color={Tokens.colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Effective Date"
                value={form.resign_date}
                onChangeText={(text) => setForm({ ...form, resign_date: text })}
                placeholder="YYYY-MM-DD"
              />

              <Input
                label="Reason for Resignation"
                value={form.reason}
                onChangeText={(text) => setForm({ ...form, reason: text })}
                placeholder="Why are you leaving?"
                multiline
                numberOfLines={3}
                style={{ height: 100, textAlignVertical: 'top', paddingTop: 12 }}
              />

              <Input
                label="Handover Notes (Optional)"
                value={form.handover_notes || ''}
                onChangeText={(text) => setForm({ ...form, handover_notes: text })}
                placeholder="Brief notes on your responsibilities"
                multiline
                numberOfLines={2}
                style={{ height: 80, textAlignVertical: 'top', paddingTop: 12 }}
              />

              <View className="bg-error/5 p-4 rounded-xl mb-6">
                <Text className="font-inter-medium text-xs text-error text-center">
                  This action is permanent once approved by HR.
                </Text>
              </View>

              <Button
                title="Confirm Submission"
                onPress={() => {
                  if (!form.reason || !form.resign_date) {
                    Alert.alert('Error', 'Please fill in the date and reason');
                    return;
                  }
                  submitMutation.mutate(form);
                }}
                loading={submitMutation.isPending}
                className="bg-error h-14 rounded-2xl"
              />
              <View className="h-10" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

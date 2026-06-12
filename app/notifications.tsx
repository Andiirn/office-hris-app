import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Modal, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '../src/components/ui/GlassCard';
import { SkeletonCard } from '../src/components/ui/Skeleton';
import { qk } from '../src/core/query/query-keys';
import { Tokens } from '../src/core/theme/tokens';
import { notificationService } from '../src/services/notification.service';
import { useAuthStore } from '../src/stores/auth.store';
import {
  markAllNotificationsAsReadInPages,
  markNotificationAsReadInPages,
} from '../src/features/notifications/notification-cache';

import type { NotificationItem } from '../src/types/notification';

function getIcon(type: string) {
  if (type === 'LEAVE') return 'event-busy';
  if (type === 'ATTENDANCE') return 'fingerprint';
  if (type === 'OVERTIME') return 'work-history';
  if (type === 'RESIGN') return 'exit-to-app';
  return 'notifications';
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedNotification, setSelectedNotification] = React.useState<NotificationItem | null>(null);
  const pageSize = 20;

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: qk.notifications(user?.id),
    queryFn: ({ pageParam = 1 }) => notificationService.getNotifications({ page: pageParam, limit: pageSize }),
    enabled: !!user?.id,
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length < pageSize ? undefined : Number(lastPageParam) + 1,
    staleTime: 30 * 1000,
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: qk.notifications(user?.id) });
      const previous = queryClient.getQueryData<InfiniteData<NotificationItem[]>>(qk.notifications(user?.id));

      queryClient.setQueryData<InfiniteData<NotificationItem[]>>(qk.notifications(user?.id), (current) =>
        markNotificationAsReadInPages(current as any, id) as InfiniteData<NotificationItem[]> | undefined,
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(qk.notifications(user?.id), context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.notifications(user?.id) });
    },
  });

  const readAllMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: qk.notifications(user?.id) });
      const previous = queryClient.getQueryData<InfiniteData<NotificationItem[]>>(qk.notifications(user?.id));

      queryClient.setQueryData<InfiniteData<NotificationItem[]>>(qk.notifications(user?.id), (current) =>
        markAllNotificationsAsReadInPages(current as any) as InfiniteData<NotificationItem[]> | undefined,
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(qk.notifications(user?.id), context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.notifications(user?.id) });
    },
  });

  const onRefresh = () => refetch();

  const notifications = React.useMemo(() => data?.pages.flat() ?? [], [data]);

  const openNotification = (item: NotificationItem) => {
    setSelectedNotification(item);
    if (!item.is_read) {
      readMutation.mutate(item.id);
    }
  };

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary/10" />

      <View className="px-5 pt-2 pb-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-row items-start gap-3 flex-1">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm active:opacity-60 mt-0.5"
              accessibilityRole="button"
              accessibilityLabel="Kembali"
            >
              <MaterialIcons name="arrow-back" size={22} color={Tokens.colors.primary} />
            </Pressable>
            <View className="flex-1">
              <Text className="font-manrope-extrabold text-3xl text-primary">Notifikasi</Text>
              <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Pemberitahuan terbaru di satu tempat</Text>
            </View>
          </View>
          <Pressable
            className="bg-white/80 p-2.5 rounded-xl border border-white/90"
            onPress={() => {
              if (notifications.some((n: NotificationItem) => !n.is_read)) {
                readAllMutation.mutate();
              }
            }}
          >
            <MaterialIcons name="done-all" size={20} color={Tokens.colors.primary} />
          </Pressable>
        </View>
      </View>

      <FlatList
        className="flex-1"
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => openNotification(item)} style={{ marginBottom: 12 }}>
            <GlassCard
              style={{
                paddingVertical: 14,
                paddingHorizontal: 14,
                borderLeftWidth: item.is_read ? 0 : 4,
                borderLeftColor: Tokens.colors.primary,
                opacity: item.is_read ? 0.82 : 1,
              }}
            >
              <View className="flex-row items-center gap-3">
                <View className={`w-10 h-10 rounded-full items-center justify-center ${item.is_read ? 'bg-black/5' : 'bg-primary/10'}`}>
                  <MaterialIcons
                    name={getIcon(item.type) as any}
                    size={20}
                    color={item.is_read ? Tokens.colors.textMuted : Tokens.colors.primary}
                  />
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className={`font-inter-bold text-[13px] flex-1 ${item.is_read ? 'text-text-muted' : 'text-on-surface'}`} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text className="font-inter-medium text-[10px] text-text-muted">
                      {item.created_at?.split('T')?.[0] || '-'}
                    </Text>
                  </View>
                  <Text
                    className={`font-inter text-xs mt-1 leading-4 ${item.is_read ? 'text-text-muted' : 'text-on-surface-variant'}`}
                    numberOfLines={1}
                  >
                    {item.message}
                  </Text>
                </View>

                <MaterialIcons name="chevron-right" size={20} color={Tokens.colors.outline} />
              </View>
            </GlassCard>
          </Pressable>
        )}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching && !isFetchingNextPage} onRefresh={onRefresh} tintColor={Tokens.colors.primary} />}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.2}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="mt-2">
              <SkeletonCard />
            </View>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <View className="mt-2">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : (
            <View className="items-center py-20">
              <MaterialIcons name="notifications-none" size={64} color={Tokens.colors.outline} />
              <Text className="font-manrope-bold text-lg text-primary mt-4">All caught up!</Text>
              <Text className="font-inter text-sm text-text-muted text-center mt-2">No notifications yet.</Text>
            </View>
          )
        }
      />

      <Modal
        visible={!!selectedNotification}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedNotification(null)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <Pressable className="flex-1" onPress={() => setSelectedNotification(null)} />
          <View className="bg-background rounded-t-[28px] px-5 pt-3 pb-8 border-t border-white/70">
            <View className="items-center mb-4">
              <View className="w-12 h-1.5 rounded-full bg-black/10 mb-4" />
              <View className="self-stretch flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <Text className="font-manrope-extrabold text-2xl text-primary" numberOfLines={2}>
                    {selectedNotification?.title || 'Detail notifikasi'}
                  </Text>
                  <Text className="font-inter text-[12px] text-text-muted mt-1">
                    {selectedNotification?.created_at?.split('T')?.[0] || '-'}
                  </Text>
                </View>
                <Pressable
                  className="w-9 h-9 rounded-full bg-black/5 items-center justify-center"
                  onPress={() => setSelectedNotification(null)}
                >
                  <MaterialIcons name="close" size={20} color={Tokens.colors.onSurface} />
                </Pressable>
              </View>
            </View>

            <GlassCard style={{ padding: 16 }}>
              <View className="flex-row items-start gap-3">
                <View className="w-11 h-11 rounded-2xl items-center justify-center bg-primary/10">
                  <MaterialIcons
                    name={getIcon(selectedNotification?.type || '') as any}
                    size={22}
                    color={Tokens.colors.primary}
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-inter-bold text-[13px] text-on-surface">Isi notifikasi</Text>
                  <Text className="font-inter text-[13px] text-on-surface-variant mt-2 leading-5">
                    {selectedNotification?.message || '-'}
                  </Text>
                </View>
              </View>
            </GlassCard>

            <Pressable
              className="mt-4 bg-primary rounded-2xl py-3.5 items-center"
              onPress={() => setSelectedNotification(null)}
            >
              <Text className="font-inter-bold text-sm text-white">Tutup</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

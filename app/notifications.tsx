import React from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tokens } from '../src/core/theme/tokens';
import { useAuthStore } from '../src/stores/auth.store';
import { notificationService } from '../src/services/notification.service';
import { GlassCard } from '../src/components/ui/GlassCard';
import { SkeletonCard } from '../src/components/ui/Skeleton';

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // 1. Fetch Notifications
  const { data: notifications = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => notificationService.getNotifications({ limit: 50 }),
    enabled: !!user?.id,
  });

  // 2. Mark as Read Mutation
  const readMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // 3. Mark All as Read Mutation
  const readAllMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      Alert.alert('Success', 'All notifications marked as read');
    }
  });

  const onRefresh = () => {
    refetch();
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Background Decor */}
      <View className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary/10" />

      <View className="flex-row justify-between items-center px-5 pt-2 pb-5 z-10">
        <View>
          <Text className="font-manrope-extrabold text-3xl text-primary">Notifications</Text>
          <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Stay updated</Text>
        </View>
        <Pressable 
          className="bg-white/80 p-2 rounded-xl border border-white/90"
          onPress={() => {
            if (notifications.some(n => !n.is_read)) {
              readAllMutation.mutate();
            }
          }}
        >
          <MaterialIcons name="done-all" size={20} color={Tokens.colors.primary} />
        </Pressable>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={Tokens.colors.primary} />
        }
      >
        {isLoading ? (
          <View className="mt-2">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : notifications.length === 0 ? (
          <View className="items-center py-20">
            <MaterialIcons name="notifications-none" size={64} color={Tokens.colors.outline} />
            <Text className="font-manrope-bold text-lg text-primary mt-4">All caught up!</Text>
            <Text className="font-inter text-sm text-text-muted text-center mt-2">
              No notifications yet.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {notifications.map((item) => (
              <Pressable 
                key={item.id} 
                onPress={() => !item.is_read && readMutation.mutate(item.id)}
              >
                <GlassCard 
                  style={{ 
                    padding: 16, 
                    borderLeftWidth: item.is_read ? 0 : 4, 
                    borderLeftColor: Tokens.colors.primary,
                    opacity: item.is_read ? 0.7 : 1
                  }}
                >
                  <View className="flex-row items-start">
                    <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${item.is_read ? 'bg-black/5' : 'bg-primary/10'}`}>
                      <MaterialIcons 
                        name={item.type === 'LEAVE' ? 'event-busy' : item.type === 'ATTENDANCE' ? 'fingerprint' : 'notifications'} 
                        size={20} 
                        color={item.is_read ? Tokens.colors.textMuted : Tokens.colors.primary} 
                      />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row justify-between items-center">
                        <Text className={`font-inter-bold text-[13px] ${item.is_read ? 'text-text-muted' : 'text-black'}`}>{item.title}</Text>
                        <Text className="font-inter-medium text-[10px] text-text-muted">{item.created_at.split('T')[0]}</Text>
                      </View>
                      <Text className={`font-inter text-xs mt-1 leading-4 ${item.is_read ? 'text-text-muted' : 'text-black/80'}`} numberOfLines={2}>
                        {item.message}
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { Tokens } from '../src/core/theme/tokens';
import { useAuthStore } from '../src/stores/auth.store';
import { attendanceService } from '../src/services/attendance.service';
import { GlassCard } from '../src/components/ui/GlassCard';
import { StatusBadge } from '../src/components/ui/StatusBadge';

export default function AttendanceHistoryScreen() {
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);

  // 1. Fetch History
  const { data: history = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['attendance-history-full', user?.id, page],
    queryFn: () => attendanceService.getAttendanceHistory({ 
      employee_id: user?.id, 
      limit: 50,
      page: page
    }),
    enabled: !!user?.id,
  });

  const onRefresh = () => {
    refetch();
  };

  const formatTime = (time?: string | null) => {
    if (!time) return '--:--';
    const timeOnly = time.includes(' ') ? time.split(' ')[1] : (time.includes('T') ? time.split('T')[1] : time);
    return timeOnly.substring(0, 5);
  };

  const getStatusType = (status?: string) => {
    switch (status) {
      case 'PRESENT': return 'secondary';
      case 'LATE': return 'error';
      case 'ABSENT': return 'error';
      default: return 'secondary';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Decorative Background Elements */}
      <View className="absolute top-20 -right-20 w-64 h-64 rounded-full bg-primary/10" />
      <View className="absolute bottom-10 -left-20 w-72 h-72 rounded-full bg-secondary-container/15" />

      <View className="px-5 pt-2 pb-5 z-10">
        <Text className="font-manrope-extrabold text-3xl text-primary">Attendance</Text>
        <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Your check-in history</Text>
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
          <ActivityIndicator size="large" color={Tokens.colors.primary} className="mt-20" />
        ) : history.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', padding: 40, marginTop: 20 }}>
            <MaterialIcons name="event-busy" size={64} color={Tokens.colors.outline} />
            <Text className="font-manrope-bold text-lg text-primary mt-4">No records found</Text>
            <Text className="font-inter text-sm text-text-muted text-center mt-2">
              You haven't recorded any attendance yet.
            </Text>
          </GlassCard>
        ) : (
          <View className="gap-3">
            {history.map((item) => (
              <GlassCard key={item.id} style={{ padding: 16 }}>
                <View className="flex-row justify-between items-center mb-4">
                  <View className="flex-row items-center gap-2">
                    <MaterialIcons name="calendar-today" size={16} color={Tokens.colors.primary} />
                    <Text className="font-inter-bold text-base text-black">{item.date}</Text>
                  </View>
                  <StatusBadge label={item.status || 'PRESENT'} type={getStatusType(item.status) as any} />
                </View>

                <View className="flex-row justify-between bg-black/5 p-3 rounded-xl">
                  <View className="items-center flex-1">
                    <Text className="font-inter-semibold text-[10px] text-text-muted uppercase mb-1">Check In</Text>
                    <Text className="font-manrope-extrabold text-lg text-primary">{formatTime(item.checkin_time)}</Text>
                  </View>
                  <View className="w-[1px] bg-black/10 mx-2" />
                  <View className="items-center flex-1">
                    <Text className="font-inter-semibold text-[10px] text-text-muted uppercase mb-1">Check Out</Text>
                    <Text className="font-manrope-extrabold text-lg text-primary">{formatTime(item.checkout_time)}</Text>
                  </View>
                </View>
                
                {(item as any).branch_name && (
                  <View className="flex-row items-center mt-3 gap-1.5 ml-1">
                    <MaterialIcons name="location-on" size={12} color={Tokens.colors.textMuted} />
                    <Text className="font-inter-medium text-xs text-text-muted">{(item as any).branch_name}</Text>
                  </View>
                )}
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

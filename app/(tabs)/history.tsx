import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { Tokens } from '../../src/core/theme/tokens';
import { useAuthStore } from '../../src/stores/auth.store';
import { attendanceService } from '../../src/services/attendance.service';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { SkeletonCard } from '../../src/components/ui/Skeleton';
import { StatusBadge } from '../../src/components/ui/StatusBadge';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const formatDateLabel = (date: Date) => {
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

function getPeriodDates(offset = 0) {
  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)
  const day = today.getDate();

  // If today is <= 25, the current period ends on the 25th of the current month.
  // If today is >= 26, the current period ends on the 25th of the next month.
  let anchorMonth = day >= 26 ? month + 1 : month;
  anchorMonth += offset;

  const startDate = new Date(year, anchorMonth - 1, 26);
  const endDate = new Date(year, anchorMonth, 25);

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateFrom = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`;
  const dateTo = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;

  return {
    dateFrom,
    dateTo,
    startDate,
    endDate
  };
}

function toDateString(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default function AttendanceHistoryScreen() {
  const { user } = useAuthStore();
  const [periodOffset, setPeriodOffset] = useState(0);

  const period = React.useMemo(() => getPeriodDates(periodOffset), [periodOffset]);
  const queryEndDate = React.useMemo(() => {
    const today = new Date();
    return period.endDate > today ? toDateString(today) : period.dateTo;
  }, [period]);

  // 1. Fetch History
  const { data: history = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['attendance-history-full', user?.id, period.dateFrom, queryEndDate],
    queryFn: () => attendanceService.getAttendanceHistory({ 
      employee_id: user?.id, 
      date_from: period.dateFrom,
      date_to: queryEndDate,
      limit: 100,
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

  const getAttendanceDate = (item: any) => item.attendance_date || item.date || '-';
  const getCheckinTime = (item: any) => item.checkin_at || item.checkin_time;
  const getCheckoutTime = (item: any) => item.checkout_at || item.checkout_time;
  const getAttendanceStatus = (item: any) => item.attendance_status || item.status || 'PRESENT';

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Decorative Background Elements */}
      <View className="absolute top-20 -right-20 w-64 h-64 rounded-full bg-primary/10" />
      <View className="absolute bottom-10 -left-20 w-72 h-72 rounded-full bg-secondary-container/15" />

      <View className="px-5 pt-2 pb-3 z-10">
        <Text className="font-manrope-extrabold text-3xl text-primary">Attendance</Text>
        <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Your check-in history</Text>
      </View>

      <View className="px-5 pb-4 flex-row justify-between items-center z-10">
        <Pressable 
          onPress={() => setPeriodOffset(prev => prev - 1)}
          className="w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm active:opacity-60"
        >
          <MaterialIcons name="chevron-left" size={24} color={Tokens.colors.primary} />
        </Pressable>
        
        <View className="bg-white/80 border border-white/90 px-4 py-2 rounded-2xl items-center justify-center flex-1 mx-3 shadow-sm">
          <Text className="font-inter-bold text-[13px] text-primary">
            {formatDateLabel(period.startDate)} - {formatDateLabel(period.endDate)}
          </Text>
          <Text className="font-inter text-[9px] text-text-muted mt-0.5 uppercase tracking-wider">
            Periode Gaji & Absensi
          </Text>
        </View>

        <Pressable 
          onPress={() => {
            if (periodOffset < 0) {
              setPeriodOffset(prev => prev + 1);
            }
          }}
          disabled={periodOffset >= 0}
          className={`w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm ${
            periodOffset >= 0 ? 'opacity-30' : 'active:opacity-60'
          }`}
        >
          <MaterialIcons name="chevron-right" size={24} color={Tokens.colors.primary} />
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
        ) : history.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', padding: 40, marginTop: 20 }}>
            <MaterialIcons name="event-busy" size={64} color={Tokens.colors.outline} />
            <Text className="font-manrope-bold text-lg text-primary mt-4">No records found</Text>
            <Text className="font-inter text-sm text-text-muted text-center mt-2">
              {"You haven't recorded any attendance for this period."}
            </Text>
          </GlassCard>
        ) : (
          <View className="gap-3">
            {history.map((item) => (
              <GlassCard key={item.id} style={{ padding: 16 }}>
                <View className="flex-row justify-between items-center mb-4">
                  <View className="flex-row items-center gap-2">
                    <MaterialIcons name="calendar-today" size={16} color={Tokens.colors.primary} />
                    <Text className="font-inter-bold text-base text-black">{getAttendanceDate(item)}</Text>
                  </View>
                  <StatusBadge label={getAttendanceStatus(item)} type={getStatusType(getAttendanceStatus(item)) as any} />
                </View>

                <View className="flex-row justify-between bg-black/5 p-3 rounded-xl">
                  <View className="items-center flex-1">
                    <Text className="font-inter-semibold text-[10px] text-text-muted uppercase mb-1">Check In</Text>
                    <Text className="font-manrope-extrabold text-lg text-primary">{formatTime(getCheckinTime(item))}</Text>
                  </View>
                  <View className="w-[1px] bg-black/10 mx-2" />
                  <View className="items-center flex-1">
                    <Text className="font-inter-semibold text-[10px] text-text-muted uppercase mb-1">Check Out</Text>
                    <Text className="font-manrope-extrabold text-lg text-primary">{formatTime(getCheckoutTime(item))}</Text>
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

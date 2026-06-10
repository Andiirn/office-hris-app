import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { SkeletonCard } from '../../src/components/ui/Skeleton';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { Tokens } from '../../src/core/theme/tokens';
import { attendanceService } from '../../src/services/attendance.service';
import { useAuthStore } from '../../src/stores/auth.store';

function formatTime(time?: string | null) {
  if (!time) return '--:--';
  const parsed = new Date(time);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }
  if (time.includes('T')) return time.split('T')[1].slice(0, 5);
  if (time.includes(' ')) return time.split(' ')[1].slice(0, 5);
  return time.slice(0, 5);
}

function getAttendanceDate(item: any) {
  return item.attendance_date || item.date || '-';
}

function getAttendanceStatus(item: any) {
  const status = item.attendance_status || item.status || 'PRESENT';
  const s = status.toUpperCase();
  if (s === 'PRESENT') return 'HADIR';
  if (s === 'LATE') return 'TERLAMBAT';
  if (s === 'ABSENT') return 'TIDAK HADIR';
  return status;
}

function getCheckIn(item: any) {
  return item.checkin_at || item.checkin_time;
}

function getCheckOut(item: any) {
  return item.checkout_at || item.checkout_time;
}

function getAttendanceKey(item: any) {
  return item.attendance_date || item.date || null;
}



function getPeriodDates(offset = 0) {
  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth();
  const day = today.getDate();
  let anchorMonth = day >= 26 ? month + 1 : month;
  anchorMonth += offset;
  const startDate = new Date(year, anchorMonth - 1, 26);
  const endDate = new Date(year, anchorMonth, 25);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateFrom = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`;
  const dateTo = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;
  const todayString = today.toISOString().slice(0, 10);
  return { startDate, endDate, dateFrom, dateTo: endDate > today ? todayString : dateTo };
}



export default function AttendanceScreen() {
  const { user } = useAuthStore();
  const [periodOffset, setPeriodOffset] = useState(0);

  const period = useMemo(() => getPeriodDates(periodOffset), [periodOffset]);

  const { data: history = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['attendance-history-full', user?.id, period.dateFrom, period.dateTo],
    queryFn: () => attendanceService.getAttendanceHistory({
      employee_id: user?.id,
      date_from: period.dateFrom,
      date_to: period.dateTo,
      limit: 100,
    }),
    enabled: !!user?.id,
  });

  const attendanceCount = useMemo(() => {
    const uniqueDates = new Set<string>();
    history.forEach((item: any) => {
      const key = getAttendanceKey(item);
      const hasAttendance = !!(getCheckIn(item) || getCheckOut(item) || item.attendance_status || item.status);
      if (key && hasAttendance) uniqueDates.add(key);
    });
    return uniqueDates.size;
  }, [history]);

  const onRefresh = () => {
    refetch();
  };

  const getStatusType = (status?: string) => {
    switch (status) {
      case 'HADIR': return 'secondary';
      case 'TERLAMBAT': return 'error';
      case 'TIDAK HADIR': return 'error';
      default: return 'secondary';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute top-20 -right-20 w-64 h-64 rounded-full bg-primary/10" />
      <View className="absolute bottom-10 -left-20 w-72 h-72 rounded-full bg-secondary-container/15" />

      <View className="px-5 pt-2 pb-3 z-10">
        <Text className="font-manrope-extrabold text-3xl text-primary">Absensi</Text>
        <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Detail riwayat kehadiran anda</Text>
      </View>

      <View className="px-5 pb-4">
        <GlassCard style={{ padding: 16 }}>
          <Text className="font-inter-bold text-base text-on-surface leading-6">
            Anda telah melakukan{' '}
            <Text className="font-manrope-extrabold text-base text-primary">{attendanceCount}</Text>{' '}
            kehadiran di periode ini
          </Text>
        </GlassCard>
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
            {period.dateFrom} - {period.dateTo}
          </Text>
          <Text className="font-inter text-[9px] text-text-muted mt-0.5 uppercase tracking-wider">
            Periode Gaji & Absensi
          </Text>
        </View>

        <Pressable
          onPress={() => {
            if (periodOffset < 0) setPeriodOffset(prev => prev + 1);
          }}
          disabled={periodOffset >= 0}
          className={`w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm ${periodOffset >= 0 ? 'opacity-30' : 'active:opacity-60'}`}
        >
          <MaterialIcons name="chevron-right" size={24} color={Tokens.colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={Tokens.colors.primary} />}
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
                    <Text className="font-manrope-extrabold text-lg text-primary">{formatTime(getCheckIn(item))}</Text>
                  </View>
                  <View className="w-[1px] bg-black/10 mx-2" />
                  <View className="items-center flex-1">
                    <Text className="font-inter-semibold text-[10px] text-text-muted uppercase mb-1">Check Out</Text>
                    <Text className="font-manrope-extrabold text-lg text-primary">{formatTime(getCheckOut(item))}</Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>


    </SafeAreaView>
  );
}

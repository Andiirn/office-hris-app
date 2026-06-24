import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { SkeletonCard } from '../../src/components/ui/Skeleton';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { Tokens } from '../../src/core/theme/tokens';
import { attendanceService } from '../../src/services/attendance.service';
import { useAuthStore } from '../../src/stores/auth.store';
import { getAttendanceBadgeProps } from '../../src/utils/status';

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
  if (s === 'SICK') return 'SAKIT';
  if (s === 'PERMISSION' || s === 'IZIN') return 'IZIN';
  if (s === 'ABSENT') return 'TIDAK HADIR';
  return status;
}

function getCheckIn(item: any) {
  return item.checkin_at || item.checkin_time;
}

function getCheckOut(item: any) {
  return item.checkout_at || item.checkout_time;
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
  return { startDate, endDate, dateFrom, dateTo };
}



export default function AttendanceScreen() {
  const router = useRouter();
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

  const { data: periodAttendance = [], isLoading: isLoadingPeriodAttendance } = useQuery({
    queryKey: ['attendance-period', user?.id],
    queryFn: () => user?.id ? attendanceService.getEmployeeAttendancePeriod(user.id) : [],
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const periodSummary = useMemo(() => {
    return periodAttendance.reduce(
      (acc: { present: number; late: number; sick: number; permission: number; absent: number }, item: any) => {
        const status = String(item?.attendance_status || item?.status || '').toUpperCase();
        if (['PRESENT', 'EARLY_CHECKOUT'].includes(status)) acc.present += 1;
        else if (status === 'LATE') acc.late += 1;
        else if (['SICK', 'SICK_WITH_DOC', 'SICK_NO_DOC'].includes(status)) acc.sick += 1;
        else if (['PERMISSION', 'LEAVE', 'SPECIAL_LEAVE'].includes(status)) acc.permission += 1;
        else if (status === 'ABSENT') acc.absent += 1;
        return acc;
      },
      { present: 0, late: 0, sick: 0, permission: 0, absent: 0 },
    );
  }, [periodAttendance]);

  const attendanceCount = periodSummary.present + periodSummary.late + periodSummary.sick + periodSummary.permission;

  const attendanceSummary = periodSummary;
  const sortedPeriodAttendance = useMemo(() => {
    return [...periodAttendance].sort((a: any, b: any) => {
      const dateA = Date.parse(a.attendance_date || a.date || a.created_at || '');
      const dateB = Date.parse(b.attendance_date || b.date || b.created_at || '');
      return (Number.isFinite(dateB) ? dateB : 0) - (Number.isFinite(dateA) ? dateA : 0);
    });
  }, [periodAttendance]);

  const onRefresh = () => {
    refetch();
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute top-20 -right-20 w-64 h-64 rounded-full bg-primary/10" />
      <View className="absolute bottom-10 -left-20 w-72 h-72 rounded-full bg-secondary-container/15" />

      <View className="px-5 pt-2 pb-4 z-10">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm active:opacity-60"
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <MaterialIcons name="arrow-back" size={22} color={Tokens.colors.primary} />
          </Pressable>
          <View className="flex-1">
            <Text className="font-manrope-extrabold text-3xl text-primary">Absensi</Text>
            <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Ringkasan periode {period.dateFrom} - {period.dateTo}</Text>
          </View>
        </View>
      </View>

      <View className="px-5 pb-4">
        <GlassCard style={{ padding: 18 }}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="font-inter-bold text-xs text-text-muted uppercase tracking-wider mb-1">
                Hari Tercatat
              </Text>
              <Text className="font-manrope-extrabold text-3xl text-primary leading-9">
                {attendanceCount}
              </Text>
              <Text className="font-inter text-sm text-on-surface leading-6 mt-2">
                Hadir, terlambat, dan sakit/izin yang sudah disetujui dihitung sebagai hari tercatat.
              </Text>
            </View>
            <View className="w-14 h-14 rounded-2xl bg-primary/10 items-center justify-center">
              <MaterialIcons name="event-available" size={28} color={Tokens.colors.primary} />
            </View>
          </View>
          <View className="flex-row flex-wrap gap-2 mt-4">
            <View className="px-3 py-1.5 rounded-full bg-secondary-container/60">
              <Text className="font-inter-bold text-[11px] text-secondary">Hadir {attendanceSummary.present}</Text>
            </View>
            <View className="px-3 py-1.5 rounded-full bg-error/10">
              <Text className="font-inter-bold text-[11px] text-error">Terlambat {attendanceSummary.late}</Text>
            </View>
            <View className="px-3 py-1.5 rounded-full bg-primary/10">
              <Text className="font-inter-bold text-[11px] text-primary">Sakit {attendanceSummary.sick}</Text>
            </View>
            <View className="px-3 py-1.5 rounded-full bg-black/5">
              <Text className="font-inter-bold text-[11px] text-text-muted">Izin {attendanceSummary.permission}</Text>
            </View>
          </View>
        </GlassCard>
      </View>

      <View className="px-5 pb-4">
        <View className="flex-row justify-between items-center z-10">
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
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={Tokens.colors.primary} />}
      >
        {isLoadingPeriodAttendance || isLoading ? (
          <View className="mt-2">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : sortedPeriodAttendance.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', padding: 40, marginTop: 20 }}>
            <View className="w-16 h-16 rounded-2xl bg-primary/10 items-center justify-center">
              <MaterialIcons name="event-busy" size={34} color={Tokens.colors.primary} />
            </View>
            <Text className="font-manrope-bold text-lg text-primary mt-4">Belum Ada Kehadiran</Text>
            <Text className="font-inter text-sm text-text-muted text-center mt-2">
              Tidak ada check-in atau check-out pada periode ini.
            </Text>
          </GlassCard>
        ) : (
          <View className="gap-3">
            {sortedPeriodAttendance.map((item) => (
              <GlassCard key={item.id} style={{ padding: 16 }}>
                <View className="flex-row justify-between items-start mb-4">
                  <View className="flex-1 mr-3">
                    <Text className="font-inter-bold text-[10px] text-text-muted uppercase tracking-wider mb-1">
                      Riwayat Kehadiran
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <View className="w-8 h-8 rounded-2xl bg-primary/10 items-center justify-center">
                        <MaterialIcons name="calendar-today" size={14} color={Tokens.colors.primary} />
                      </View>
                      <Text className="font-inter-bold text-base text-black">{getAttendanceDate(item)}</Text>
                    </View>
                  </View>
                  <StatusBadge
                    label={getAttendanceBadgeProps(item.attendance_status || item.status).label}
                    type={getAttendanceBadgeProps(item.attendance_status || item.status).type}
                  />
                </View>

                {(getCheckIn(item) || getCheckOut(item) || ['PRESENT', 'LATE', 'EARLY_CHECKOUT'].includes(String(item.attendance_status || item.status || 'PRESENT').toUpperCase())) && (
                  <View className="flex-row justify-between bg-black/5 p-3 rounded-xl mt-1">
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
                )}
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>


    </SafeAreaView>
  );
}

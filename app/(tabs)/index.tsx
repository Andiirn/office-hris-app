import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tokens } from '../../src/core/theme/tokens';
import { attendanceService } from '../../src/services/attendance.service';
import { leaveService } from '../../src/services/leave.service';
import { resignService } from '../../src/services/resign.service';
import { useAuthStore } from '../../src/stores/auth.store';

export default function HomeScreen() {
  const { user, isLoggedIn } = useAuthStore();
  const name = user?.full_name || 'Employee';
  const [now, setNow] = React.useState(new Date());

  // Debugging logs to see when user object is available
  React.useEffect(() => {
    console.log('[HomeScreen] Auth State:', {
      isLoggedIn,
      hasUser: !!user,
      userId: user?.id,
      userName: user?.full_name
    });
  }, [isLoggedIn, user]);

  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeText = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateText = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  // 1. Fetch Leave Balance
  const { data: leaveBalances, isLoading: isLoadingLeave, refetch: refetchLeave } = useQuery({
    queryKey: ['leave-balances', user?.id],
    queryFn: async () => {
      console.log('[HomeQuery] Executing Leave fetch for userId:', user?.id);
      if (!user?.id) return [];
      const year = new Date().getFullYear();
      return leaveService.getBalances(user.id, year);
    },
    enabled: !!user?.id,
  });

  const totalRemaining = leaveBalances?.reduce((acc, item) => acc + (item.remaining_days ?? 0), 0) ?? '-';
  const leaveText = isLoadingLeave ? 'Sisa: ...' : `Sisa: ${totalRemaining} Hari`;

  // 2. Fetch Resign Status
  const { data: resignHistory = [], isLoading: isLoadingResign, refetch: refetchResign } = useQuery({
    queryKey: ['resign-status', user?.id],
    queryFn: () => resignService.getMyRequests({ limit: 1 }),
    enabled: !!user?.id,
  });

  const latestResign = resignHistory[0];
  const resignText = isLoadingResign ? 'Checking...' : latestResign ? `Status: ${latestResign.status}` : 'Offboarding';

  // 3. Recent Activities
  const {
    data: activities = [],
    isLoading: isLoadingActivities,
    isFetching: isFetchingActivities,
    refetch: refetchActivities
  } = useQuery({
    queryKey: ['attendance-recent', user?.id],
    queryFn: async () => {
      console.log('[HomeQuery] Executing Activity fetch for userId:', user?.id);
      if (!user?.id) return [];

      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 7);

      const query = {
        employee_id: user.id,
        date_from: dateFrom.toISOString().slice(0, 10),
        date_to: dateTo.toISOString().slice(0, 10),
        limit: 20,
        page: 1
      };
      return attendanceService.getAttendanceHistory(query);
    },
    enabled: !!user?.id,
  });

  const formatTime = (time?: string | null) => {
    if (!time) return '--:--';
    // Handle "HH:mm:ss", "YYYY-MM-DD HH:mm:ss", or ISO "YYYY-MM-DDTHH:mm:ssZ"
    let timeOnly = time;
    if (time.includes(' ')) {
      timeOnly = time.split(' ')[1];
    } else if (time.includes('T')) {
      timeOnly = time.split('T')[1];
    }
    return timeOnly.substring(0, 5);
  };

  const onRefresh = () => {
    refetchActivities();
    refetchLeave();
    refetchResign();
  };

  // 3. Process activities into flattened events
  const events = React.useMemo(() => {
    return activities.flatMap(item => {
      const list = [];
      const checkinTime = item.checkin_at || item.checkin_time;
      const checkoutTime = item.checkout_at || item.checkout_time;
      const attendanceDate = item.attendance_date || item.date || '';

      if (checkoutTime) {
        list.push({
          id: `${item.id}-out`,
          type: 'Check Out',
          time: checkoutTime,
          date: attendanceDate,
          icon: 'logout' as const,
          color: '#93000a',
          bgColor: '#ffdad6',
          isCheckout: true
        });
      }
      if (checkinTime) {
        list.push({
          id: `${item.id}-in`,
          type: 'Check In',
          time: checkinTime,
          date: attendanceDate,
          icon: 'login' as const,
          color: '#5b675e',
          bgColor: '#d9e6da',
          isCheckout: false
        });
      }
      return list;
    }).sort((a, b) => {
      const dateA = a.time.includes('T') ? a.time : `${a.date}T${a.time}`;
      const dateB = b.time.includes('T') ? b.time : `${b.date}T${b.time}`;
      return dateB.localeCompare(dateA);
    });
  }, [activities]);

  const latestEvent = events[0];
  const isClockedIn = latestEvent && !latestEvent.isCheckout && latestEvent.date === new Date().toISOString().slice(0, 10);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, gap: 18 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetchingActivities} onRefresh={onRefresh} tintColor={Tokens.colors.primary} />
        }
      >
        <View className="bg-white/80 rounded-2xl p-3.5 flex-row justify-between items-center mt-5 border border-white/90">
          <View>
            <Text className="font-manrope-bold text-sm text-primary">{name}</Text>
            <Text className="font-inter text-[11px] text-text-muted mt-0.5">{user?.position_name || '-'}</Text>
          </View>
          <View className={`rounded-full px-2.5 py-1 ${isClockedIn ? 'bg-secondary-container' : 'bg-error-container'}`}>
            <Text className={`font-inter-bold text-[10px] ${isClockedIn ? 'text-on-secondary-container' : 'text-on-error-container'}`}>
              {isClockedIn ? 'Clocked In' : 'Clocked Out'}
            </Text>
          </View>
        </View>

        <View className="items-center pt-2">
          <Text className="font-manrope-extrabold text-5xl text-primary leading-[52px]">{timeText}</Text>
          <Text className="font-inter-medium text-base text-text-muted mt-1 mb-3.5">{dateText}</Text>
          <Pressable
            className="w-[190px] h-[190px] rounded-full bg-primary-container items-center justify-center gap-2 shadow-lg shadow-black/10 elevation-6"
            onPress={() => router.push('/attendance-scan')}
          >
            <MaterialIcons name="qr-code-scanner" size={44} color="#fff" />
            <Text className="font-inter-bold text-sm text-white">Scan QR Code</Text>
          </Pressable>
        </View>

        <View className="flex-row flex-wrap justify-between mt-[18px]">
          {[
            { icon: 'event-available', title: 'Izin & Cuti', subtitle: leaveText, onPress: () => router.push('/leave') },
            { icon: 'work-history', title: 'Lembur', subtitle: 'Request Extra', onPress: () => router.push('/overtime') },
            { icon: 'payments', title: 'Slip Gaji', subtitle: 'Preview bulanan', onPress: () => router.push('/payroll') },
            { icon: 'event', title: 'Absensi', subtitle: 'History & koreksi', onPress: () => router.push('/attendance') },
            { icon: 'exit-to-app', title: 'Resign', subtitle: resignText, onPress: () => router.push('/resign') },
          ].map((item) => (
            <Pressable
              key={item.title}
              className="w-[48%] bg-white/80 rounded-2xl p-4 border border-white/90 mb-3"
              onPress={item.onPress}
            >
              <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mb-2.5">
                <MaterialIcons name={item.icon as any} size={20} color={Tokens.colors.primary} />
              </View>
              <Text className="font-inter-bold text-[12px] text-on-surface">{item.title}</Text>
              <Text className="font-inter text-[10px] text-text-muted mt-1" numberOfLines={1}>{item.subtitle}</Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-1">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="font-manrope-bold text-base text-primary">Recent Activity</Text>
            <Pressable onPress={() => router.push('/notifications')}>
              <Text className="font-inter-semibold text-[12px] text-primary-container">View All</Text>
            </Pressable>
          </View>

          {isLoadingActivities ? (
            <ActivityIndicator size="small" color={Tokens.colors.primary} className="mt-5" />
          ) : events.length === 0 ? (
            <View className="items-center py-5">
              <Text className="font-inter text-[13px] text-text-muted">No recent activities</Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {events.slice(0, 5).map((item) => (
                <View key={item.id} className="flex-row items-center bg-white/80 rounded-xl p-3 border border-white/90">
                  <View
                    className="w-9 h-9 rounded-lg items-center justify-center mr-3"
                    style={{ backgroundColor: item.bgColor }}
                  >
                    <MaterialIcons name={item.icon} size={18} color={item.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-inter-bold text-[13px] text-on-surface">{item.type}</Text>
                    <Text className="font-inter text-[11px] text-text-muted mt-0.5">{item.date}</Text>
                  </View>
                  <View className="bg-primary/5 px-2 py-1 rounded-md">
                    <Text className="font-manrope-bold text-[12px] text-primary">
                      {formatTime(item.time)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

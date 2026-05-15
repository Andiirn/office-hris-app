import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Calendar } from 'react-native-calendars';
import { useQuery } from '@tanstack/react-query';
import { Tokens } from '../../src/core/theme/tokens';
import { useAuthStore } from '../../src/stores/auth.store';
import { attendanceService } from '../../src/services/attendance.service';
import { leaveService } from '../../src/services/leave.service';
import { GlassCard } from '../../src/components/ui/GlassCard';

export default function CalendarScreen() {
  const { user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // 1. Fetch Attendance History
  const { data: attendance = [], isLoading: isLoadingAtt, refetch: refetchAtt } = useQuery({
    queryKey: ['calendar-attendance', user?.id],
    queryFn: () => attendanceService.getAttendanceHistory({ employee_id: user?.id, limit: 100 }),
    enabled: !!user?.id,
  });

  // 2. Fetch Leave History
  const { data: leaves = [], isLoading: isLoadingLeave, refetch: refetchLeave } = useQuery({
    queryKey: ['calendar-leaves', user?.id],
    queryFn: () => leaveService.getRequests({ employee_id: user?.id, limit: 50 }),
    enabled: !!user?.id,
  });

  const onRefresh = () => {
    refetchAtt();
    refetchLeave();
  };

  const markedDates = useMemo(() => {
    const marks: any = {};
    
    // Mark Attendance
    attendance.forEach(att => {
      marks[att.date] = {
        marked: true,
        dotColor: att.status === 'LATE' ? Tokens.colors.error : '#1f6b42',
      };
    });

    // Mark Leaves
    leaves.forEach(req => {
      if (req.status === 'APPROVED') {
        marks[req.start_date] = {
          ...marks[req.start_date],
          startingDay: true,
          color: 'rgba(31, 107, 66, 0.1)',
          textColor: '#1f6b42',
        };
        if (req.end_date) {
          marks[req.end_date] = {
            ...marks[req.end_date],
            endingDay: true,
            color: 'rgba(31, 107, 66, 0.1)',
            textColor: '#1f6b42',
          };
        }
      }
    });

    // Mark Selected
    marks[selectedDate] = {
      ...marks[selectedDate],
      selected: true,
      selectedColor: Tokens.colors.primary,
    };

    return marks;
  }, [attendance, leaves, selectedDate]);

  const dailyAgenda = useMemo(() => {
    const events = [];
    
    const att = attendance.find(a => a.date === selectedDate);
    if (att) {
      events.push({
        type: 'ATTENDANCE',
        title: att.status || 'Present',
        time: `${att.checkin_time || '--:--'} - ${att.checkout_time || '--:--'}`,
        icon: 'fingerprint',
        color: att.status === 'LATE' ? '#ba1a1a' : '#1f6b42'
      });
    }

    const leave = leaves.find(l => l.start_date === selectedDate || (l.end_date && selectedDate >= l.start_date && selectedDate <= l.end_date));
    if (leave) {
      events.push({
        type: 'LEAVE',
        title: leave.leave_type_name || 'On Leave',
        time: leave.status,
        icon: 'event-busy',
        color: Tokens.colors.primary
      });
    }

    return events;
  }, [attendance, leaves, selectedDate]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-2 pb-5">
        <Text className="font-manrope-extrabold text-3xl text-primary">Calendar</Text>
        <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Your work schedule</Text>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoadingAtt || isLoadingLeave} onRefresh={onRefresh} tintColor={Tokens.colors.primary} />
        }
      >
        <GlassCard style={{ padding: 10, marginBottom: 24 }}>
          <Calendar
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'transparent',
              textSectionTitleColor: Tokens.colors.primary,
              selectedDayBackgroundColor: Tokens.colors.primary,
              selectedDayTextColor: '#ffffff',
              todayTextColor: Tokens.colors.primary,
              dayTextColor: Tokens.colors.text,
              textDisabledColor: Tokens.colors.outline,
              dotColor: Tokens.colors.primary,
              selectedDotColor: '#ffffff',
              arrowColor: Tokens.colors.primary,
              monthTextColor: Tokens.colors.primary,
              indicatorColor: Tokens.colors.primary,
              textDayFontFamily: 'Inter_500Medium',
              textMonthFontFamily: 'Manrope_700Bold',
              textDayHeaderFontFamily: 'Inter_700Bold',
              textDayFontSize: 12,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 12
            }}
            markedDates={markedDates}
            onDayPress={(day) => setSelectedDate(day.dateString)}
          />
        </GlassCard>

        <Text className="font-manrope-bold text-lg text-primary mb-4">Agenda: {selectedDate}</Text>

        {dailyAgenda.length === 0 ? (
          <View className="items-center py-10">
            <MaterialIcons name="event-note" size={48} color={Tokens.colors.outline} />
            <Text className="font-inter-medium text-sm text-text-muted mt-3 text-center">
              No specific events or records{"\n"}for this date.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {dailyAgenda.map((event, idx) => (
              <GlassCard key={idx} style={{ padding: 16 }}>
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full items-center justify-center mr-4" style={{ backgroundColor: `${event.color}10` }}>
                    <MaterialIcons name={event.icon as any} size={20} color={event.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-inter-bold text-base text-black">{event.title}</Text>
                    <Text className="font-inter-medium text-xs text-text-muted mt-0.5">{event.time}</Text>
                  </View>
                  <View className="bg-primary/5 px-2.5 py-1 rounded-md">
                    <Text className="font-inter-bold text-[10px] text-primary uppercase">{event.type}</Text>
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

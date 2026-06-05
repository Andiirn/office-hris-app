import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Calendar } from 'react-native-calendars';
import { useQuery } from '@tanstack/react-query';
import { Tokens } from '../../src/core/theme/tokens';
import { holidayService } from '../../src/services/holiday.service';
import { GlassCard } from '../../src/components/ui/GlassCard';

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: holidays = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['calendar-holidays'],
    queryFn: () => holidayService.getHolidays({ year: new Date().getFullYear() }),
    refetchInterval: 1000 * 60 * 5,
  });

  const onRefresh = () => {
    refetch();
  };

  const isWeekend = (dateString: string) => {
    const day = new Date(`${dateString}T00:00:00`).getDay();
    return day === 0 || day === 6;
  };

  const markedDates = useMemo(() => {
    const marks: any = {};

    holidays.forEach((holiday) => {
      marks[holiday.holiday_date] = {
        selected: true,
        selectedColor: 'rgba(186, 26, 26, 0.1)',
        textColor: Tokens.colors.error,
        marked: true,
        dotColor: Tokens.colors.error,
      };
    });

    const firstVisible = new Date(`${selectedDate.slice(0, 7)}-01T00:00:00`);
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(firstVisible);
      d.setDate(firstVisible.getDate() + i);
      const date = d.toISOString().slice(0, 10);

      if (!isWeekend(date)) continue;
      if (marks[date]?.marked || marks[date]?.startingDay || marks[date]?.selectedColor) continue;

      marks[date] = {
        ...marks[date],
        selected: false,
        marked: true,
        dotColor: Tokens.colors.outline,
        textColor: Tokens.colors.textMuted,
      };
    }

    marks[selectedDate] = {
      ...marks[selectedDate],
      selected: true,
      selectedColor: Tokens.colors.primary,
      textColor: '#ffffff',
    };

    return marks;
  }, [holidays, selectedDate]);

  const dailyAgenda = useMemo(() => {
    const events: Array<{ type: string; title: string; time: string; icon: string; color: string }> = [];
    const holiday = holidays.find((h) => h.holiday_date === selectedDate);

    if (holiday) {
      events.push({
        type: 'HOLIDAY',
        title: holiday.name,
        time: holiday.holiday_type.replace(/_/g, ' '),
        icon: 'celebration',
        color: Tokens.colors.error,
      });
    } else if (isWeekend(selectedDate)) {
      events.push({
        type: 'OFF DAY',
        title: 'Sabtu / Minggu',
        time: 'Libur',
        icon: 'event-busy',
        color: Tokens.colors.outline,
      });
    }

    return events;
  }, [holidays, selectedDate]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-2 pb-5">
        <Text className="font-manrope-extrabold text-3xl text-primary">Calendar</Text>
        <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Company holidays and off days</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching || isLoading} onRefresh={onRefresh} tintColor={Tokens.colors.primary} />
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
              textDayHeaderFontSize: 12,
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
              No holidays or off days for this date.
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

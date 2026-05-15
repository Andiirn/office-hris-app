import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/ui/Button';
import { GlassCard } from '../src/components/ui/GlassCard';
import { Input } from '../src/components/ui/Input';
import { StatusBadge } from '../src/components/ui/StatusBadge';
import { Tokens } from '../src/core/theme/tokens';
import { leaveService } from '../src/services/leave.service';
import { useAuthStore } from '../src/stores/auth.store';
import { CreateLeaveRequest } from '../src/types/leave';

const { width } = Dimensions.get('window');

export default function LeaveScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{ start?: string, end?: string }>({});
  const [form, setForm] = useState<CreateLeaveRequest>({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  // 1. Fetch Balances
  const { data: balances = [], isLoading: isLoadingBalances, refetch: refetchBalances } = useQuery({
    queryKey: ['leave-balances', user?.id],
    queryFn: () => leaveService.getBalances(user?.id || '', new Date().getFullYear()),
    enabled: !!user?.id,
  });

  const totalRemaining = useMemo(() =>
    balances.reduce((acc, curr) => acc + (curr.remaining_days || 0), 0),
    [balances]);

  // 2. Fetch History
  const { data: history = [], isLoading: isLoadingHistory, refetch: refetchHistory, isFetching: isFetchingHistory } = useQuery({
    queryKey: ['leave-history', user?.id],
    queryFn: () => leaveService.getRequests({ employee_id: user?.id, limit: 50 }),
    enabled: !!user?.id,
  });

  // 3. Fetch Leave Types
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => leaveService.getTypes(),
  });

  // 4. Create Request Mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateLeaveRequest) => leaveService.createRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-history'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      setModalVisible(false);
      setSelectedRange({});
      setForm({
        leave_type_id: '',
        start_date: '',
        end_date: '',
        reason: '',
      });
      Alert.alert('Success', 'Leave request submitted successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to submit leave request');
    }
  });

  // 5. Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => leaveService.cancelRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-history'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      Alert.alert('Success', 'Leave request cancelled');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to cancel request');
    }
  });

  const onRefresh = () => {
    refetchBalances();
    refetchHistory();
  };

  const onDayPress = (day: any) => {
    const dateString = day.dateString;

    if (!selectedRange.start || (selectedRange.start && selectedRange.end)) {
      setSelectedRange({ start: dateString });
    } else {
      let start = selectedRange.start;
      let end = dateString;

      if (new Date(start) > new Date(end)) {
        [start, end] = [end, start];
      }

      setSelectedRange({ start, end });
      setForm(prev => ({ ...prev, start_date: start, end_date: end }));
      setModalVisible(true);
    }
  };

  const markedDates = useMemo(() => {
    const marks: any = {};

    history.forEach((req) => {
      if (req.status === 'APPROVED' || req.status === 'PENDING') {
        const color = req.status === 'APPROVED' ? '#d9e6da' : '#ffdbd0';
        const textColor = req.status === 'APPROVED' ? '#5b675e' : '#e17c5a';

        marks[req.start_date] = {
          startingDay: true,
          color,
          textColor,
          endingDay: !req.end_date || req.end_date === req.start_date
        };

        if (req.end_date && req.end_date !== req.start_date) {
          marks[req.end_date] = { endingDay: true, color, textColor };
        }
      }
    });

    if (selectedRange.start) {
      marks[selectedRange.start] = {
        ...marks[selectedRange.start],
        startingDay: true,
        color: Tokens.colors.primary,
        textColor: '#fff',
        endingDay: !selectedRange.end
      };
    }
    if (selectedRange.end) {
      marks[selectedRange.end] = {
        ...marks[selectedRange.end],
        endingDay: true,
        color: Tokens.colors.primary,
        textColor: '#fff'
      };

      let start = new Date(selectedRange.start!);
      let end = new Date(selectedRange.end);
      let curr = new Date(start);
      curr.setDate(curr.getDate() + 1);

      while (curr < end) {
        const d = curr.toISOString().split('T')[0];
        marks[d] = { color: 'rgba(0, 6, 102, 0.2)', textColor: Tokens.colors.primary };
        curr.setDate(curr.getDate() + 1);
      }
    }

    return marks;
  }, [history, selectedRange]);

  const handleCreate = () => {
    if (!form.leave_type_id || !form.start_date || !form.reason) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    createMutation.mutate(form);
  };

  const handleCancel = (id: string) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this leave request?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: () => cancelMutation.mutate(id), style: 'destructive' }
      ]
    );
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
      {/* Decorative Background Elements */}
      <View className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-on-primary-container/15" />
      <View className="absolute top-64 -left-24 w-72 h-72 rounded-full bg-error-container/10" />
      <View className="absolute -bottom-12 -right-4 w-44 h-44 rounded-full bg-secondary-container/20" />

      <View className="flex-row justify-between items-center px-5 pt-2 pb-5 z-10">
        <View>
          <Text className="font-manrope-extrabold text-3xl text-primary">Leave (Cuti)</Text>
          <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Select dates on calendar</Text>
        </View>
        <View className="items-end">
          <Text className="font-inter-semibold text-[10px] text-text-muted mb-1 uppercase tracking-wider">Total Sisa</Text>
          <View className="flex-row items-baseline bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/10">
            <Text className="font-manrope-extrabold text-xl text-primary">{totalRemaining}</Text>
            <Text className="font-inter-semibold text-xs text-primary ml-1">Hari</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetchingHistory} onRefresh={onRefresh} tintColor={Tokens.colors.primary} />
        }
      >
        {/* Calendar Section */}
        <GlassCard style={{ padding: 10, marginBottom: 20 }}>
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
            markingType={'period'}
            markedDates={markedDates}
            onDayPress={onDayPress}
          />
          <View className="flex-row items-center justify-center gap-1.5 mt-2.5 pt-2.5 border-t border-black/5">
            <MaterialIcons name="info-outline" size={14} color={Tokens.colors.textMuted} />
            <Text className="font-inter-medium text-[11px] text-text-muted">Klik 2x (mulai & akhir) untuk ajukan cuti</Text>
          </View>
        </GlassCard>

        <View className="flex-row justify-between items-center mt-6 mb-4">
          <Text className="font-manrope-bold text-lg text-primary ">History</Text>
          <Text className="font-inter-semibold text-xs text-text-muted">{history.length} Requests</Text>
        </View>

        {isLoadingHistory ? (
          <ActivityIndicator size="large" color={Tokens.colors.primary} className="mt-5" />
        ) : history.length === 0 ? (
          <GlassCard style={{ padding: 0, marginTop: 10 }}>
            <View className="items-center justify-center py-10 w-full">
              <MaterialIcons name="history" size={48} color={Tokens.colors.outline} />
              <Text className="font-inter-medium text-sm text-text-muted mt-3 text-center">
                No history found
              </Text>
            </View>
          </GlassCard>
        ) : (
          history.map((item) => (
            <GlassCard key={item.id} style={{ marginBottom: 12, padding: 16 }}>
              <View className="flex-row justify-between items-start mb-2.5">
                <View className="flex-1">
                  <Text className="font-inter-bold text-base text-black">{item.leave_type_name || 'Leave Request'}</Text>
                  <View className="flex-row items-center mt-1 gap-1.5">
                    <MaterialIcons name="calendar-today" size={12} color={Tokens.colors.textMuted} />
                    <Text className="font-inter-medium text-xs text-text-muted">
                      {item.start_date} {item.end_date ? `to ${item.end_date}` : ''}
                    </Text>
                  </View>
                </View>
                <StatusBadge label={item.status} type={getStatusType(item.status) as any} />
              </View>
              <Text className="font-inter text-sm text-black leading-5 bg-black/5 p-2.5 rounded-lg" numberOfLines={2}>
                {item.reason}
              </Text>

              {item.status === 'PENDING' && (
                <Pressable
                  onPress={() => handleCancel(item.id)}
                  className="mt-3.5 flex-row items-center gap-1 self-start"
                >
                  <MaterialIcons name="close" size={14} color={Tokens.colors.error} />
                  <Text className="font-inter-bold text-xs text-error">Cancel Request</Text>
                </Pressable>
              )}
            </GlassCard>
          ))
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedRange({});
        }}
      >
        <View className="flex-1 bg-primary/40 justify-end">
          <View className="bg-background rounded-t-[32px] p-6 max-h-[85%] shadow-2xl">
            <View className="flex-row justify-between items-start mb-6">
              <View>
                <Text className="font-manrope-extrabold text-2xl text-primary">Request Leave</Text>
                <Text className="font-inter-medium text-xs text-text-muted mt-0.5">
                  Selected: {form.start_date} to {form.end_date}
                </Text>
              </View>
              <Pressable
                className="w-9 h-9 rounded-full bg-black/5 items-center justify-center"
                onPress={() => {
                  setModalVisible(false);
                  setSelectedRange({});
                }}
              >
                <MaterialIcons name="close" size={20} color={Tokens.colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="font-inter-bold text-sm text-primary mb-2.5 ml-1">Select Type</Text>
              <View className="flex-row flex-wrap gap-2.5 mb-5">
                {leaveTypes.map((type) => (
                  <Pressable
                    key={type.id}
                    className={`px-4 py-2.5 rounded-xl border ${form.leave_type_id === type.id
                      ? 'bg-primary border-primary'
                      : 'bg-[#f0eded] border-transparent'
                      }`}
                    onPress={() => setForm({ ...form, leave_type_id: type.id })}
                  >
                    <Text className={`font-inter-semibold text-sm ${form.leave_type_id === type.id ? 'text-white font-inter-bold' : 'text-text-muted'
                      }`}>
                      {type.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Input
                label="Reason"
                value={form.reason}
                onChangeText={(text) => setForm({ ...form, reason: text })}
                placeholder="Why do you need this leave?"
                multiline
                numberOfLines={3}
                style={{ height: 100, textAlignVertical: 'top', paddingTop: 12 }}
              />

              <Button
                title="Submit Request"
                onPress={handleCreate}
                loading={createMutation.isPending}
                className="mt-5 h-14 rounded-2xl"
              />
              <View className="h-10" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
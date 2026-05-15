import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Pressable, 
  Modal, 
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tokens } from '../src/core/theme/tokens';
import { useAuthStore } from '../src/stores/auth.store';
import { overtimeService } from '../src/services/overtime.service';
import { attendanceService } from '../src/services/attendance.service';
import { GlassCard } from '../src/components/ui/GlassCard';
import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';
import { StatusBadge } from '../src/components/ui/StatusBadge';
import { CreateOvertimeRequest } from '../src/types/overtime';

export default function OvertimeScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<CreateOvertimeRequest>({
    attendance_id: '',
    overtime_minutes: 0,
    overtime_type: 'AFTER_SHIFT',
    reason: '',
  });

  // 1. Fetch Summary
  const { data: summary, isLoading: isLoadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['overtime-summary', user?.id],
    queryFn: () => overtimeService.getSummary(user?.id || '', new Date().getFullYear(), new Date().getMonth() + 1),
    enabled: !!user?.id,
  });

  // 2. Fetch History
  const { data: history = [], isLoading: isLoadingHistory, refetch: refetchHistory, isFetching: isFetchingHistory } = useQuery({
    queryKey: ['overtime-history', user?.id],
    queryFn: () => overtimeService.getRequests({ employee_id: user?.id, limit: 50 }),
    enabled: !!user?.id,
  });

  // 3. Fetch Attendance (to pick from)
  const { data: attendanceHistory = [] } = useQuery({
    queryKey: ['attendance-history-pick', user?.id],
    queryFn: () => attendanceService.getAttendanceHistory({ employee_id: user?.id, limit: 10 }),
    enabled: modalVisible && !!user?.id,
  });

  // 4. Create Overtime Mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateOvertimeRequest) => overtimeService.createRecord(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime-history'] });
      queryClient.invalidateQueries({ queryKey: ['overtime-summary'] });
      setModalVisible(false);
      setForm({
        attendance_id: '',
        overtime_minutes: 0,
        overtime_type: 'AFTER_SHIFT',
        reason: '',
      });
      Alert.alert('Success', 'Overtime claim submitted');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to submit overtime');
    }
  });

  const onRefresh = () => {
    refetchSummary();
    refetchHistory();
  };

  const handleCreate = () => {
    if (!form.attendance_id || form.overtime_minutes <= 0 || !form.reason) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    createMutation.mutate(form);
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
      <View className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-on-primary-container/10" />
      <View className="absolute bottom-40 -left-12 w-48 h-48 rounded-full bg-secondary-container/20" />

      <View className="flex-row justify-between items-center px-5 pt-2 pb-5 z-10">
        <View>
          <Text className="font-manrope-extrabold text-3xl text-primary">Overtime</Text>
          <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Claim your extra hours</Text>
        </View>
        <Pressable 
          className="w-12 h-12 rounded-2xl bg-primary items-center justify-center shadow-lg shadow-primary/30 elevation-8" 
          onPress={() => setModalVisible(true)}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetchingHistory} onRefresh={onRefresh} tintColor={Tokens.colors.primary} />
        }
      >
        {/* Summary Dashboard */}
        <View className="flex-row gap-3 mb-6">
          <GlassCard style={{ flex: 1, padding: 20 }}>
            <Text className="font-inter-semibold text-[11px] text-text-muted uppercase tracking-wider mb-2">Total Jam</Text>
            <View className="flex-row items-baseline">
              <Text className="font-manrope-extrabold text-3xl text-primary">{summary?.total_hours ?? 0}</Text>
              <Text className="font-inter-semibold text-xs text-primary ml-1">Hrs</Text>
            </View>
          </GlassCard>
          <GlassCard style={{ flex: 1, padding: 20 }}>
            <Text className="font-inter-semibold text-[11px] text-text-muted uppercase tracking-wider mb-2">Approved</Text>
            <View className="flex-row items-baseline">
              <Text className="font-manrope-extrabold text-3xl text-on-secondary-container">
                {summary?.approved_minutes ? Math.floor(summary.approved_minutes / 60) : 0}
              </Text>
              <Text className="font-inter-semibold text-xs text-on-secondary-container ml-1">Hrs</Text>
            </View>
          </GlassCard>
        </View>

        <Text className="font-manrope-bold text-lg text-primary mb-4">Overtime History</Text>
        
        {isLoadingHistory ? (
          <ActivityIndicator size="large" color={Tokens.colors.primary} className="mt-10" />
        ) : history.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', padding: 40, marginTop: 10 }}>
            <MaterialIcons name="work-history" size={48} color={Tokens.colors.outline} />
            <Text className="font-inter-medium text-sm text-text-muted mt-3">No history found</Text>
          </GlassCard>
        ) : (
          history.map((item) => (
            <GlassCard key={item.id} style={{ marginBottom: 12, padding: 16 }}>
              <View className="flex-row justify-between items-start mb-2.5">
                <View className="flex-1">
                  <Text className="font-inter-bold text-base text-black">{item.overtime_type.replace('_', ' ')}</Text>
                  <View className="flex-row items-center mt-1 gap-1.5">
                    <MaterialIcons name="event" size={12} color={Tokens.colors.textMuted} />
                    <Text className="font-inter-medium text-xs text-text-muted">{item.attendance_date || item.created_at.split('T')[0]}</Text>
                  </View>
                </View>
                <StatusBadge label={item.status} type={getStatusType(item.status) as any} />
              </View>
              
              <View className="flex-row justify-between items-end mt-2">
                <View className="bg-black/5 px-3 py-2 rounded-lg flex-1 mr-3">
                  <Text className="font-inter text-sm text-black" numberOfLines={1}>{item.reason || 'No reason provided'}</Text>
                </View>
                <View className="bg-primary/5 px-3 py-1.5 rounded-lg items-center">
                  <Text className="font-manrope-extrabold text-lg text-primary">{item.overtime_minutes}</Text>
                  <Text className="font-inter-semibold text-[9px] text-primary uppercase">Min</Text>
                </View>
              </View>
            </GlassCard>
          ))
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-primary/40 justify-end">
          <View className="bg-background rounded-t-[32px] p-6 max-h-[90%] shadow-2xl">
            <View className="flex-row justify-between items-start mb-6">
              <View>
                <Text className="font-manrope-extrabold text-2xl text-primary">Claim Overtime</Text>
                <Text className="font-inter-medium text-xs text-text-muted mt-0.5">Link to your attendance</Text>
              </View>
              <Pressable className="w-9 h-9 rounded-full bg-black/5 items-center justify-center" onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={20} color={Tokens.colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="font-inter-bold text-sm text-primary mb-3 ml-1">Select Attendance</Text>
              <View className="gap-2 mb-6">
                {attendanceHistory.length === 0 ? (
                  <Text className="font-inter text-xs text-text-muted italic ml-1">No recent attendance found</Text>
                ) : (
                  attendanceHistory.slice(0, 5).map((att) => (
                    <Pressable 
                      key={att.id}
                      className={`p-4 rounded-xl border ${
                        form.attendance_id === att.id 
                        ? 'bg-primary/5 border-primary' 
                        : 'bg-[#f0eded] border-transparent'
                      }`}
                      onPress={() => setForm({ ...form, attendance_id: att.id })}
                    >
                      <View className="flex-row justify-between items-center">
                        <View className="flex-row items-center gap-2">
                          <MaterialIcons name="calendar-today" size={14} color={Tokens.colors.primary} />
                          <Text className={`font-inter-semibold text-sm ${form.attendance_id === att.id ? 'text-primary' : 'text-text-muted'}`}>
                            {att.date}
                          </Text>
                        </View>
                        <Text className="font-manrope-bold text-xs text-primary">{att.checkin_time} - {att.checkout_time || '??'}</Text>
                      </View>
                    </Pressable>
                  ))
                )}
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Input 
                    label="Minutes"
                    value={form.overtime_minutes.toString()}
                    onChangeText={(text) => setForm({ ...form, overtime_minutes: parseInt(text) || 0 })}
                    placeholder="e.g. 60"
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-inter-bold text-[12px] text-primary mb-2 ml-1">Type</Text>
                  <View className="bg-[#f0eded] rounded-xl px-4 h-14 justify-center">
                    <Text className="font-inter-medium text-sm">AFTER_SHIFT</Text>
                  </View>
                </View>
              </View>

              <Input 
                label="Reason"
                value={form.reason}
                onChangeText={(text) => setForm({ ...form, reason: text })}
                placeholder="What did you work on?"
                multiline
                numberOfLines={3}
                style={{ height: 100, textAlignVertical: 'top', paddingTop: 12 }}
              />

              <Button 
                title="Submit Overtime" 
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
  );
}

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
import { CreateOvertimeRequest, OvertimeType } from '../src/types/overtime';

export default function OvertimeScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<CreateOvertimeRequest>({
    attendance_id: '',
    overtime_minutes: 0,
    overtime_type: 'REGULAR',
    reason: '',
  });

  const handleSelectAttendance = (att: any) => {
    setForm({
      ...form,
      attendance_id: att.id,
    });
  };

  const overtimeTypes: OvertimeType[] = ['REGULAR', 'HOLIDAY', 'OFF_DAY'];

  const currentMonthParams = React.useMemo(() => ({ 
    year: new Date().getFullYear(), 
    month: new Date().getMonth() + 1 
  }), []);

  // 1. Fetch Summary (Monthly Recap)
  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['overtime-summary', user?.id],
    queryFn: () => {
      console.log('[Overtime] Fetching Summary for', user?.id);
      return overtimeService.getSummary(user?.id || '', currentMonthParams);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // 2. Fetch History (Personal Records)
  const { data: history = [], isLoading: isLoadingHistory, refetch: refetchHistory, isFetching: isFetchingHistory } = useQuery({
    queryKey: ['overtime-history', user?.id],
    queryFn: () => {
      console.log('[Overtime] Fetching History for', user?.id);
      return overtimeService.listRecords({ 
        employee_id: user?.id, 
        ...currentMonthParams,
        limit: 50 
      }).then(data => {
        console.log('[Overtime] History data sample:', JSON.stringify(data.slice(0, 1)));
        return data;
      });
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // 3. Fetch Attendance (to pick from)
  const { data: attendanceHistory = [], isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['attendance-history-pick', user?.id, modalVisible],
    queryFn: async () => {
      if (!user?.id) return [];
      console.log('[Overtime] Fetching candidates for attendance_id for employee:', user.id);
      
      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 30); // 30 days ago as per pseudo-code
      
      const params = { 
        employee_id: user.id, 
        date_from: dateFrom.toISOString().split('T')[0],
        date_to: dateTo.toISOString().split('T')[0],
        limit: 50 
      };
      
      console.log('[Overtime] Attendance query params:', JSON.stringify(params));
      const result = await attendanceService.getAttendanceHistory(params);
      console.log('[Overtime] Attendance candidates fetched:', result.length);
      return result;
    },
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
        overtime_type: 'REGULAR',
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
    if (!form.attendance_id || form.overtime_minutes <= 0) {
      Alert.alert('Error', 'Please select attendance and enter minutes');
      return;
    }
    createMutation.mutate(form);
  };

  const getStatusType = (status?: string) => {
    const s = status?.toUpperCase() || 'PENDING';
    switch (s) {
      case 'APPROVED': return 'secondary';
      case 'PENDING': return 'warning';
      case 'REJECTED': return 'error';
      case 'CANCELLED': return 'error';
      default: return 'warning';
    }
  };

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return '--:--';
    if (timeStr.includes('T')) return timeStr.split('T')[1].slice(0, 5);
    return timeStr.slice(0, 5);
  };

  const formatCurrency = (value?: number) => {
    if (!value) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Decorative Background Elements */}
      <View className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-on-primary-container/5" />
      <View className="absolute bottom-40 -left-12 w-48 h-48 rounded-full bg-secondary-container/10" />

      <View className="flex-row justify-between items-center px-5 pt-2 pb-5 z-10">
        <View>
          <Text className="font-manrope-extrabold text-3xl text-primary">Overtime</Text>
          <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Track your extra work hours</Text>
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
        {/* Monthly Recap Cards */}
        <View className="mb-6">
          <Text className="font-manrope-bold text-base text-primary mb-3">Bulan Ini</Text>
          <View className="flex-row gap-3">
            <GlassCard style={{ flex: 1, padding: 16 }}>
              <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center mb-3">
                <MaterialIcons name="access-time" size={16} color={Tokens.colors.primary} />
              </View>
              <Text className="font-inter-semibold text-[10px] text-text-muted uppercase tracking-wider mb-1">Total Jam</Text>
              <View className="flex-row items-baseline">
                <Text className="font-manrope-extrabold text-2xl text-primary">{summary?.total_hours ?? 0}</Text>
                <Text className="font-inter-semibold text-[10px] text-primary ml-1">Hrs</Text>
              </View>
            </GlassCard>
            
            <GlassCard style={{ flex: 1, padding: 16 }}>
              <View className="w-8 h-8 rounded-full bg-on-secondary-container/10 items-center justify-center mb-3">
                <MaterialIcons name="payments" size={16} color={Tokens.colors.onSecondaryContainer} />
              </View>
              <Text className="font-inter-semibold text-[10px] text-text-muted uppercase tracking-wider mb-1">Estimasi</Text>
              <Text className="font-manrope-extrabold text-xl text-on-secondary-container" numberOfLines={1}>
                {formatCurrency(summary?.total_amount)}
              </Text>
            </GlassCard>
          </View>
        </View>

        <View className="flex-row justify-between items-center mb-4">
          <Text className="font-manrope-bold text-lg text-primary">Riwayat Lembur</Text>
          <View className="bg-primary/10 px-3 py-1 rounded-full">
            <Text className="font-inter-bold text-[10px] text-primary">{history.length} Records</Text>
          </View>
        </View>
        
        {isLoadingHistory ? (
          <ActivityIndicator size="large" color={Tokens.colors.primary} className="mt-10" />
        ) : history.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', padding: 40, marginTop: 10 }}>
            <MaterialIcons name="work-history" size={48} color={Tokens.colors.outline} />
            <Text className="font-inter-medium text-sm text-text-muted mt-3 text-center">Belum ada riwayat lembur</Text>
          </GlassCard>
        ) : (
          history.map((item) => (
            <GlassCard key={item.id} style={{ marginBottom: 12, padding: 16 }}>
              <View className="flex-row justify-between items-start mb-2.5">
                <View className="flex-1">
                  <Text className="font-inter-bold text-[10px] text-text-muted uppercase mb-1 tracking-widest">
                    Overtime Request
                  </Text>
                  <View className="flex-row items-center gap-1.5 mb-1.5">
                    <MaterialIcons name="calendar-today" size={12} color={Tokens.colors.primary} />
                    <Text className="font-inter-bold text-sm text-black">
                      {item.attendance_date || item.overtime_date || item.created_at?.split('T')[0] || '-'}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <View className="flex-row items-center gap-1">
                      <MaterialIcons name="history" size={12} color={Tokens.colors.primary} />
                      <Text className="font-inter-bold text-xs text-primary">
                        {item.overtime_minutes} Menit
                      </Text>
                    </View>
                    <View className="w-1 h-1 rounded-full bg-outline/30" />
                    <Text className="font-inter-bold text-[10px] text-text-muted uppercase tracking-tighter">
                      {item.overtime_type?.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <StatusBadge 
                    label={item.status || 'PENDING'} 
                    type={getStatusType(item.status) as any} 
                  />
                  {!!item.overtime_amount && item.overtime_amount > 0 && (
                    <Text className="font-inter-bold text-[10px] text-secondary mt-1">
                      +{formatCurrency(item.overtime_amount)}
                    </Text>
                  )}
                </View>
              </View>
              
              {item.reason && (
                <View className="bg-black/5 px-3 py-2 rounded-lg mt-2">
                  <Text className="font-inter text-xs text-text-muted italic" numberOfLines={2}>
                    &quot;{item.reason}&quot;
                  </Text>
                </View>
              )}
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
                <Text className="font-manrope-extrabold text-2xl text-primary">Ajukan Lembur</Text>
                <Text className="font-inter-medium text-xs text-text-muted mt-0.5">Pilih kehadiran untuk diklaim</Text>
              </View>
              <Pressable className="w-9 h-9 rounded-full bg-black/5 items-center justify-center" onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={20} color={Tokens.colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="font-inter-bold text-sm text-primary mb-3 ml-1">1. Pilih Tanggal Kehadiran</Text>
              <View className="gap-2 mb-6">
                {isLoadingAttendance ? (
                  <ActivityIndicator size="small" color={Tokens.colors.primary} className="py-4" />
                ) : attendanceHistory.length === 0 ? (
                  <View className="p-4 bg-black/5 rounded-xl border border-dashed border-outline">
                    <Text className="font-inter text-xs text-text-muted text-center">Tidak ada data kehadiran terbaru</Text>
                  </View>
                ) : (
                  attendanceHistory.slice(0, 20).map((att) => (
                    <Pressable 
                      key={att.id}
                      className={`p-4 rounded-xl border ${
                        form.attendance_id === att.id 
                        ? 'bg-primary/5 border-primary' 
                        : 'bg-[#f8f8f8] border-transparent'
                      }`}
                      onPress={() => handleSelectAttendance(att)}
                    >
                      <View className="flex-row justify-between items-center">
                        <View className="flex-row items-center gap-3">
                          <View className={`w-8 h-8 rounded-full items-center justify-center ${form.attendance_id === att.id ? 'bg-primary' : 'bg-outline/20'}`}>
                            <MaterialIcons name="event" size={14} color={form.attendance_id === att.id ? '#fff' : Tokens.colors.textMuted} />
                          </View>
                          <View className="flex-1">
                            <View className="flex-row items-center gap-2">
                              <Text className={`font-inter-bold text-sm ${form.attendance_id === att.id ? 'text-primary' : 'text-on-surface'}`}>
                                {att.attendance_date || att.date}
                              </Text>
                              {att.attendance_status && (
                                <View className={`px-1.5 py-0.5 rounded-md ${
                                  att.attendance_status === 'PRESENT' ? 'bg-secondary-container' : 'bg-error-container/10'
                                }`}>
                                  <Text className={`font-inter-bold text-[8px] ${
                                    att.attendance_status === 'PRESENT' ? 'text-secondary' : 'text-error'
                                  }`}>
                                    {att.attendance_status}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text className="font-inter-medium text-[10px] text-text-muted">
                              {formatTime(att.checkin_at || att.checkin_time)} - {formatTime(att.checkout_at || att.checkout_time)}
                            </Text>
                          </View>
                        </View>
                        {form.attendance_id === att.id && (
                          <MaterialIcons name="check-circle" size={20} color={Tokens.colors.primary} />
                        )}
                      </View>
                    </Pressable>
                  ))
                )}
              </View>

              <Text className="font-inter-bold text-sm text-primary mb-3 ml-1">2. Tipe Lembur</Text>
              <View className="flex-row gap-2 mb-6">
                {overtimeTypes.map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setForm({ ...form, overtime_type: type })}
                    className={`flex-1 py-3 rounded-xl border items-center ${
                      form.overtime_type === type 
                      ? 'bg-primary border-primary' 
                      : 'bg-[#f8f8f8] border-transparent'
                    }`}
                  >
                    <Text className={`font-inter-bold text-[10px] ${
                      form.overtime_type === type ? 'text-white' : 'text-text-muted'
                    }`}>
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="font-inter-bold text-sm text-primary mb-3 ml-1">3. Detail Lembur</Text>
              <Input 
                label="Durasi Lembur (Menit)"
                value={form.overtime_minutes > 0 ? form.overtime_minutes.toString() : ''}
                onChangeText={(text) => setForm({ ...form, overtime_minutes: parseInt(text) || 0 })}
                placeholder="Contoh: 60"
                keyboardType="numeric"
              />

              <Input 
                label="Alasan Lembur (Opsional)"
                value={form.reason}
                onChangeText={(text) => setForm({ ...form, reason: text })}
                placeholder="Selesaikan laporan bulanan..."
                multiline
                numberOfLines={3}
                style={{ height: 80, textAlignVertical: 'top', paddingTop: 12 }}
              />

              <Button 
                title="Kirim Pengajuan" 
                onPress={handleCreate}
                loading={createMutation.isPending}
                className="mt-4 h-14 rounded-2xl"
              />
              <View className="h-8" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

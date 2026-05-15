import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Pressable, 
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tokens } from '../src/core/theme/tokens';
import { useAuthStore } from '../src/stores/auth.store';
import { payrollService } from '../src/services/payroll.service';
import { GlassCard } from '../src/components/ui/GlassCard';
import { Button } from '../src/components/ui/Button';

export default function PayrollScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // 1. Fetch Payroll Preview
  const { data: payroll, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['payroll-preview', user?.id, selectedYear, selectedMonth],
    queryFn: () => payrollService.getPreview(user?.id || '', { month: selectedMonth, year: selectedYear }),
    enabled: !!user?.id,
  });

  // 2. Generate Payroll Mutation
  const generateMutation = useMutation({
    mutationFn: () => payrollService.generatePreview(user?.id || '', { month: selectedMonth, year: selectedYear }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-preview'] });
      Alert.alert('Success', 'Payslip generated for this month');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to generate payslip');
    }
  });

  const onRefresh = () => {
    refetch();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Decorative Background Elements */}
      <View className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-primary/10" />
      <View className="absolute bottom-20 -right-12 w-48 h-48 rounded-full bg-on-tertiary-container/10" />

      <View className="px-5 pt-2 pb-5 z-10">
        <Text className="font-manrope-extrabold text-3xl text-primary">Payroll</Text>
        <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Your monthly payslip</Text>
      </View>

      <View className="flex-row items-center px-5 mb-6 gap-3">
        <Pressable 
          className="flex-row items-center bg-white/80 border border-white/90 px-4 py-2.5 rounded-xl flex-1 justify-between"
          onPress={() => {
            const next = selectedMonth === 1 ? 12 : selectedMonth - 1;
            if (selectedMonth === 1) setSelectedYear(selectedYear - 1);
            setSelectedMonth(next);
          }}
        >
          <MaterialIcons name="chevron-left" size={20} color={Tokens.colors.primary} />
          <Text className="font-inter-bold text-sm text-primary">
            {monthNames[selectedMonth - 1]} {selectedYear}
          </Text>
          <Pressable 
            onPress={(e) => {
              e.stopPropagation();
              const next = selectedMonth === 12 ? 1 : selectedMonth + 1;
              if (selectedMonth === 12) setSelectedYear(selectedYear + 1);
              setSelectedMonth(next);
            }}
          >
            <MaterialIcons name="chevron-right" size={20} color={Tokens.colors.primary} />
          </Pressable>
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
          <ActivityIndicator size="large" color={Tokens.colors.primary} className="mt-20" />
        ) : !payroll ? (
          <GlassCard style={{ alignItems: 'center', padding: 40, marginTop: 20 }}>
            <MaterialIcons name="receipt-long" size={64} color={Tokens.colors.outline} />
            <Text className="font-manrope-bold text-lg text-primary mt-4">No payslip found</Text>
            <Text className="font-inter text-sm text-text-muted text-center mt-2 mb-6">
              Payslip for {monthNames[selectedMonth-1]} hasn't been generated yet.
            </Text>
            <Button 
              title="Generate Payslip" 
              onPress={() => generateMutation.mutate()} 
              loading={generateMutation.isPending}
              className="w-full"
            />
          </GlassCard>
        ) : (
          <View className="gap-6">
            {/* Main Net Salary Card */}
            <GlassCard style={{ padding: 24, alignItems: 'center' }}>
              <Text className="font-inter-semibold text-xs text-text-muted uppercase tracking-widest mb-2">Net Salary</Text>
              <Text className="font-manrope-extrabold text-4xl text-primary">{formatCurrency(payroll.net_salary)}</Text>
              <View className="flex-row mt-4 bg-primary/5 px-4 py-1.5 rounded-full items-center">
                <MaterialIcons name="check-circle" size={14} color="#1f6b42" />
                <Text className="font-inter-bold text-[10px] text-[#1f6b42] ml-1 uppercase tracking-wider">{payroll.status}</Text>
              </View>
            </GlassCard>

            {/* Earnings Section */}
            <View>
              <View className="flex-row items-center mb-3 ml-1 gap-2">
                <View className="w-1.5 h-1.5 rounded-full bg-[#1f6b42]" />
                <Text className="font-manrope-bold text-base text-primary">Earnings</Text>
              </View>
              <GlassCard style={{ padding: 16 }}>
                <View className="gap-3">
                  <View className="flex-row justify-between items-center border-b border-black/5 pb-2.5">
                    <Text className="font-inter text-sm text-text-muted">Basic Salary</Text>
                    <Text className="font-inter-bold text-sm text-black">{formatCurrency(payroll.basic_salary)}</Text>
                  </View>
                  {payroll.components.filter(c => c.type === 'EARNING').map(comp => (
                    <View key={comp.id} className="flex-row justify-between items-center">
                      <Text className="font-inter text-sm text-text-muted">{comp.name}</Text>
                      <Text className="font-inter-bold text-sm text-black">{formatCurrency(comp.amount)}</Text>
                    </View>
                  ))}
                  <View className="flex-row justify-between items-center mt-2 pt-3 border-t border-black/5">
                    <Text className="font-manrope-bold text-sm text-primary">Total Earnings</Text>
                    <Text className="font-manrope-extrabold text-sm text-primary">{formatCurrency(payroll.total_earnings)}</Text>
                  </View>
                </View>
              </GlassCard>
            </View>

            {/* Deductions Section */}
            <View>
              <View className="flex-row items-center mb-3 ml-1 gap-2">
                <View className="w-1.5 h-1.5 rounded-full bg-error" />
                <Text className="font-manrope-bold text-base text-primary">Deductions</Text>
              </View>
              <GlassCard style={{ padding: 16 }}>
                <View className="gap-3">
                  {payroll.components.filter(c => c.type === 'DEDUCTION').length === 0 ? (
                    <Text className="font-inter text-xs text-text-muted italic py-1">No deductions this month</Text>
                  ) : (
                    payroll.components.filter(c => c.type === 'DEDUCTION').map(comp => (
                      <View key={comp.id} className="flex-row justify-between items-center">
                        <Text className="font-inter text-sm text-text-muted">{comp.name}</Text>
                        <Text className="font-inter-bold text-sm text-error">-{formatCurrency(comp.amount)}</Text>
                      </View>
                    ))
                  )}
                  <View className="flex-row justify-between items-center mt-2 pt-3 border-t border-black/5">
                    <Text className="font-manrope-bold text-sm text-primary">Total Deductions</Text>
                    <Text className="font-manrope-extrabold text-sm text-error">-{formatCurrency(payroll.total_deductions)}</Text>
                  </View>
                </View>
              </GlassCard>
            </View>

            <Button 
              title="Download Payslip PDF" 
              onPress={() => Alert.alert('Coming Soon', 'PDF download will be available in the next update.')}
              className="mt-2 h-14 rounded-2xl"
              style={{ backgroundColor: Tokens.colors.primaryContainer }}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

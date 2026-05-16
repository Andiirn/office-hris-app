import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Pressable, 
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking
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
  const { data: payroll, isLoading, refetch, isFetching, isError } = useQuery({
    queryKey: ['payroll-preview', user?.id, selectedYear, selectedMonth],
    queryFn: () => payrollService.getPreview(user?.id || '', { month: selectedMonth, year: selectedYear }),
    enabled: !!user?.id,
  });

  const earnings = React.useMemo(() => 
    (payroll?.components || []).filter(c => 
      c.type?.toLowerCase() === 'allowance' || c.type?.toUpperCase() === 'EARNING'
    ), [payroll]);

  const deductions = React.useMemo(() => 
    (payroll?.components || []).filter(c => 
      c.type?.toLowerCase() === 'deduction' || c.type?.toUpperCase() === 'DEDUCTION'
    ), [payroll]);

  React.useEffect(() => {
    if (payroll) {
      console.log('[Payroll] Current Data:', JSON.stringify(payroll, null, 2));
      console.log('[Payroll] Earnings Count:', earnings.length);
      console.log('[Payroll] Deductions Count:', deductions.length);
    }
  }, [payroll, earnings, deductions]);

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

  const handleDownload = async () => {
    try {
      const url = await payrollService.downloadPdf(user?.id || '', { month: selectedMonth, year: selectedYear });
      // In mobile, we typically open the URL in browser or use a file downloader
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Could not open download link');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to prepare download link');
    }
  };

  const onRefresh = () => {
    refetch();
  };

  const formatCurrency = (amount: any) => {
    const numericValue = typeof amount === 'number' ? amount : parseFloat(amount);
    if (isNaN(numericValue)) return 'Rp 0';
    
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(numericValue);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Decorative Background Elements */}
      <View className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-primary/5" />
      <View className="absolute bottom-20 -right-12 w-48 h-48 rounded-full bg-secondary/10" />

      <View className="flex-row justify-between items-center px-5 pt-2 pb-5 z-10">
        <View>
          <Text className="font-manrope-extrabold text-3xl text-primary">Payroll</Text>
          <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Slip Gaji Bulanan</Text>
        </View>
        <View className="bg-primary/10 px-4 py-2 rounded-2xl">
          <Text className="font-manrope-bold text-xs text-primary">{selectedYear}</Text>
        </View>
      </View>

      <View className="px-5 mb-6">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          className="flex-grow-0"
          contentContainerStyle={{ gap: 8 }}
        >
          {monthNames.map((name, index) => (
            <Pressable 
              key={name}
              onPress={() => setSelectedMonth(index + 1)}
              className={`px-5 py-2.5 rounded-xl border ${
                selectedMonth === index + 1 
                ? 'bg-primary border-primary' 
                : 'bg-white/80 border-white/90'
              }`}
            >
              <Text className={`font-inter-bold text-xs ${
                selectedMonth === index + 1 ? 'text-white' : 'text-text-muted'
              }`}>
                {name.substring(0, 3)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
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
          <View className="mt-20 items-center">
            <ActivityIndicator size="large" color={Tokens.colors.primary} />
            <Text className="font-inter-medium text-sm text-text-muted mt-4">Memuat data slip gaji...</Text>
          </View>
        ) : !user?.id ? (
          <GlassCard style={{ alignItems: 'center', padding: 40, marginTop: 10 }}>
            <View className="w-20 h-20 rounded-full bg-error/5 items-center justify-center mb-6">
              <MaterialIcons name="person-off" size={40} color={Tokens.colors.error} />
            </View>
            <Text className="font-manrope-bold text-lg text-primary">Data Karyawan Tidak Ditemukan</Text>
            <Text className="font-inter text-sm text-text-muted text-center mt-2">
              Silakan login kembali atau hubungi HR.
            </Text>
          </GlassCard>
        ) : isError || !payroll ? (
          <GlassCard style={{ alignItems: 'center', padding: 40, marginTop: 10 }}>
            <View className="w-20 h-20 rounded-full bg-primary/5 items-center justify-center mb-6">
              <MaterialIcons name="receipt-long" size={40} color={Tokens.colors.primary} />
            </View>
            <Text className="font-manrope-bold text-lg text-primary">Slip Belum Tersedia</Text>
            <Text className="font-inter text-sm text-text-muted text-center mt-2 mb-8 px-4">
              Slip gaji untuk periode ini belum tersedia atau gagal dimuat.
            </Text>
            <Button 
              title="Generate Slip Gaji" 
              onPress={() => generateMutation.mutate()} 
              loading={generateMutation.isPending}
              className="w-full h-14 rounded-2xl shadow-lg shadow-primary/20"
            />
          </GlassCard>
        ) : (
          <View className="gap-6">
            {/* Main Payslip Header */}
            <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
              <View className="bg-primary px-6 py-8 items-center">
                <Text className="font-inter-semibold text-[10px] text-white/70 uppercase tracking-widest mb-1">Total Gaji Bersih</Text>
                <Text className="font-manrope-extrabold text-4xl text-white">
                  {formatCurrency(payroll.take_home_pay || payroll.net_salary || (
                    (payroll.total_earnings || payroll.gross_salary || 0) - (payroll.total_deductions || 0)
                  ))}
                </Text>
                <View className="mt-4 bg-white/20 px-4 py-1.5 rounded-full flex-row items-center border border-white/30">
                  <MaterialIcons name="check-circle" size={14} color="#fff" />
                  <Text className="font-inter-bold text-[10px] text-white ml-1.5 uppercase tracking-wider">{payroll.status}</Text>
                </View>
              </View>
              
              <View className="p-6 bg-white/50">
                  <View>
                    <Text className="font-inter-semibold text-[10px] text-text-muted uppercase mb-1">ID Slip</Text>
                    <Text className="font-manrope-bold text-sm text-on-surface">{payroll.id.substring(0, 8)}...</Text>
                  </View>
                  <View className="items-end">
                    <Text className="font-inter-semibold text-[10px] text-text-muted uppercase mb-1">Periode</Text>
                    <Text className="font-manrope-bold text-sm text-on-surface">{monthNames[payroll.period_month-1]} {payroll.period_year}</Text>
                  </View>
              </View>
            </GlassCard>

            {/* Income Section */}
            <View>
              <View className="flex-row items-center mb-3 ml-1 gap-2">
                <View className="w-1 h-5 rounded-full bg-[#1f6b42]" />
                <Text className="font-manrope-bold text-base text-primary">Penghasilan</Text>
              </View>
              <GlassCard style={{ padding: 20 }}>
                <View className="gap-4">
                  <View className="flex-row justify-between items-center">
                    <Text className="font-inter text-sm text-text-muted">Gaji Pokok</Text>
                    <Text className="font-inter-bold text-sm text-black">{formatCurrency(payroll.base_salary)}</Text>
                  </View>
                  {earnings.length > 0 ? (
                    earnings.map(comp => (
                      <View key={comp.id} className="flex-row justify-between items-center">
                        <Text className="font-inter text-sm text-text-muted">{comp.name}</Text>
                        <Text className="font-inter-bold text-sm text-black">{formatCurrency(comp.amount)}</Text>
                      </View>
                    ))
                  ) : (
                    <>
                      {payroll.total_allowance > 0 && (
                        <View className="flex-row justify-between items-center">
                          <Text className="font-inter text-sm text-text-muted">Total Tunjangan</Text>
                          <Text className="font-inter-bold text-sm text-black">{formatCurrency(payroll.total_allowance)}</Text>
                        </View>
                      )}
                      {payroll.total_overtime > 0 && (
                        <View className="flex-row justify-between items-center">
                          <Text className="font-inter text-sm text-text-muted">Lembur</Text>
                          <Text className="font-inter-bold text-sm text-black">{formatCurrency(payroll.total_overtime)}</Text>
                        </View>
                      )}
                    </>
                  )}
                  <View className="mt-2 pt-4 border-t border-black/5 flex-row justify-between items-center">
                    <Text className="font-manrope-bold text-sm text-[#1f6b42]">Total Penghasilan</Text>
                    <Text className="font-manrope-extrabold text-sm text-[#1f6b42]">{formatCurrency(payroll.base_salary + payroll.total_allowance + payroll.total_overtime)}</Text>
                  </View>
                </View>
              </GlassCard>
            </View>

            {/* Deduction Section */}
            <View>
              <View className="flex-row items-center mb-3 ml-1 gap-2">
                <View className="w-1 h-5 rounded-full bg-error" />
                <Text className="font-manrope-bold text-base text-primary">Potongan</Text>
              </View>
              <GlassCard style={{ padding: 20 }}>
                <View className="gap-4">
                  {deductions.length === 0 ? (
                    <View className="gap-4">
                      {payroll.tax_amount > 0 ? (
                        <View className="flex-row justify-between items-center">
                          <Text className="font-inter text-sm text-text-muted">Pajak (PPH21)</Text>
                          <Text className="font-inter-bold text-sm text-error">-{formatCurrency(payroll.tax_amount)}</Text>
                        </View>
                      ) : null}
                      {payroll.bpjs_kes_employee > 0 ? (
                        <View className="flex-row justify-between items-center">
                          <Text className="font-inter text-sm text-text-muted">BPJS Kesehatan (Karyawan)</Text>
                          <Text className="font-inter-bold text-sm text-error">-{formatCurrency(payroll.bpjs_kes_employee)}</Text>
                        </View>
                      ) : null}
                      {payroll.bpjs_tk_employee > 0 ? (
                        <View className="flex-row justify-between items-center">
                          <Text className="font-inter text-sm text-text-muted">BPJS Ketenagakerjaan (Karyawan)</Text>
                          <Text className="font-inter-bold text-sm text-error">-{formatCurrency(payroll.bpjs_tk_employee)}</Text>
                        </View>
                      ) : null}
                      {(!payroll.tax_amount && !payroll.bpjs_kes_employee && !payroll.bpjs_tk_employee && !payroll.total_deductions) && (
                        <Text className="font-inter text-xs text-text-muted italic py-1">Tidak ada potongan bulan ini</Text>
                      )}
                    </View>
                  ) : (
                    deductions.map(comp => (
                      <View key={comp.id} className="flex-row justify-between items-center">
                        <Text className="font-inter text-sm text-text-muted">{comp.name}</Text>
                        <Text className="font-inter-bold text-sm text-error">-{formatCurrency(comp.amount)}</Text>
                      </View>
                    ))
                  )}
                  <View className="mt-2 pt-4 border-t border-black/5 flex-row justify-between items-center">
                    <Text className="font-manrope-bold text-sm text-error">Total Potongan</Text>
                    <Text className="font-manrope-extrabold text-sm text-error">-{formatCurrency(payroll.total_deductions || (payroll.tax_amount + payroll.bpjs_kes_employee + payroll.bpjs_tk_employee))}</Text>
                  </View>
                </View>
              </GlassCard>
            </View>

            <Button 
              title="Download Slip Gaji (PDF)" 
              onPress={handleDownload}
              className="mt-2 h-14 rounded-2xl shadow-xl shadow-black/10"
              style={{ backgroundColor: Tokens.colors.primaryContainer }}
            >
              <MaterialIcons name="picture-as-pdf" size={20} color="#fff" />
            </Button>
            
            <View className="items-center py-4">
              <Text className="font-inter text-[10px] text-text-muted italic text-center">
                Ini adalah dokumen elektronik yang dihasilkan secara otomatis dan tidak memerlukan tanda tangan basah.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '../src/components/ui/GlassCard';
import { Skeleton, SkeletonCard } from '../src/components/ui/Skeleton';
import { qk } from '../src/core/query/query-keys';
import { Tokens } from '../src/core/theme/tokens';
import { authService } from '../src/services/auth.service';
import { payrollService } from '../src/services/payroll.service';
import { useAuthStore } from '../src/stores/auth.store';

export default function PayrollScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: profile } = useQuery({
    queryKey: qk.profile(),
    queryFn: () => authService.getProfile(),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
  const companyId = profile?.company_id || user?.company_id || null;
  const companyName = profile?.company?.name || profile?.company_id || 'Company tidak tersedia';

  // 1. Fetch Payroll Preview
  const { data: payroll, isLoading, refetch, isFetching, isError, error } = useQuery({
    queryKey: qk.payrollPreview(user?.id, companyId, selectedYear, selectedMonth),
    queryFn: () => payrollService.getPreview(user?.id || '', { month: selectedMonth, year: selectedYear, company_id: companyId }),
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    retry: 1, // Minimize retries for production if server is down
  });

  const isServerError = (error as any)?.response?.status === 500;
  const isNotFound = (error as any)?.response?.status === 404 || (!payroll && !isLoading && !isError);

  const readNumber = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) ? value : 0;

  const baseSalary = readNumber(payroll?.base_salary);
  const totalAllowanceVal = readNumber(payroll?.total_allowance);
  const totalOvertimeVal = readNumber(payroll?.total_overtime);
  const customEarningVal = readNumber(payroll?.employee_custom_earning);

  const taxAmountVal = readNumber(payroll?.tax_amount);
  const bpjsKesEmployeeVal = readNumber(payroll?.bpjs_kes_employee);
  const bpjsTkEmployeeVal = readNumber(payroll?.bpjs_tk_employee);
  const lateDeductionVal = readNumber(payroll?.late_deduction);
  const leaveDeductionVal = readNumber(payroll?.leave_deduction);
  const customDeductionVal = readNumber(payroll?.employee_custom_deduction);

  const bpjsKesCompanyVal = readNumber(payroll?.bpjs_kes_company);
  const bpjsTkCompanyVal = readNumber(payroll?.bpjs_tk_company);

  // Custom component lines from API
  const rawComponents = React.useMemo(() => [
    ...(payroll?.components ?? []),
    ...(payroll?.component_lines ?? [])
  ], [payroll]);

  const normalizeComponentType = (value: string | undefined) =>
    (value ?? "").trim().toLowerCase();

  const allowances = React.useMemo(() => rawComponents
    .filter((c: any) => normalizeComponentType(c.component_type || c.type) === "earning" || normalizeComponentType(c.component_type || c.type) === "allowance")
    .map((c: any) => ({ name: c.name as string, amount: readNumber(c.amount), keterangan: c.keterangan })), [rawComponents]);

  const customDeductions = React.useMemo(() => rawComponents
    .filter((c: any) => normalizeComponentType(c.component_type || c.type) === "deduction")
    .map((c: any) => ({ name: c.name as string, amount: readNumber(c.amount), keterangan: c.keterangan })), [rawComponents]);

  const totalAllowance = totalAllowanceVal || allowances.reduce((sum: number, item: any) => sum + item.amount, 0);
  const totalDeduction = payroll?.total_deductions || (taxAmountVal + bpjsKesEmployeeVal + bpjsTkEmployeeVal + lateDeductionVal + leaveDeductionVal + customDeductionVal + customDeductions.reduce((sum: number, item: any) => sum + item.amount, 0));

  const grossIncome = payroll?.bruto_salary || (baseSalary + totalAllowance + totalOvertimeVal + customEarningVal);
  const netSalary = payroll?.take_home_pay || (grossIncome - totalDeduction);

  React.useEffect(() => {
    if (payroll) {
      console.log('[Payroll] Current Data:', JSON.stringify(payroll, null, 2));
    }
  }, [payroll]);

  // 2. Generate Payroll Mutation
  const generateMutation = useMutation({
    mutationFn: () => payrollService.generatePreview(user?.id || '', { month: selectedMonth, year: selectedYear }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.payrollPreview(user?.id, companyId, selectedYear, selectedMonth) });
      Alert.alert('Success', 'Payslip generated for this month');
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      const message = status === 500
        ? 'Server sedang bermasalah. Silakan coba lagi nanti.'
        : (error?.response?.data?.message || 'Gagal membuat slip gaji');
      Alert.alert('Gagal', message);
    }
  });

  const handleDownload = async () => {
    try {
      const { localUri, filename } = await payrollService.downloadPdf(user?.id || '', { month: selectedMonth, year: selectedYear, company_id: companyId });
      const savedUri = await payrollService.savePdfToDownloads(localUri, filename);
      Alert.alert('Sukses', `Slip gaji tersimpan ke folder pilihan.\n\nFile: ${savedUri.split('/').pop() || filename}`);
    } catch (err: any) {
      console.error('[Payroll Download Error]', err);
      const status = err?.response?.status;
      const message = status === 500
        ? 'Server sedang bermasalah. Gagal mengunduh slip gaji.'
        : 'Gagal mengunduh slip gaji. Silakan coba lagi.';
      Alert.alert('Gagal', message);
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
    <SafeAreaView className="flex-1 bg-[#fbf9f8]">
      {/* Decorative Background Elements */}
      <View className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-primary/5" />
      <View className="absolute bottom-20 -right-12 w-48 h-48 rounded-full bg-secondary/10" />

      <View className="flex-row justify-between items-center px-5 pt-2 pb-5 z-10">
        <View className="flex-row items-center gap-3 flex-1">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm active:opacity-60"
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <MaterialIcons name="arrow-back" size={22} color={Tokens.colors.primary} />
          </Pressable>
          <View className="flex-1">
            <Text className="font-manrope-extrabold text-3xl text-[#000666]">Payroll</Text>
            <Text className="font-inter-medium text-sm text-[#454652] mt-0.5">Slip Gaji Bulanan</Text>
          </View>
        </View>
        <View className="bg-primary/10 px-4 py-2 rounded-2xl">
          <Text className="font-manrope-bold text-xs text-[#000666]">{selectedYear}</Text>
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
              className={`px-5 py-2.5 rounded-xl border ${selectedMonth === index + 1
                ? 'bg-[#000666] border-[#000666]'
                : 'bg-white/80 border-white/90'
                }`}
            >
              <Text className={`font-inter-bold text-xs ${selectedMonth === index + 1 ? 'text-white' : 'text-[#454652]'
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
          <View className="mt-2">
            <Skeleton height={160} width="100%" />
            <View className="mt-4">
              <SkeletonCard />
              <SkeletonCard />
            </View>
          </View>
        ) : !user?.id ? (
          <GlassCard style={{ alignItems: 'center', padding: 40, marginTop: 10 }}>
            <View className="w-20 h-20 rounded-full bg-error/5 items-center justify-center mb-6">
              <MaterialIcons name="person-off" size={40} color={Tokens.colors.error} />
            </View>
            <Text className="font-manrope-bold text-lg text-[#000666]">Data Karyawan Tidak Ditemukan</Text>
            <Text className="font-inter text-sm text-[#454652] text-center mt-2">
              Silakan login kembali atau hubungi HR.
            </Text>
          </GlassCard>
        ) : isServerError ? (
          <GlassCard style={{ alignItems: 'center', padding: 40, marginTop: 10 }}>
            <View className="w-20 h-20 rounded-full bg-error/5 items-center justify-center mb-6">
              <MaterialIcons name="dns" size={40} color={Tokens.colors.error} />
            </View>
            <Text className="font-manrope-bold text-lg text-[#000666]">Server Bermasalah</Text>
            <Text className="font-inter text-sm text-[#454652] text-center mt-2 mb-8 px-4">
              Maaf, saat ini server sedang mengalami gangguan. Silakan coba beberapa saat lagi.
            </Text>
            <Pressable
              onPress={() => refetch()}
              className="bg-[#000666] px-8 py-3 rounded-2xl shadow-sm active:opacity-70"
            >
              <Text className="font-inter-bold text-white text-sm">Coba Lagi</Text>
            </Pressable>
          </GlassCard>
        ) : isError || !payroll ? (
          <GlassCard style={{ alignItems: 'center', padding: 40, marginTop: 10 }}>
            <View className="w-20 h-20 rounded-full bg-primary/5 items-center justify-center mb-6">
              <MaterialIcons name="receipt-long" size={40} color={Tokens.colors.primary} />
            </View>
            <Text className="font-manrope-bold text-lg text-[#000666]">Slip Belum Tersedia</Text>
            <Text className="font-inter text-sm text-[#454652] text-center mt-2 mb-8 px-4">
              Slip gaji untuk periode ini belum tersedia atau gagal dimuat.
            </Text>
          </GlassCard>
        ) : (
          <View style={{ gap: 16 }}>
            {/* Main Payslip Header */}
            <GlassCard style={{ padding: 0, overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
              {/* Brand Header */}
              <View className="bg-[#000666] px-5 py-6 flex-row justify-between items-center">
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-3 flex-wrap">
                    <Text className="font-manrope-extrabold text-lg text-white">{companyName}</Text>
                    <View className="px-2.5 py-1 rounded-full bg-white/15 border border-white/15">
                      <Text className="font-inter-bold text-sm text-white uppercase tracking-wider">
                        {monthNames[payroll.period_month - 1]} {payroll.period_year}
                      </Text>
                    </View>
                  </View>
                  <Text className="font-inter text-xs text-white/80 mt-1.5">SLIP GAJI KARYAWAN</Text>
                </View>
              </View>

              {/* Slip Metadata */}
              <View className="p-5 bg-white">
                <View className="flex-row justify-between mb-4 pb-4 border-b border-black/5">
                  <View>
                    <Text className="font-inter-semibold text-[10px] text-[#454652] uppercase tracking-wider mb-1">NAMA KARYAWAN</Text>
                    <Text className="font-manrope-bold text-sm text-[#1b1c1c]">{payroll.employee?.full_name || user?.full_name || 'Karyawan'}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="font-inter-semibold text-[10px] text-[#454652] uppercase tracking-wider mb-1">NIK</Text>
                    <Text className="font-manrope-bold text-sm text-[#1b1c1c]">{payroll.employee?.nik || '—'}</Text>
                  </View>
                </View>

                <View className="flex-row justify-between">

                </View>
              </View>
            </GlassCard>

            {/* Attendance Summary */}
            <View>
              <View className="flex-row items-center mb-3 ml-1 gap-2">
                <MaterialIcons name="event-note" size={18} color={Tokens.colors.primary} />
                <Text className="font-manrope-bold text-base text-[#000666]">Ringkasan Kehadiran</Text>
              </View>
              <GlassCard style={{ padding: 16, backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
                <View className="flex-row flex-wrap justify-between" style={{ gap: 8 }}>
                  <View className="bg-black/5 rounded-2xl p-3 items-center justify-center" style={{ width: '30%' }}>
                    <Text className="font-inter-bold text-[10px] text-[#454652] uppercase">Hari Kerja</Text>
                    <Text className="font-manrope-bold text-base text-[#1b1c1c] mt-1">{payroll.work_days ?? 0}</Text>
                  </View>
                  <View className="bg-emerald-50 rounded-2xl p-3 items-center justify-center border border-emerald-100" style={{ width: '30%' }}>
                    <Text className="font-inter-bold text-[10px] text-emerald-700 uppercase">Hadir</Text>
                    <Text className="font-manrope-bold text-base text-emerald-700 mt-1">{payroll.present_days ?? 0}</Text>
                  </View>
                  <View className="bg-red-50 rounded-2xl p-3 items-center justify-center border border-red-100" style={{ width: '30%' }}>
                    <Text className="font-inter-bold text-[10px] text-red-700 uppercase">Absen</Text>
                    <Text className="font-manrope-bold text-base text-red-700 mt-1">{payroll.absent_days ?? 0}</Text>
                  </View>
                  <View className="bg-blue-50 rounded-2xl p-3 items-center justify-center border border-blue-100" style={{ width: '30%' }}>
                    <Text className="font-inter-bold text-[10px] text-blue-700 uppercase">Cuti</Text>
                    <Text className="font-manrope-bold text-base text-blue-700 mt-1">{payroll.total_leave_days ?? 0}</Text>
                  </View>
                  <View className="bg-amber-50 rounded-2xl p-3 items-center justify-center border border-amber-100" style={{ width: '30%' }}>
                    <Text className="font-inter-bold text-[10px] text-amber-700 uppercase">Lembur</Text>
                    <Text className="font-manrope-bold text-base text-amber-700 mt-1">{payroll.overtime_hours ?? 0}j</Text>
                  </View>
                  <View className="bg-amber-50 rounded-2xl p-2 items-center justify-center border border-amber-100" style={{ width: '30%' }}>
                    <Text className="font-inter-bold text-[9px] text-amber-700 uppercase">Terlambat</Text>
                    <Text className="font-manrope-bold text-sm text-amber-700 mt-0.5">{payroll.late_days ?? 0} H</Text>
                    <Text className="font-inter text-[8px] text-text-muted mt-0.5">({payroll.minor_late_days ?? 0}r / {payroll.major_late_days ?? 0}b)</Text>
                  </View>
                </View>
              </GlassCard>
            </View>

            {/* Income Section */}
            <View>
              <View className="flex-row items-center mb-3 ml-1 gap-2">
                <MaterialIcons name="add-circle" size={18} color="#1f6b42" />
                <Text className="font-manrope-bold text-base text-[#1f6b42]">Tunjangan & Pendapatan</Text>
              </View>
              <GlassCard style={{ padding: 18, backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
                <View className="gap-3">
                  <View className="flex-row justify-between items-center pb-2.5 border-b border-black/5">
                    <Text className="font-inter text-sm text-[#454652]">Gaji Pokok</Text>
                    <Text className="font-inter-semibold text-sm text-[#1b1c1c]">{formatCurrency(baseSalary)}</Text>
                  </View>
                  <View className="flex-row justify-between items-center pb-2.5 border-b border-black/5">
                    <Text className="font-inter text-sm text-[#454652]">Total Tunjangan</Text>
                    <Text className="font-inter-semibold text-sm text-[#1b1c1c]">{formatCurrency(totalAllowanceVal)}</Text>
                  </View>
                  <View className="flex-row justify-between items-center pb-2.5 border-b border-black/5">
                    <Text className="font-inter text-sm text-[#454652]">Total Lembur</Text>
                    <Text className="font-inter-semibold text-sm text-[#1b1c1c]">{formatCurrency(totalOvertimeVal)}</Text>
                  </View>
                  <View className="flex-row justify-between items-center pb-2.5 border-b border-black/5">
                    <Text className="font-inter text-sm text-[#454652]">Pendapatan Lain-lain</Text>
                    <Text className="font-inter-semibold text-sm text-[#1b1c1c]">{formatCurrency(customEarningVal)}</Text>
                  </View>

                  {/* Component Lines (Earnings) */}
                  {allowances.map((c, idx) => (
                    <View key={`allowance-${idx}`} className="flex-row justify-between items-center pl-3 border-l-2 border-emerald-500/40 py-1">
                      <View>
                        <Text className="font-inter text-sm text-emerald-800">{c.name}</Text>
                        {c.keterangan ? (
                          <Text className="font-inter text-[10px] text-[#454652] italic">{c.keterangan}</Text>
                        ) : null}
                      </View>
                      <Text className="font-inter-semibold text-sm text-emerald-700">+{formatCurrency(c.amount)}</Text>
                    </View>
                  ))}

                  <View className="mt-2 pt-3 flex-row justify-between items-center">
                    <Text className="font-manrope-bold text-sm text-[#1f6b42]">Total Pendapatan Kotor</Text>
                    <Text className="font-manrope-extrabold text-sm text-[#1f6b42]">{formatCurrency(grossIncome)}</Text>
                  </View>
                </View>
              </GlassCard>
            </View>

            {/* Deduction Section */}
            <View>
              <View className="flex-row items-center mb-3 ml-1 gap-2">
                <MaterialIcons name="remove-circle" size={18} color={Tokens.colors.error} />
                <Text className="font-manrope-bold text-base text-error">Potongan Gaji</Text>
              </View>
              <GlassCard style={{ padding: 18, backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
                <View className="gap-3">
                  <View className="flex-row justify-between items-center pb-2.5 border-b border-black/5">
                    <Text className="font-inter text-sm text-[#454652]">Pajak PPh 21</Text>
                    <Text className="font-inter-semibold text-sm text-error">-{formatCurrency(taxAmountVal)}</Text>
                  </View>
                  <View className="flex-row justify-between items-center pb-2.5 border-b border-black/5">
                    <Text className="font-inter text-sm text-[#454652]">BPJS Kesehatan (Karyawan)</Text>
                    <Text className="font-inter-semibold text-sm text-error">-{formatCurrency(bpjsKesEmployeeVal)}</Text>
                  </View>
                  <View className="flex-row justify-between items-center pb-2.5 border-b border-black/5">
                    <Text className="font-inter text-sm text-[#454652]">BPJS Ketenagakerjaan (Karyawan)</Text>
                    <Text className="font-inter-semibold text-sm text-error">-{formatCurrency(bpjsTkEmployeeVal)}</Text>
                  </View>
                  <View className="flex-row justify-between items-center pb-2.5 border-b border-black/5">
                    <Text className="font-inter text-sm text-[#454652]">Potongan Keterlambatan</Text>
                    <Text className="font-inter-semibold text-sm text-error">-{formatCurrency(lateDeductionVal)}</Text>
                  </View>
                  <View className="flex-row justify-between items-center pb-2.5 border-b border-black/5">
                    <Text className="font-inter text-sm text-[#454652]">Potongan Cuti</Text>
                    <Text className="font-inter-semibold text-sm text-error">-{formatCurrency(leaveDeductionVal)}</Text>
                  </View>
                  <View className="flex-row justify-between items-center pb-2.5 border-b border-black/5">
                    <Text className="font-inter text-sm text-[#454652]">Potongan Lain-lain</Text>
                    <Text className="font-inter-semibold text-sm text-error">-{formatCurrency(customDeductionVal)}</Text>
                  </View>

                  {/* Component Lines (Deductions) */}
                  {customDeductions.map((c, idx) => (
                    <View key={`deduction-${idx}`} className="flex-row justify-between items-center pl-3 border-l-2 border-red-500/40 py-1">
                      <View>
                        <Text className="font-inter text-sm text-red-800">{c.name}</Text>
                        {c.keterangan ? (
                          <Text className="font-inter text-[10px] text-[#454652] italic">{c.keterangan}</Text>
                        ) : null}
                      </View>
                      <Text className="font-inter-semibold text-sm text-error">-{formatCurrency(c.amount)}</Text>
                    </View>
                  ))}

                  <View className="mt-2 pt-3 flex-row justify-between items-center">
                    <Text className="font-manrope-bold text-sm text-error">Total Potongan</Text>
                    <Text className="font-manrope-extrabold text-sm text-error">-{formatCurrency(totalDeduction)}</Text>
                  </View>
                </View>
              </GlassCard>
            </View>

            {/* BPJS Ditanggung Perusahaan */}
            <View>
              <View className="flex-row items-center mb-3 ml-1 gap-2">
                <MaterialIcons name="info" size={18} color="#1a237e" />
                <Text className="font-manrope-bold text-base text-primaryContainer">BPJS (Ditanggung Perusahaan)</Text>
              </View>
              <GlassCard style={{ padding: 18, backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
                <View className="gap-3">
                  <View className="flex-row justify-between items-center pb-2.5 border-b border-black/5">
                    <Text className="font-inter text-sm text-[#454652]">BPJS Kesehatan (Perusahaan)</Text>
                    <Text className="font-inter-semibold text-sm text-[#1b1c1c]">{formatCurrency(bpjsKesCompanyVal)}</Text>
                  </View>
                  <View className="flex-row justify-between items-center">
                    <Text className="font-inter text-sm text-[#454652]">BPJS Ketenagakerjaan (Perusahaan)</Text>
                    <Text className="font-inter-semibold text-sm text-[#1b1c1c]">{formatCurrency(bpjsTkCompanyVal)}</Text>
                  </View>
                </View>
              </GlassCard>
            </View>

            {/* Ringkasan Take Home Pay */}
            <View className="bg-[#000666] rounded-3xl overflow-hidden shadow-lg shadow-primary/20">
              <View className="px-6 py-7 items-center">
                <Text className="font-inter-bold text-[10px] text-white/70 uppercase tracking-widest mb-1.5">PENGHASILAN BERSIH (TAKE HOME PAY)</Text>
                <Text className="font-manrope-extrabold text-3xl text-white">
                  {formatCurrency(netSalary)}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleDownload}
              className="mt-2 h-14 rounded-2xl shadow-xl shadow-black/10 flex-row items-center justify-center"
              style={{ backgroundColor: Tokens.colors.primaryContainer }}
            >
              <MaterialIcons name="picture-as-pdf" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text className="font-inter-bold text-white text-base">Download Slip Gaji (PDF)</Text>
            </Pressable>

            <View className="items-center py-4">
              <Text className="font-inter text-[10px] text-[#454652] italic text-center">
                Ini adalah dokumen elektronik yang dihasilkan secara otomatis dan tidak memerlukan tanda tangan basah.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

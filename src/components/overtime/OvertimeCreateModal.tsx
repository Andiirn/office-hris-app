import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../ui/Button';
import { GlassCard } from '../ui/GlassCard';
import { Input } from '../ui/Input';
import { Tokens } from '../../core/theme/tokens';
import { formatOvertimeTime } from '../../features/overtime/time';
import { AttendanceItem } from '../../types/attendance';
import { CreateOvertimeRequest, OvertimeType } from '../../types/overtime';
import { getAttendanceBadgeProps } from '../../utils/status';

type OvertimeMode = 'attendance' | 'pre_submit';

type Props = {
  visible: boolean;
  onClose: () => void;
  mode: OvertimeMode;
  setMode: (value: OvertimeMode) => void;
  selectedAttendance: AttendanceItem | null;
  onOpenAttendancePicker: () => Promise<void> | void;
  form: CreateOvertimeRequest;
  setForm: React.Dispatch<React.SetStateAction<CreateOvertimeRequest>>;
  markedAttendanceDate: Record<string, any>;
  overtimeTypes: OvertimeType[];
  overtimeTypeLabels: Record<OvertimeType, string>;
  normalizeTimeInput: (value: string) => string;
  onSubmit: () => void;
  isSubmitting: boolean;
  attendancePickerVisible: boolean;
  setAttendancePickerVisible: (value: boolean) => void;
  isLoadingAttendance: boolean;
  selectableAttendanceHistory: AttendanceItem[];
  onPickAttendance: (attendance: AttendanceItem) => void;
};

export function OvertimeCreateModal({
  visible,
  onClose,
  mode,
  setMode,
  selectedAttendance,
  onOpenAttendancePicker,
  form,
  setForm,
  markedAttendanceDate,
  overtimeTypes,
  overtimeTypeLabels,
  normalizeTimeInput,
  onSubmit,
  isSubmitting,
  attendancePickerVisible,
  setAttendancePickerVisible,
  isLoadingAttendance,
  selectableAttendanceHistory,
  onPickAttendance,
}: Props) {
  const hasSelectedAttendance = !!selectedAttendance;
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 12);

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-background" edges={['left', 'right', 'bottom']}>
        <View className="flex-row justify-between items-start px-5 pb-5" style={{ paddingTop: headerTopPadding }}>
          <View className="flex-row items-center gap-3 flex-1">
            <Pressable
              onPress={onClose}
              className="w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm active:opacity-60"
              accessibilityRole="button"
              accessibilityLabel="Tutup form lembur"
            >
              <MaterialIcons name="arrow-back" size={22} color={Tokens.colors.primary} />
            </Pressable>
            <View className="flex-1">
              <Text className="font-manrope-extrabold text-3xl text-primary">Pengajuan Lembur</Text>
              <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Pilih mode pengajuan</Text>
            </View>
          </View>
        </View>

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          <View className="flex-1 relative">
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              <View className="flex-row gap-2 mb-5">
                <Pressable
                  onPress={() => setMode('attendance')}
                  className={`flex-1 py-3 rounded-xl border items-center ${mode === 'attendance' ? 'bg-primary border-primary' : 'bg-[#f8f8f8] border-transparent'}`}
                >
                  <Text className={`font-inter-bold text-[10px] ${mode === 'attendance' ? 'text-white' : 'text-text-muted'}`}>Dari Kehadiran</Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode('pre_submit')}
                  className={`flex-1 py-3 rounded-xl border items-center ${mode === 'pre_submit' ? 'bg-primary border-primary' : 'bg-[#f8f8f8] border-transparent'}`}
                >
                  <Text className={`font-inter-bold text-[10px] ${mode === 'pre_submit' ? 'text-white' : 'text-text-muted'}`}>Manual</Text>
                </Pressable>
              </View>

              {mode === 'attendance' ? (
                <View className="mb-4">
                  <Text className="font-inter-bold text-sm text-primary mb-3 ml-1">Pilih Kehadiran</Text>
                  <Pressable
                    className={`flex-row items-center justify-between px-4 py-3 rounded-2xl border ${hasSelectedAttendance ? 'bg-primary/5 border-primary/15' : 'bg-[#f8f8f8] border-transparent'}`}
                    style={{ minHeight: 72 }}
                    onPress={onOpenAttendancePicker}
                  >
                    <View className="flex-1 pr-3">
                      <Text className={`font-inter-bold text-sm ${hasSelectedAttendance ? 'text-primary' : 'text-on-surface'}`} numberOfLines={1}>
                        {hasSelectedAttendance
                          ? selectedAttendance.attendance_date || selectedAttendance.date || 'Kehadiran dipilih'
                          : 'Belum ada kehadiran dipilih'}
                      </Text>
                      <Text className="font-inter-medium text-[10px] text-text-muted mt-1" numberOfLines={1}>
                        {hasSelectedAttendance
                          ? `${formatOvertimeTime(selectedAttendance.checkin_at || selectedAttendance.checkin_time)} - ${formatOvertimeTime(selectedAttendance.checkout_at || selectedAttendance.checkout_time)}`
                          : 'Pilih dari riwayat 30 hari terakhir'}
                      </Text>
                    </View>
                    <View className={`w-10 h-10 rounded-full items-center justify-center ${hasSelectedAttendance ? 'bg-primary' : 'bg-white'}`}>
                      <MaterialIcons
                        name={hasSelectedAttendance ? 'check' : 'keyboard-arrow-down'}
                        size={20}
                        color={hasSelectedAttendance ? '#fff' : Tokens.colors.textMuted}
                      />
                    </View>
                  </Pressable>
                </View>
              ) : (
                <View className="mb-4">
                  <Text className="font-inter-bold text-sm text-primary mb-3 ml-1">Pilih Tanggal Lembur</Text>
                  <GlassCard style={{ padding: 10 }}>
                    <Calendar
                      current={form.overtime_date}
                      minDate={new Date().toISOString().slice(0, 10)}
                      onDayPress={(day) => setForm((prev) => ({ ...prev, overtime_date: day.dateString }))}
                      markedDates={markedAttendanceDate}
                      theme={{
                        backgroundColor: 'transparent',
                        calendarBackground: 'transparent',
                        textSectionTitleColor: Tokens.colors.primary,
                        selectedDayBackgroundColor: Tokens.colors.primary,
                        selectedDayTextColor: '#ffffff',
                        todayTextColor: Tokens.colors.primary,
                        dayTextColor: Tokens.colors.text,
                        textDisabledColor: Tokens.colors.outline,
                        arrowColor: Tokens.colors.primary,
                        monthTextColor: Tokens.colors.primary,
                        textDayFontFamily: 'Inter_400Regular',
                        textMonthFontFamily: 'Manrope_700Bold',
                        textDayHeaderFontFamily: 'Inter_700Bold',
                      }}
                      style={{ borderRadius: 16 }}
                    />
                  </GlassCard>
                </View>
              )}

              <Text className="font-inter-bold text-sm text-primary mb-3 ml-1">Tipe Lembur</Text>
              <View className="flex-row gap-2 mb-5">
                {overtimeTypes.map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setForm((prev) => ({ ...prev, overtime_type: type }))}
                    className={`flex-1 py-3 rounded-xl border items-center ${form.overtime_type === type ? 'bg-primary border-primary' : 'bg-[#f8f8f8] border-transparent'}`}
                  >
                    <Text className={`font-inter-bold text-[10px] ${form.overtime_type === type ? 'text-white' : 'text-text-muted'}`}>
                      {overtimeTypeLabels[type]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="font-inter-bold text-sm text-primary mb-3 ml-1">Waktu Lembur</Text>
              <View className="flex-row gap-3 mb-5">
                <View className="flex-1 px-4 py-3 rounded-xl bg-[#f8f8f8]">
                  <Text className="font-inter-bold text-[10px] text-text-muted uppercase tracking-wider">Mulai</Text>
                  <TextInput
                    value={form.start_time}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, start_time: normalizeTimeInput(text) }))}
                    placeholder="18:00"
                    keyboardType="number-pad"
                    maxLength={5}
                    className="font-inter-bold text-sm text-on-surface mt-1 p-0"
                  />
                </View>
                <View className="flex-1 px-4 py-3 rounded-xl bg-[#f8f8f8]">
                  <Text className="font-inter-bold text-[10px] text-text-muted uppercase tracking-wider">Selesai</Text>
                  <TextInput
                    value={form.end_time}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, end_time: normalizeTimeInput(text) }))}
                    placeholder="21:00"
                    keyboardType="number-pad"
                    maxLength={5}
                    className="font-inter-bold text-sm text-on-surface mt-1 p-0"
                  />
                </View>
              </View>
              <Text className="font-inter text-[11px] text-text-muted -mt-3 mb-5 ml-1">Isi manual format `HH:MM`.</Text>

              <Input
                label="Alasan Lembur (Opsional)"
                value={form.reason}
                onChangeText={(text) => setForm((prev) => ({ ...prev, reason: text }))}
                placeholder="Selesaikan laporan bulanan..."
                multiline
                numberOfLines={3}
                style={{ height: 80, textAlignVertical: 'top', paddingTop: 12 }}
              />

              <Button
                title="Kirim Pengajuan"
                onPress={onSubmit}
                loading={isSubmitting}
                disabled={isSubmitting}
                className="mt-4 h-14 rounded-2xl"
              />
            </ScrollView>

            {attendancePickerVisible ? (
              <View className="absolute inset-0">
                <Pressable
                  className="absolute inset-0 bg-black/40"
                  onPress={() => {
                    setAttendancePickerVisible(false);
                  }}
                />

                <View className="absolute inset-x-0 bottom-0 bg-background rounded-t-[28px] p-5 max-h-[80%]">
                  <View className="flex-row justify-between items-center mb-4">
                    <View>
                      <Text className="font-manrope-bold text-xl text-primary">Pilih Kehadiran</Text>
                      <Text className="font-inter text-xs text-text-muted">Scroll lalu tap salah satu attendance</Text>
                    </View>
                    <Pressable onPress={() => setAttendancePickerVisible(false)} className="w-9 h-9 rounded-full bg-black/5 items-center justify-center">
                      <MaterialIcons name="close" size={18} color={Tokens.colors.text} />
                    </Pressable>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {isLoadingAttendance ? (
                      <Text className="font-inter text-sm text-text-muted py-6 text-center">Memuat attendance...</Text>
                    ) : selectableAttendanceHistory.length === 0 ? (
                      <View className="p-4 bg-black/5 rounded-xl border border-dashed border-outline">
                        <Text className="font-inter text-xs text-text-muted text-center">Tidak ada data kehadiran terbaru</Text>
                      </View>
                    ) : (
                      selectableAttendanceHistory.slice(0, 30).map((att) => {
                        const isSelected = form.attendance_id === att.id;
                        return (
                          <Pressable
                            key={att.id}
                            className={`p-4 rounded-xl border mb-2 ${isSelected ? 'bg-primary/5 border-primary' : 'bg-[#f8f8f8] border-transparent'}`}
                            onPress={() => onPickAttendance(att)}
                          >
                            <View className="flex-row justify-between items-center">
                              <View className="flex-row items-center gap-3 flex-1">
                                <View className={`w-8 h-8 rounded-full items-center justify-center ${isSelected ? 'bg-primary' : 'bg-outline/20'}`}>
                                  <MaterialIcons name="event" size={14} color={isSelected ? '#fff' : Tokens.colors.textMuted} />
                                </View>
                                <View className="flex-1">
                                  <View className="flex-row items-center gap-2">
                                    <Text className={`font-inter-bold text-sm ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                                      {att.attendance_date || att.date}
                                    </Text>
                                    {att.attendance_status ? (() => {
                                      const badgeProps = getAttendanceBadgeProps(att.attendance_status);
                                      return (
                                        <View className={`px-1.5 py-0.5 rounded-md ${badgeProps.bgClass}`}>
                                          <Text className={`font-inter-bold text-[8px] ${badgeProps.textClass}`}>
                                            {badgeProps.label}
                                          </Text>
                                        </View>
                                      );
                                    })() : null}
                                  </View>
                                  <Text className="font-inter-medium text-[10px] text-text-muted">
                                    {formatOvertimeTime(att.checkin_at || att.checkin_time)} - {formatOvertimeTime(att.checkout_at || att.checkout_time)}
                                  </Text>
                                </View>
                              </View>
                              {isSelected ? <MaterialIcons name="check-circle" size={20} color={Tokens.colors.primary} /> : null}
                            </View>
                          </Pressable>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

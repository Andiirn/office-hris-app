import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tokens } from '../../core/theme/tokens';
import { formatOvertimeTime } from '../../features/overtime/time';
import { AttendanceItem } from '../../types/attendance';
import { CreateOvertimeRequest, OvertimeSegment, OvertimeType } from '../../types/overtime';
import { formatAttendanceDayDate } from '../../utils/datetime';
import { getAttendanceBadgeProps } from '../../utils/status';
import { Button } from '../ui/Button';
import { GlassCard } from '../ui/GlassCard';
import { Input } from '../ui/Input';

type OvertimeMode = 'attendance' | 'pre_submit';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
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
  segments: OvertimeSegment[];
  onAddSegment: () => void;
  onOpenSegmentEditor: (segment: OvertimeSegment) => void;
  onSubmitSegment: () => void;
  onDeleteSegment: (segmentId: string) => void;
  segmentModalVisible: boolean;
  setSegmentModalVisible: (value: boolean) => void;
  segmentForm: { segment_date: string; start_time: string; end_time: string };
  setSegmentForm: React.Dispatch<React.SetStateAction<{ segment_date: string; start_time: string; end_time: string }>>;
  editingSegmentId: string | null;
  segmentLoading: boolean;
};

export function OvertimeCreateModal({
  visible,
  onClose,
  title = 'Pengajuan Lembur',
  subtitle = 'Pilih mode pengajuan',
  submitLabel = 'Kirim Pengajuan',
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
  segments,
  onAddSegment,
  onOpenSegmentEditor,
  onSubmitSegment,
  onDeleteSegment,
  segmentModalVisible,
  setSegmentModalVisible,
  segmentForm,
  setSegmentForm,
  editingSegmentId,
  segmentLoading,
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
              <Text className="font-manrope-extrabold text-3xl text-primary">{title}</Text>
              <Text className="font-inter-medium text-sm text-text-muted mt-0.5">{subtitle}</Text>
            </View>
          </View>
        </View>

        <View className="flex-1 relative">
          <KeyboardAwareScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            enableOnAndroid={true}
            extraScrollHeight={Platform.OS === 'ios' ? 24 : 100}
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
                  className={`flex-row items-center justify-between px-4 py-3 rounded-2xl border ${hasSelectedAttendance ? 'bg-blue-50 border-primary' : 'bg-[#f8f8f8] border-transparent'}`}
                  style={{ minHeight: 72 }}
                  onPress={onOpenAttendancePicker}
                >
                  <View className="flex-1 pr-3">
                    <Text className={`font-inter-bold text-sm ${hasSelectedAttendance ? 'text-primary' : 'text-on-surface'}`} numberOfLines={1}>
                      {hasSelectedAttendance
                        ? formatAttendanceDayDate(selectedAttendance.attendance_date || selectedAttendance.date)
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

            <View className="flex-row items-center justify-between mb-3 ml-1">
              <Text className="font-inter-bold text-sm text-primary">Pilih Tipe Lembur</Text>
              <View className="bg-red-100 px-2 py-0.5 rounded-md">
                <Text className="font-inter-bold text-[10px] text-error">Wajib</Text>
              </View>
            </View>
            <View className="flex-row gap-2 mb-5">
              {overtimeTypes.map((type) => {
                const isSelected = form.overtime_type === type;
                const iconName = type === 'REGULAR' ? 'work' : type === 'SATURDAY' ? 'event' : 'event-note';
                return (
                  <Pressable
                    key={type}
                    onPress={() => setForm((prev) => ({ ...prev, overtime_type: type }))}
                    className={`flex-1 py-3 px-2 rounded-2xl border items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-primary border-primary shadow-sm'
                        : 'bg-white border-gray-200 shadow-sm'
                    }`}
                  >
                    <View className="flex-row items-center gap-1">
                      <MaterialIcons
                        name={iconName as any}
                        size={16}
                        color={isSelected ? '#ffffff' : Tokens.colors.textMuted}
                      />
                      {isSelected ? (
                        <MaterialIcons name="check-circle" size={14} color="#ffffff" />
                      ) : null}
                    </View>
                    <Text
                      className={`font-inter-bold text-[11px] text-center ${
                        isSelected ? 'text-white' : 'text-on-surface'
                      }`}
                    >
                      {overtimeTypeLabels[type]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="font-inter-bold text-sm text-primary mb-3 ml-1">Waktu Lembur Utama</Text>
            <View className="flex-row gap-3 mb-5">
              <View className="flex-1 px-4 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm">
                <View className="flex-row items-center justify-between">
                  <Text className="font-inter-bold text-[10px] text-text-muted uppercase tracking-wider">Mulai</Text>
                  <MaterialIcons name="schedule" size={14} color={Tokens.colors.primary} />
                </View>
                <TextInput
                  value={form.start_time}
                  onChangeText={(text) => setForm((prev) => ({ ...prev, start_time: normalizeTimeInput(text) }))}
                  placeholder="18:00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                  maxLength={5}
                  className="font-inter-bold text-base text-on-surface mt-1 p-0"
                />
              </View>
              <View className="flex-1 px-4 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm">
                <View className="flex-row items-center justify-between">
                  <Text className="font-inter-bold text-[10px] text-text-muted uppercase tracking-wider">Selesai</Text>
                  <MaterialIcons name="schedule" size={14} color={Tokens.colors.primary} />
                </View>
                <TextInput
                  value={form.end_time}
                  onChangeText={(text) => setForm((prev) => ({ ...prev, end_time: normalizeTimeInput(text) }))}
                  placeholder="21:00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                  maxLength={5}
                  className="font-inter-bold text-base text-on-surface mt-1 p-0"
                />
              </View>
            </View>
            <Text className="font-inter text-[11px] text-text-muted -mt-3 mb-5 ml-1">Isi manual format `HH:MM`.</Text>

            <GlassCard style={{ padding: 14, marginBottom: 14 }}>
              <View className="flex-row items-center justify-between">
                <Text className="font-inter-bold text-[11px] uppercase tracking-wider text-text-muted">Tambah Jam Lembur</Text>
                <Pressable
                  onPress={onAddSegment}
                  className="w-9 h-9 rounded-full bg-primary items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Tambah segment"
                >
                  <MaterialIcons name="add" size={20} color="#fff" />
                </Pressable>
              </View>
              {segmentModalVisible ? (
                <View className="mt-4 rounded-2xl bg-white p-4 border border-gray-200">
                  <Text className="font-manrope-bold text-base text-on-surface mb-1">
                    {editingSegmentId ? 'Edit Segment' : 'Tambah Lembur'}
                  </Text>
                  <Text className="font-inter text-xs text-text-muted mb-3">
                    {editingSegmentId
                      ? 'Ubah jam mulai dan selesai untuk sesi lembur tambahan.'
                      : 'Isi jam mulai dan selesai untuk sesi lembur tambahan.'}
                  </Text>
                  <View className="mb-3 px-4 py-3 rounded-2xl bg-white border border-gray-200">
                    <Text className="font-inter-bold text-[10px] text-text-muted uppercase tracking-wider">
                      Tanggal Segment
                    </Text>
                    <TextInput
                      value={segmentForm.segment_date}
                      onChangeText={(text) => setSegmentForm((prev) => ({ ...prev, segment_date: text }))}
                      placeholder="2026-08-04"
                      placeholderTextColor="#94a3b8"
                      className="font-inter-bold text-sm text-on-surface mt-1 p-0"
                    />
                  </View>
                  <View className="flex-row gap-3">
                    <View className="flex-1 px-4 py-3 rounded-2xl bg-white border border-gray-200">
                      <View className="flex-row items-center justify-between">
                        <Text className="font-inter-bold text-[10px] text-text-muted uppercase tracking-wider">Mulai</Text>
                        <MaterialIcons name="schedule" size={14} color={Tokens.colors.primary} />
                      </View>
                      <TextInput
                        autoFocus
                        value={segmentForm.start_time}
                        onChangeText={(text) => setSegmentForm((prev) => ({ ...prev, start_time: normalizeTimeInput(text) }))}
                        placeholder="20:00"
                        placeholderTextColor="#94a3b8"
                        keyboardType="number-pad"
                        maxLength={5}
                        className="font-inter-bold text-base text-on-surface mt-1 p-0"
                      />
                    </View>
                    <View className="flex-1 px-4 py-3 rounded-2xl bg-white border border-gray-200">
                      <View className="flex-row items-center justify-between">
                        <Text className="font-inter-bold text-[10px] text-text-muted uppercase tracking-wider">Selesai</Text>
                        <MaterialIcons name="schedule" size={14} color={Tokens.colors.primary} />
                      </View>
                      <TextInput
                        value={segmentForm.end_time}
                        onChangeText={(text) => setSegmentForm((prev) => ({ ...prev, end_time: normalizeTimeInput(text) }))}
                        placeholder="22:00"
                        placeholderTextColor="#94a3b8"
                        keyboardType="number-pad"
                        maxLength={5}
                        className="font-inter-bold text-base text-on-surface mt-1 p-0"
                      />
                    </View>
                  </View>
                  <Text className="font-inter text-[11px] text-text-muted mt-2 leading-4">
                    Gunakan format 24 jam. Jika jam selesai lebih kecil dari jam mulai, sistem otomatis menganggapnya masuk ke hari berikutnya.
                  </Text>
                  <View className="flex-row gap-3 mt-4">
                    <Pressable
                      onPress={() => setSegmentModalVisible(false)}
                      className="flex-1 h-10 rounded-xl bg-gray-100 items-center justify-center"
                      accessibilityRole="button"
                    >
                      <Text className="font-inter-bold text-[13px] text-primary">Batal</Text>
                    </Pressable>
                    <Pressable
                      onPress={onSubmitSegment}
                      disabled={segmentLoading}
                      className={`flex-1 h-10 rounded-xl bg-primary items-center justify-center ${segmentLoading ? 'opacity-60' : ''}`}
                      accessibilityRole="button"
                    >
                      {segmentLoading ? (
                        <Text className="font-inter-bold text-[13px] text-white">Menyimpan...</Text>
                      ) : (
                        <Text className="font-inter-bold text-[13px] text-white">Simpan</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : null}
              {segments.length > 0 && (
                <View className="mt-3 gap-2">
                  {segments.map((segment) => (
                    <View key={segment.id} className="rounded-2xl bg-gray-100 px-4 py-3 flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="font-inter-bold text-sm text-on-surface">
                          {formatOvertimeTime(segment.start_time)} - {formatOvertimeTime(segment.end_time)}
                        </Text>
                        <Text className="font-inter text-[11px] text-text-muted mt-1">
                          {segment.overtime_hours ? `${segment.overtime_hours} jam` : `${segment.overtime_minutes} menit`}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1.5 ml-2">
                        <Pressable
                          onPress={() => onOpenSegmentEditor(segment)}
                          className="w-7 h-7 rounded-full bg-gray-200 items-center justify-center ml-1"
                          accessibilityRole="button"
                          accessibilityLabel="Edit segment"
                        >
                          <MaterialIcons name="edit" size={14} color={Tokens.colors.primary} />
                        </Pressable>
                        <Pressable
                          onPress={() => onDeleteSegment(segment.id)}
                          className="w-7 h-7 rounded-full bg-gray-200 items-center justify-center"
                          accessibilityRole="button"
                          accessibilityLabel="Hapus segment"
                        >
                          <MaterialIcons name="close" size={14} color={Tokens.colors.error} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </GlassCard>

            <Input
              label="Alasan Lembur (Wajib)"
              value={form.reason}
              onChangeText={(text) => setForm((prev) => ({ ...prev, reason: text }))}
              placeholder="Selesaikan laporan bulanan..."
              multiline
              numberOfLines={3}
              style={{ height: 80, textAlignVertical: 'top', paddingTop: 12 }}
            />

            <Button
              title={submitLabel}
              onPress={onSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
              className="mt-4 h-14 rounded-2xl"
            />
          </KeyboardAwareScrollView>

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
                  <Pressable onPress={() => setAttendancePickerVisible(false)} className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
                    <MaterialIcons name="close" size={18} color={Tokens.colors.text} />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {isLoadingAttendance ? (
                    <Text className="font-inter text-sm text-text-muted py-6 text-center">Memuat attendance...</Text>
                  ) : selectableAttendanceHistory.length === 0 ? (
                    <View className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                      <Text className="font-inter text-xs text-text-muted text-center">Tidak ada data kehadiran terbaru</Text>
                    </View>
                  ) : (
                    selectableAttendanceHistory.slice(0, 30).map((att) => {
                      const isSelected = form.attendance_id === att.id;
                      return (
                        <Pressable
                          key={att.id}
                          className={`p-4 rounded-xl border mb-2 ${isSelected ? 'bg-blue-50 border-primary' : 'bg-[#f8f8f8] border-transparent'}`}
                          onPress={() => onPickAttendance(att)}
                        >
                          <View className="flex-row justify-between items-center">
                            <View className="flex-row items-center gap-3 flex-1">
                              <View className={`w-8 h-8 rounded-full items-center justify-center ${isSelected ? 'bg-primary' : 'bg-gray-200'}`}>
                                <MaterialIcons name="event" size={14} color={isSelected ? '#fff' : Tokens.colors.textMuted} />
                              </View>
                              <View className="flex-1">
                                <View className="flex-row items-center gap-2">
                                  <Text className={`font-inter-bold text-sm ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                                    {formatAttendanceDayDate(att.attendance_date || att.date)}
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
      </SafeAreaView>
    </Modal>
  );
}

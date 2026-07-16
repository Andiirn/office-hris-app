import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tokens } from '../../core/theme/tokens';
import { CreateLeaveRequest, LeaveType } from '../../types/leave';
import { Button } from '../ui/Button';
import { GlassCard } from '../ui/GlassCard';
import { Input } from '../ui/Input';

type Colleague = {
  id: string;
  full_name?: string | null;
  nik?: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  leaveTypes: LeaveType[];
  companyId?: string | null;
  form: CreateLeaveRequest;
  onSelectLeaveType: (typeId: string) => void;
  formatLeaveTypeName: (name?: string | null) => string;
  isHourlyLeave: boolean;
  selectedHourlyDate: string;
  setSelectedHourlyDate: (value: string) => void;
  normalizeTimeInput: (value: string) => string;
  selectedRange: { start?: string; end?: string };
  today: string;
  markedDates: Record<string, any>;
  onDayPress: (day: any) => void;
  setForm: React.Dispatch<React.SetStateAction<CreateLeaveRequest>>;
  canChooseReplacement: boolean;
  replacementModalVisible: boolean;
  setReplacementModalVisible: (value: boolean) => void;
  colleagues: Colleague[];
  isLoadingColleagues: boolean;
  colleagueSearch: string;
  setColleagueSearch: (value: string) => void;
  userId?: string;
  requiresDocument: boolean;
  documentFile: { uri: string; name: string; mimeType?: string } | null;
  onClearDocument: () => void;
  onPickImage: () => void;
  onPickDocument: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
};

export function LeaveCreateModal({
  visible,
  onClose,
  leaveTypes,
  companyId,
  form,
  onSelectLeaveType,
  formatLeaveTypeName,
  isHourlyLeave,
  selectedHourlyDate,
  setSelectedHourlyDate,
  normalizeTimeInput,
  selectedRange,
  today,
  markedDates,
  onDayPress,
  setForm,
  canChooseReplacement,
  replacementModalVisible,
  setReplacementModalVisible,
  colleagues,
  isLoadingColleagues,
  colleagueSearch,
  setColleagueSearch,
  userId,
  requiresDocument,
  documentFile,
  onClearDocument,
  onPickImage,
  onPickDocument,
  onSubmit,
  isSubmitting,
}: Props) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 12);
  const visibleLeaveTypes = React.useMemo(
    () => leaveTypes.filter((type) => !companyId || !type.company_id || type.company_id === companyId),
    [leaveTypes, companyId],
  );

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-background" edges={['left', 'right', 'bottom']}>
        <View className="flex-row justify-between items-start px-5 pb-5" style={{ paddingTop: headerTopPadding }}>
          <View className="flex-row items-center gap-3 flex-1">
            <Pressable
              onPress={onClose}
              className="w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm active:opacity-60"
              accessibilityRole="button"
              accessibilityLabel="Tutup form cuti"
            >
              <MaterialIcons name="arrow-back" size={22} color={Tokens.colors.primary} />
            </Pressable>
            <View className="flex-1">
              <Text className="font-manrope-extrabold text-3xl text-primary">Pengajuan Izin & Cuti</Text>
              <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Pilih jenis pengajuan</Text>
            </View>
          </View>
        </View>

        <View className="flex-1 relative">
          <KeyboardAwareScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            enableOnAndroid={true}
            extraScrollHeight={Platform.OS === 'ios' ? 24 : 100}
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 48 }}
          >
            <GlassCard style={{ padding: 16, marginBottom: 20 }}>
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <Text className="font-manrope-bold text-lg text-primary">Pilih Tipe</Text>
                </View>
              </View>

              {visibleLeaveTypes.length === 0 ? (
                <Text className="font-inter text-sm text-text-muted">Memuat tipe pengajuan...</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 4 }}>
                  <View className="flex-row gap-2.5">
                    {visibleLeaveTypes.map((type) => {
                      const active = form.leave_type_id === type.id;
                      return (
                        <Pressable
                          key={type.id}
                          className={`px-4 py-2.5 rounded-full border ${active ? 'bg-primary border-primary' : 'bg-primary/5 border-primary/10'}`}
                          onPress={() => onSelectLeaveType(type.id)}
                        >
                          <Text className={`font-inter-bold text-[13px] ${active ? 'text-white' : 'text-primary'}`}>
                            {formatLeaveTypeName(type.name)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </GlassCard>

            {isHourlyLeave ? (
              <GlassCard style={{ padding: 14, marginBottom: 16 }}>
                <Text className="font-inter-bold text-sm text-primary mb-2">Izin per jam</Text>
                <Text className="font-inter text-xs text-text-muted">
                  Pilih tanggal dulu, lalu isi jam mulai dan selesai.
                </Text>
                <View className="mt-4">
                  <Calendar
                    current={selectedHourlyDate}
                    onDayPress={(day) => setSelectedHourlyDate(day.dateString)}
                    markedDates={{
                      [selectedHourlyDate]: {
                        selected: true,
                        selectedColor: Tokens.colors.primary,
                      },
                    }}
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
                      textDayFontFamily: 'Inter_500Medium',
                      textMonthFontFamily: 'Manrope_700Bold',
                      textDayHeaderFontFamily: 'Inter_700Bold',
                    }}
                    style={{ borderRadius: 16 }}
                  />
                  <Text className="font-inter text-[11px] text-text-muted mt-2 text-center">
                    Tanggal terpilih: {selectedHourlyDate}
                  </Text>
                </View>
                <View className="flex-row gap-3 mt-4">
                  <View className="flex-1 px-4 py-3 rounded-xl bg-[#f8f8f8]">
                    <Text className="font-inter-bold text-[10px] text-text-muted uppercase tracking-wider">Mulai</Text>
                    <TextInput
                      value={form.start_time || ''}
                      onChangeText={(text) => setForm((prev) => ({ ...prev, start_time: normalizeTimeInput(text) }))}
                      placeholder="08:00"
                      keyboardType="number-pad"
                      maxLength={5}
                      className="font-inter-bold text-sm text-on-surface mt-1 p-0"
                    />
                  </View>
                  <View className="flex-1 px-4 py-3 rounded-xl bg-[#f8f8f8]">
                    <Text className="font-inter-bold text-[10px] text-text-muted uppercase tracking-wider">Selesai</Text>
                    <TextInput
                      value={form.end_time || ''}
                      onChangeText={(text) => setForm((prev) => ({ ...prev, end_time: normalizeTimeInput(text) }))}
                      placeholder="10:00"
                      keyboardType="number-pad"
                      maxLength={5}
                      className="font-inter-bold text-sm text-on-surface mt-1 p-0"
                    />
                  </View>
                </View>
                <Text className="font-inter text-[11px] text-text-muted mt-2">Isi manual format `HH:MM`.</Text>
              </GlassCard>
            ) : (
              <GlassCard style={{ padding: 10, marginBottom: 16 }}>
                <Calendar
                  current={selectedRange.start || form.start_date || today}
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
                  markingType="period"
                  markedDates={markedDates}
                  onDayPress={onDayPress}
                />
                <View className="flex-row items-start gap-2 mt-2.5 pt-2.5 border-t border-black/5">
                  <MaterialIcons name="info-outline" size={14} color={Tokens.colors.textMuted} style={{ marginTop: 2 }} />
                  <Text className="font-inter-medium text-[11px] text-text-muted flex-1 leading-4">
                    Pilih tanggal mulai dan akhir untuk ajukan cuti. Jika hanya <Text className="font-inter-bold">1 hari</Text>, pilih tanggal yang sama (contoh: klik tanggal 17, berarti mulai dan selesai di tanggal 17).
                  </Text>
                </View>
              </GlassCard>
            )}

            <Input
              label="Alasan"
              value={form.reason}
              onChangeText={(text) => setForm({ ...form, reason: text })}
              placeholder="Masukkan Alasan Cuti?"
              multiline
              numberOfLines={3}
              style={{ height: 100, textAlignVertical: 'top', paddingTop: 12 }}
            />

            {canChooseReplacement ? (
              <GlassCard style={{ padding: 14, marginTop: 12 }}>
                <Text className="font-inter-bold text-sm text-primary mb-2">Pengganti (Opsional)</Text>
                <Text className="font-inter text-xs text-text-muted mb-3">
                  Pilih rekan 1 divisi untuk menggantikan Anda selama cuti. Jika tidak ada rekan 1 divisi, kosongkan.
                </Text>
                <Pressable
                  onPress={() => setReplacementModalVisible(true)}
                  className="flex-row items-center justify-between px-4 py-3 bg-black/5 rounded-xl border border-outline"
                >
                  <Text className={`font-inter-medium text-sm ${form.replacement_id ? 'text-black' : 'text-text-muted'}`}>
                    {form.replacement_id
                      ? colleagues.find((c) => c.id === form.replacement_id)?.full_name || 'Karyawan Terpilih'
                      : 'Pilih Pengganti'}
                  </Text>
                  <MaterialIcons name="chevron-right" size={20} color={Tokens.colors.textMuted} />
                </Pressable>
              </GlassCard>
            ) : null}

            {requiresDocument ? (
              <GlassCard style={{ padding: 14, marginTop: 12 }}>
                <Text className="font-inter-bold text-sm text-primary mb-2">Dokumen Pendukung</Text>
                <Text className="font-inter text-xs text-text-muted mb-3">
                  Jika tidak melampirkan dokumen, akan dikenakan potongan gaji
                </Text>

                {documentFile ? (
                  <View className="flex-row items-center justify-between bg-black/5 px-3 py-3 rounded-xl">
                    <View className="flex-1 pr-3">
                      <Text className="font-inter-bold text-sm text-on-surface" numberOfLines={1}>
                        {documentFile.name}
                      </Text>
                      <Text className="font-inter text-[10px] text-text-muted mt-1">
                        {documentFile.mimeType || 'file'}
                      </Text>
                    </View>
                    <Pressable onPress={onClearDocument} className="w-8 h-8 rounded-full bg-white items-center justify-center">
                      <MaterialIcons name="close" size={18} color={Tokens.colors.error} />
                    </Pressable>
                  </View>
                ) : null}

                <View className="flex-row gap-2 mt-3">
                  <Pressable onPress={onPickImage} className="flex-1 py-3 rounded-xl bg-secondary-container items-center">
                    <Text className="font-inter-bold text-[12px] text-primary">Pilih Galeri</Text>
                  </Pressable>
                  <Pressable onPress={onPickDocument} className="flex-1 py-3 rounded-xl bg-primary/5 border border-primary/10 items-center">
                    <Text className="font-inter-bold text-[12px] text-primary">Pilih Dokumen</Text>
                  </Pressable>
                </View>
              </GlassCard>
            ) : null}

            <Button
              title="Kirim Pengajuan Cuti"
              onPress={onSubmit}
              loading={isSubmitting}
              className="mt-5 h-14 rounded-2xl"
            />
          </KeyboardAwareScrollView>

          {replacementModalVisible && canChooseReplacement ? (
            <View className="absolute inset-0 z-50 flex-1 bg-black/40 justify-end">
              <View className="bg-background rounded-t-[28px] p-5 h-[80%] shadow-2xl">
                <View className="flex-row justify-between items-center mb-4">
                  <View>
                    <Text className="font-manrope-bold text-xl text-primary">Pilih Pengganti</Text>
                    <Text className="font-inter text-xs text-text-muted">Cari rekan 1 divisi</Text>
                  </View>
                  <Pressable onPress={() => { setReplacementModalVisible(false); setColleagueSearch(''); }} className="w-9 h-9 rounded-full bg-black/5 items-center justify-center">
                    <MaterialIcons name="close" size={18} color={Tokens.colors.text} />
                  </Pressable>
                </View>

                <Input placeholder="Cari nama karyawan..." value={colleagueSearch} onChangeText={setColleagueSearch} />

                <ScrollView showsVerticalScrollIndicator={false} className="mt-4">
                  {isLoadingColleagues ? (
                    <Text className="font-inter text-center text-sm text-text-muted mt-4">Memuat data...</Text>
                  ) : colleagues.filter((c) => c.id !== userId).length > 0 ? (
                    colleagues.filter((c) => c.id !== userId).map((c) => {
                      const active = form.replacement_id === c.id;
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => {
                            setForm({ ...form, replacement_id: active ? '' : c.id });
                            setReplacementModalVisible(false);
                            setColleagueSearch('');
                          }}
                          className={`flex-row items-center justify-between p-4 mb-2 rounded-xl border ${active ? 'bg-primary/5 border-primary' : 'bg-white border-outline'}`}
                        >
                          <View>
                            <Text className={`font-inter-bold text-sm ${active ? 'text-primary' : 'text-on-surface'}`}>{c.full_name}</Text>
                            <Text className="font-inter text-[11px] text-text-muted mt-0.5">{c.nik}</Text>
                          </View>
                          {active ? <MaterialIcons name="check-circle" size={20} color={Tokens.colors.primary} /> : null}
                        </Pressable>
                      );
                    })
                  ) : colleagueSearch ? (
                    <Text className="font-inter text-center text-sm text-text-muted mt-4">Tidak ada hasil untuk &quot;{colleagueSearch}&quot;</Text>
                  ) : (
                    <Text className="font-inter text-center text-sm text-text-muted mt-4">Ketik nama untuk mencari</Text>
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

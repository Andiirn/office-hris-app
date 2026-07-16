import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../ui/Button';
import { GlassCard } from '../ui/GlassCard';
import { Input } from '../ui/Input';
import { Tokens } from '../../core/theme/tokens';
import { AttendanceItem } from '../../types/attendance';
import { getAttendanceBadgeProps } from '../../utils/status';

type Props = {
  visible: boolean;
  onClose: () => void;
  attendancePickerVisible: boolean;
  setAttendancePickerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  selectedAttendance: AttendanceItem | null;
  attendanceHistory: AttendanceItem[];
  isLoadingAttendance: boolean;
  attendanceLabel: string;
  formatTime: (time?: string | null) => string;
  getAttendanceDate: (item: any) => string;
  getCheckIn: (item: any) => any;
  getCheckOut: (item: any) => any;
  getAttendanceRecordId: (item: any) => string;
  handlePickAttendance: (att: AttendanceItem) => void;
  checkinExists: boolean;
  setCheckinExists: React.Dispatch<React.SetStateAction<boolean>>;
  checkoutExists: boolean;
  setCheckoutExists: React.Dispatch<React.SetStateAction<boolean>>;
  correctedCheckinHour: string;
  setCorrectedCheckinHour: React.Dispatch<React.SetStateAction<string>>;
  correctedCheckinMin: string;
  setCorrectedCheckinMin: React.Dispatch<React.SetStateAction<string>>;
  correctedCheckoutHour: string;
  setCorrectedCheckoutHour: React.Dispatch<React.SetStateAction<string>>;
  correctedCheckoutMin: string;
  setCorrectedCheckoutMin: React.Dispatch<React.SetStateAction<string>>;
  reason: string;
  setReason: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: () => void;
  isSubmitting: boolean;
};

export function CorrectionCreateModal({
  visible,
  onClose,
  attendancePickerVisible,
  setAttendancePickerVisible,
  selectedAttendance,
  attendanceHistory,
  isLoadingAttendance,
  attendanceLabel,
  formatTime,
  getAttendanceDate,
  getCheckIn,
  getCheckOut,
  getAttendanceRecordId,
  handlePickAttendance,
  checkinExists,
  setCheckinExists,
  checkoutExists,
  setCheckoutExists,
  correctedCheckinHour,
  setCorrectedCheckinHour,
  correctedCheckinMin,
  setCorrectedCheckinMin,
  correctedCheckoutHour,
  setCorrectedCheckoutHour,
  correctedCheckoutMin,
  setCorrectedCheckoutMin,
  reason,
  setReason,
  onSubmit,
  isSubmitting,
}: Props) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 12);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-background" edges={['left', 'right', 'bottom']}>
        <View className="flex-row justify-between items-start px-5 pb-5" style={{ paddingTop: headerTopPadding }}>
          <View className="flex-row items-center gap-3 flex-1">
            <Pressable
              onPress={onClose}
              className="w-10 h-10 rounded-full bg-white/80 border border-white/90 items-center justify-center shadow-sm active:opacity-60"
              accessibilityRole="button"
              accessibilityLabel="Tutup form koreksi"
            >
              <MaterialIcons name="arrow-back" size={22} color={Tokens.colors.primary} />
            </Pressable>
            <View className="flex-1">
              <Text className="font-manrope-extrabold text-3xl text-primary">Pengajuan Koreksi</Text>
              <Text className="font-inter-medium text-sm text-text-muted mt-0.5">Koreksi jam masuk dan pulang yang keliru</Text>
            </View>
          </View>
        </View>

        <KeyboardAwareScrollView
          className="flex-1 relative"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          enableOnAndroid={true}
          extraScrollHeight={Platform.OS === 'ios' ? 24 : 100}
        >
              <GlassCard style={{ padding: 16, marginBottom: 16 }}>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="font-inter-bold text-sm text-primary">Pilih Kehadiran</Text>
                  {attendancePickerVisible ? (
                    <Pressable onPress={() => setAttendancePickerVisible(false)} className="px-2 py-1">
                      <Text className="font-inter-bold text-[11px] text-primary">Tutup</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Pressable
                  className="flex-row items-center justify-between px-4 py-3 rounded-xl bg-primary/5 border border-primary/10 active:opacity-60"
                  onPress={() => setAttendancePickerVisible((prev) => !prev)}
                >
                  <View className="flex-1 pr-3">
                    <Text className="font-inter-bold text-sm text-on-surface" numberOfLines={1}>
                      {attendanceLabel}
                    </Text>
                    {selectedAttendance ? (
                      <Text className="font-inter-medium text-[10px] text-text-muted mt-0.5">
                        Jam awal: {formatTime(getCheckIn(selectedAttendance))} - {formatTime(getCheckOut(selectedAttendance))}
                      </Text>
                    ) : null}
                  </View>
                  <MaterialIcons name={attendancePickerVisible ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={22} color={Tokens.colors.textMuted} />
                </Pressable>

                {attendancePickerVisible ? (
                  <View className="mt-3 rounded-2xl bg-black/5 p-3">
                    <Text className="font-inter text-[11px] text-text-muted mb-3">Pilih salah satu absensi 30 hari terakhir.</Text>
                    <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled style={{ maxHeight: 280 }}>
                      {isLoadingAttendance ? (
                        <Text className="font-inter text-sm text-text-muted py-6 text-center">Memuat data...</Text>
                      ) : attendanceHistory.length === 0 ? (
                        <View className="p-4 bg-black/5 rounded-xl border border-dashed border-outline">
                          <Text className="font-inter text-xs text-text-muted text-center">Tidak ada data kehadiran</Text>
                        </View>
                      ) : (
                        attendanceHistory.map((att) => {
                          const isSelected = getAttendanceRecordId(selectedAttendance) === getAttendanceRecordId(att);
                          return (
                            <Pressable
                              key={att.id}
                              className={`p-4 rounded-xl border mb-2 ${isSelected ? 'bg-primary/5 border-primary' : 'bg-[#f8f8f8] border-transparent'}`}
                              onPress={() => handlePickAttendance(att)}
                            >
                              <View className="flex-row justify-between items-center">
                                <View className="flex-row items-center gap-3 flex-1">
                                  <View className={`w-8 h-8 rounded-full items-center justify-center ${isSelected ? 'bg-primary' : 'bg-outline/20'}`}>
                                    <MaterialIcons name="event" size={14} color={isSelected ? '#fff' : Tokens.colors.textMuted} />
                                  </View>
                                  <View className="flex-1">
                                    <View className="flex-row items-center gap-2">
                                      <Text className={`font-inter-bold text-sm ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                                        {getAttendanceDate(att)}
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
                                    <Text className="font-inter-medium text-[10px] text-text-muted mt-0.5">
                                      {formatTime(getCheckIn(att))} - {formatTime(getCheckOut(att))}
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
                ) : null}
              </GlassCard>

              <View className="flex-row gap-3 mb-4">
                <View className="flex-1 bg-white border border-black/5 rounded-2xl p-3 shadow-sm">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="font-inter-bold text-[10px] text-text-muted uppercase">Check In</Text>
                    <Pressable onPress={() => setCheckinExists(!checkinExists)}>
                      <MaterialIcons
                        name={checkinExists ? 'check-box' : 'check-box-outline-blank'}
                        size={18}
                        color={Tokens.colors.primary}
                      />
                    </Pressable>
                  </View>
                  <View
                    className={`bg-primary/5 rounded-2xl border border-primary/10 px-2 py-4 items-center justify-center ${!checkinExists && 'opacity-40'}`}
                  >
                    {selectedAttendance && checkinExists ? (
                      <View className="flex-row items-center justify-center w-full">
                        <TextInput
                          value={correctedCheckinHour}
                          onChangeText={(t) => setCorrectedCheckinHour(t.replace(/[^0-9]/g, '').slice(0, 2))}
                          keyboardType="number-pad"
                          maxLength={2}
                          selectTextOnFocus
                          className="flex-1 font-manrope-extrabold text-[32px] leading-[36px] text-primary tracking-tight p-0 text-right"
                        />
                        <Text className="font-manrope-extrabold text-[28px] leading-[36px] text-primary tracking-tight p-0 mx-1">:</Text>
                        <TextInput
                          value={correctedCheckinMin}
                          onChangeText={(t) => setCorrectedCheckinMin(t.replace(/[^0-9]/g, '').slice(0, 2))}
                          keyboardType="number-pad"
                          maxLength={2}
                          selectTextOnFocus
                          className="flex-1 font-manrope-extrabold text-[32px] leading-[36px] text-primary tracking-tight p-0 text-left"
                        />
                      </View>
                    ) : (
                      <Text className="font-manrope-extrabold text-[28px] leading-[36px] text-text-muted tracking-tight text-center w-full">
                        --:--
                      </Text>
                    )}
                  </View>
                  <Text className="font-inter text-[10px] text-text-muted mt-2 text-center">
                    Tap angka untuk ubah
                  </Text>
                </View>

                <View className="flex-1 bg-white border border-black/5 rounded-2xl p-3 shadow-sm">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="font-inter-bold text-[10px] text-text-muted uppercase">Check Out</Text>
                    <Pressable onPress={() => setCheckoutExists(!checkoutExists)}>
                      <MaterialIcons
                        name={checkoutExists ? 'check-box' : 'check-box-outline-blank'}
                        size={18}
                        color={Tokens.colors.primary}
                      />
                    </Pressable>
                  </View>
                  <View
                    className={`bg-primary/5 rounded-2xl border border-primary/10 px-2 py-4 items-center justify-center ${!checkoutExists && 'opacity-40'}`}
                  >
                    {selectedAttendance && checkoutExists ? (
                      <View className="flex-row items-center justify-center w-full">
                        <TextInput
                          value={correctedCheckoutHour}
                          onChangeText={(t) => setCorrectedCheckoutHour(t.replace(/[^0-9]/g, '').slice(0, 2))}
                          keyboardType="number-pad"
                          maxLength={2}
                          selectTextOnFocus
                          className="flex-1 font-manrope-extrabold text-[32px] leading-[36px] text-primary tracking-tight p-0 text-right"
                        />
                        <Text className="font-manrope-extrabold text-[28px] leading-[36px] text-primary tracking-tight p-0 mx-1">:</Text>
                        <TextInput
                          value={correctedCheckoutMin}
                          onChangeText={(t) => setCorrectedCheckoutMin(t.replace(/[^0-9]/g, '').slice(0, 2))}
                          keyboardType="number-pad"
                          maxLength={2}
                          selectTextOnFocus
                          className="flex-1 font-manrope-extrabold text-[32px] leading-[36px] text-primary tracking-tight p-0 text-left"
                        />
                      </View>
                    ) : (
                      <Text className="font-manrope-extrabold text-[28px] leading-[36px] text-text-muted tracking-tight text-center w-full">
                        --:--
                      </Text>
                    )}
                  </View>
                  <Text className="font-inter text-[10px] text-text-muted mt-2 text-center">
                    Tap angka untuk ubah
                  </Text>
                </View>
              </View>

              <Input
                label="Alasan Koreksi"
                value={reason}
                onChangeText={setReason}
                placeholder="Contoh: lupa absen check-in karena buru-buru"
                multiline
                numberOfLines={3}
                style={{ height: 88, textAlignVertical: 'top', paddingTop: 12 }}
              />

              <Button
                title="Kirim Koreksi"
                onPress={onSubmit}
                loading={isSubmitting}
                disabled={isSubmitting || !selectedAttendance}
                className="h-14 rounded-2xl mt-4"
              />
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </Modal>
  );
}

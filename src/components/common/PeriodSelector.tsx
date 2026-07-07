import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleProp, Text, View, ViewStyle } from 'react-native';
import { Tokens } from '../../core/theme/tokens';

type PeriodField = 'month' | 'year';

const MONTH_OPTIONS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
] as const;

interface PeriodSelectorProps {
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  title?: string;
  subtitle?: string;
  yearOptions?: number[];
  style?: StyleProp<ViewStyle>;
}

export function PeriodSelector({
  month,
  year,
  onMonthChange,
  onYearChange,
  title = 'Periode',
  subtitle = 'Pilih bulan dan tahun',
  yearOptions,
  style,
}: PeriodSelectorProps) {
  const [visible, setVisible] = useState(false);
  const [field, setField] = useState<PeriodField>('month');

  const resolvedYearOptions = useMemo(() => {
    if (yearOptions && yearOptions.length > 0) return yearOptions;

    const currentYear = new Date().getFullYear();

    return Array.from(
      { length: currentYear - 2025 + 1 },
      (_, index) => 2025 + index
    ).reverse();
  }, [yearOptions]);

  const selectedMonthLabel = MONTH_OPTIONS.find((item) => item.value === month)?.label || 'Pilih bulan';

  const openPicker = (nextField: PeriodField) => {
    setField(nextField);
    setVisible(true);
  };

  const closePicker = () => setVisible(false);

  return (
    <View style={style}>
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1 pr-3">
          <Text className="font-manrope-bold text-base text-primary">{title}</Text>
          <Text className="font-inter text-xs text-text-muted mt-0.5">{subtitle}</Text>
        </View>
        <View className="bg-primary/10 px-3 py-1.5 rounded-full">
          <Text className="font-inter-bold text-[10px] text-primary">{selectedMonthLabel} {year}</Text>
        </View>
      </View>

      <View className="flex-row gap-3">
        <Pressable
          testID="period-selector-month-trigger"
          className="flex-1 px-4 py-3 rounded-2xl bg-white/80 border border-white/90 shadow-sm"
          onPress={() => openPicker('month')}
        >
          <Text className="font-inter-bold text-[10px] text-text-muted uppercase tracking-wider">Bulan</Text>
          <View className="flex-row items-center justify-between mt-1">
            <Text testID="period-selector-month-value" className="font-inter-bold text-sm text-on-surface">
              {selectedMonthLabel}
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color={Tokens.colors.textMuted} />
          </View>
        </Pressable>

        <Pressable
          testID="period-selector-year-trigger"
          className="flex-1 px-4 py-3 rounded-2xl bg-white/80 border border-white/90 shadow-sm"
          onPress={() => openPicker('year')}
        >
          <Text className="font-inter-bold text-[10px] text-text-muted uppercase tracking-wider">Tahun</Text>
          <View className="flex-row items-center justify-between mt-1">
            <Text testID="period-selector-year-value" className="font-inter-bold text-sm text-on-surface">
              {String(year)}
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color={Tokens.colors.textMuted} />
          </View>
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={visible}
        onRequestClose={closePicker}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <Pressable className="absolute inset-0" onPress={closePicker} />
          <View className="bg-background rounded-t-[28px] p-5 max-h-[70%]">
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="font-manrope-bold text-xl text-primary">
                  Pilih {field === 'month' ? 'Bulan' : 'Tahun'}
                </Text>
                <Text className="font-inter text-xs text-text-muted">
                  {field === 'month' ? 'Pilih bulan untuk periode' : 'Pilih tahun untuk periode'}
                </Text>
              </View>
              <Pressable onPress={closePicker} className="w-9 h-9 rounded-full bg-black/5 items-center justify-center">
                <MaterialIcons name="close" size={18} color={Tokens.colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {field === 'month' ? (
                MONTH_OPTIONS.map((option) => {
                  const active = option.value === month;
                  return (
                    <Pressable
                      key={option.value}
                      testID={`period-selector-month-${option.value}`}
                      onPress={() => {
                        onMonthChange(option.value);
                        closePicker();
                      }}
                      className={`px-4 py-3 rounded-xl mb-2 ${active ? 'bg-primary/5 border border-primary' : 'bg-[#f8f8f8]'}`}
                    >
                      <Text className={`font-inter-bold text-sm ${active ? 'text-primary' : 'text-on-surface'}`}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })
              ) : (
                resolvedYearOptions.map((option) => {
                  const active = option === year;
                  return (
                    <Pressable
                      key={option}
                      testID={`period-selector-year-${option}`}
                      onPress={() => {
                        onYearChange(option);
                        closePicker();
                      }}
                      className={`px-4 py-3 rounded-xl mb-2 ${active ? 'bg-primary/5 border border-primary' : 'bg-[#f8f8f8]'}`}
                    >
                      <Text className={`font-inter-bold text-sm ${active ? 'text-primary' : 'text-on-surface'}`}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

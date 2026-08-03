import React from 'react';
import { Pressable, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  onToggle: () => void;
  rows: { label: string; value: string }[];
};

export function BootDebugOverlay({ visible, onToggle, rows }: Props) {
  if (!visible) {
    return (
      <Pressable
        onPress={onToggle}
        style={{
          position: 'absolute',
          top: 48,
          right: 12,
          zIndex: 9999,
          backgroundColor: '#000666',
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>DBG</Text>
      </Pressable>
    );
  }

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 48,
        right: 12,
        zIndex: 9999,
        width: 220,
        backgroundColor: 'rgba(0, 6, 102, 0.92)',
        borderRadius: 14,
        padding: 12,
      }}
    >
      <Pressable onPress={onToggle} style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>HIDE</Text>
      </Pressable>
      {rows.map((row) => (
        <Text key={row.label} style={{ color: '#fff', fontSize: 11, lineHeight: 16, marginBottom: 4 }}>
          {row.label}: {row.value}
        </Text>
      ))}
    </View>
  );
}

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tokens } from '../src/core/theme/tokens';

export default function LeaveScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Leave (Cuti)</Text>
        <Text style={styles.subtitle}>Screen leave siap. Next kita isi saldo per tipe + create request.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Tokens.colors.background },
  content: { flex: 1, padding: 20 },
  title: { fontFamily: 'Manrope_700Bold', fontSize: 24, color: Tokens.colors.text },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Tokens.colors.textMuted, marginTop: 8 },
});

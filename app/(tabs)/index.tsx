import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Tokens } from '../../src/core/theme/tokens';
import { useAuthStore } from '../../src/stores/auth.store';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const name = user?.full_name || 'Employee';
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeText = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateText = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.role}>Senior Developer</Text>
          </View>
          <View style={styles.clockedOutChip}>
            <Text style={styles.clockedOutText}>Clocked Out</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.timeText}>{timeText}</Text>
          <Text style={styles.dateText}>{dateText}</Text>
          <Pressable style={styles.scanButton} onPress={() => router.push('/attendance')}>
            <MaterialIcons name="qr-code-scanner" size={44} color="#fff" />
            <Text style={styles.scanText}>Scan QR Code</Text>
          </Pressable>
        </View>

        <View style={styles.grid}>
          {[
            ['event-available', 'Leave (Cuti)', 'Sisa: 12 Hari'],
            ['work-history', 'Overtime', 'Request/history'],
            ['payments', 'Payroll', 'Preview Payslip'],
            ['list-alt', 'History', 'Attendance log'],
          ].map(([icon, title, subtitle]) => (
            <View key={title} style={styles.card}>
              <View style={styles.cardIcon}>
                <MaterialIcons name={icon as any} size={20} color={Tokens.colors.primary} />
              </View>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardSub}>{subtitle}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Tokens.colors.background },
  content: { padding: 20, paddingBottom: 120, gap: 18 },
  topBar: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { fontFamily: 'Manrope_700Bold', fontSize: 14, color: Tokens.colors.primary },
  role: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Tokens.colors.textMuted, marginTop: 2 },
  clockedOutChip: { backgroundColor: '#ffdad6', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  clockedOutText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#93000a' },
  hero: { alignItems: 'center', paddingTop: 8 },
  timeText: { fontFamily: 'Manrope_800ExtraBold', fontSize: 48, color: Tokens.colors.primary, lineHeight: 52 },
  dateText: { fontFamily: 'Inter_500Medium', fontSize: 16, color: Tokens.colors.textMuted, marginTop: 4, marginBottom: 14 },
  scanButton: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: Tokens.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  scanText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 6, 102, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardTitle: { fontFamily: 'Inter_700Bold', fontSize: 12, color: Tokens.colors.text },
  cardSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Tokens.colors.textMuted, marginTop: 4 },
});

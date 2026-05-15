import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth.store';
import { Tokens } from '../../src/core/theme/tokens';
import { Button } from '../../src/components/ui/Button';

export default function DashboardScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome,</Text>
        <Text style={styles.name}>{user?.full_name || 'Employee'}</Text>
        <Text style={styles.subtitle}>You have successfully logged in.</Text>
        
        <View style={styles.footer}>
          <Button title="Logout" onPress={handleLogout} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Tokens.colors.background },
  content: { padding: Tokens.spacing.page, flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontFamily: 'Manrope_800ExtraBold', fontSize: 24, color: Tokens.colors.text },
  name: { fontFamily: 'Manrope_800ExtraBold', fontSize: 32, color: Tokens.colors.primary, marginTop: 4 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 16, color: Tokens.colors.outline, marginTop: 8, marginBottom: 40 },
  footer: { width: '100%' }
});

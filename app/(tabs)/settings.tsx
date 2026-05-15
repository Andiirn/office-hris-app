import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Tokens } from '../../src/core/theme/tokens';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your application preferences.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Tokens.colors.background,
  },
  content: {
    padding: Tokens.spacing.page,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 24,
    color: Tokens.colors.text,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Tokens.colors.outline,
    marginTop: 8,
    textAlign: 'center',
  },
});

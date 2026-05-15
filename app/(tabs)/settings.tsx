import React from 'react';
import { View, Text, ScrollView, Switch, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tokens } from '../../src/core/theme/tokens';
import { GlassCard } from '../../src/components/ui/GlassCard';

export default function SettingsScreen() {
  const [notifEnabled, setNotifEnabled] = React.useState(true);
  const [biometricEnabled, setBiometricEnabled] = React.useState(false);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-2 pb-5">
        <Text className="font-manrope-extrabold text-3xl text-primary">Settings</Text>
        <Text className="font-inter-medium text-sm text-text-muted mt-0.5">App preferences</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
        <Text className="font-manrope-bold text-lg text-primary mb-4 ml-1">Notifications</Text>
        <GlassCard style={{ padding: 0, marginBottom: 24 }}>
          <View className="flex-row items-center justify-between p-4 border-b border-black/5">
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-lg bg-primary/5 items-center justify-center mr-4">
                <MaterialIcons name="notifications" size={18} color={Tokens.colors.primary} />
              </View>
              <Text className="font-inter-bold text-sm text-black">Push Notifications</Text>
            </View>
            <Switch 
              value={notifEnabled} 
              onValueChange={setNotifEnabled} 
              trackColor={{ true: Tokens.colors.primary, false: Tokens.colors.outline }}
            />
          </View>
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-lg bg-primary/5 items-center justify-center mr-4">
                <MaterialIcons name="email" size={18} color={Tokens.colors.primary} />
              </View>
              <Text className="font-inter-bold text-sm text-black">Email Updates</Text>
            </View>
            <Switch value={true} trackColor={{ true: Tokens.colors.primary }} />
          </View>
        </GlassCard>

        <Text className="font-manrope-bold text-lg text-primary mb-4 ml-1">Security</Text>
        <GlassCard style={{ padding: 0, marginBottom: 24 }}>
          <View className="flex-row items-center justify-between p-4 border-b border-black/5">
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-lg bg-primary/5 items-center justify-center mr-4">
                <MaterialIcons name="fingerprint" size={18} color={Tokens.colors.primary} />
              </View>
              <Text className="font-inter-bold text-sm text-black">Biometric Login</Text>
            </View>
            <Switch 
              value={biometricEnabled} 
              onValueChange={setBiometricEnabled}
              trackColor={{ true: Tokens.colors.primary }}
            />
          </View>
          <Pressable className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-lg bg-primary/5 items-center justify-center mr-4">
                <MaterialIcons name="lock" size={18} color={Tokens.colors.primary} />
              </View>
              <Text className="font-inter-bold text-sm text-black">Change Password</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Tokens.colors.outline} />
          </Pressable>
        </GlassCard>

        <Text className="font-manrope-bold text-lg text-primary mb-4 ml-1">App Info</Text>
        <GlassCard style={{ padding: 16, alignItems: 'center' }}>
          <Text className="font-inter-medium text-xs text-text-muted">Version 1.0.0 (Build 20260516)</Text>
          <Text className="font-inter-medium text-[10px] text-text-muted mt-1">© 2026 HRIS Mobile App</Text>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

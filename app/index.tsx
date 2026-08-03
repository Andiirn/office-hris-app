import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/stores/auth.store';

export default function RootIndex() {
  const { isLoggedIn, isInitialized } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized) {
      if (isLoggedIn) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [isInitialized, isLoggedIn, router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#FBFAF8', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: 'Manrope_700Bold', color: '#003366' }}>
        Initialising...
      </Text>
    </View>
  );
}

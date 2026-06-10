import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/stores/auth.store';

export default function RootIndex() {
  const { isLoggedIn, isInitialized } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized) {
      console.log('[RootIndex] Initialized. isLoggedIn:', isLoggedIn);
      // Small delay to prevent race conditions during Fabric initial commit
      const timer = setTimeout(() => {
        if (isLoggedIn) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isInitialized, isLoggedIn]);

  return (
    <View style={{ flex: 1, backgroundColor: '#FBFAF8', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: 'Manrope_700Bold', color: '#003366' }}>
        Initialising...
      </Text>
    </View>
  );
}

// app/_layout.tsx
import './../src/core/theme/global.css';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  useFonts, 
  Manrope_800ExtraBold, 
  Manrope_700Bold 
} from '@expo-google-fonts/manrope';
import { 
  Inter_400Regular, 
  Inter_700Bold 
} from '@expo-google-fonts/inter';
import { sessionManager } from '../src/core/auth/session-manager';
import { useAuthStore } from '../src/stores/auth.store';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

export default function RootLayout() {
  const { isInitialized, isLoggedIn } = useAuthStore();
  const [loaded, error] = useFonts({
    Manrope_800ExtraBold,
    Manrope_700Bold,
    Inter_400Regular,
    Inter_700Bold,
  });

  useEffect(() => {
    console.log('[RootLayout] Status:', { isInitialized, isLoggedIn, fontsLoaded: loaded });
  }, [isInitialized, isLoggedIn, loaded]);

  useEffect(() => {
    sessionManager.initialize();
  }, []);

  useEffect(() => {
    if ((loaded || error) && isInitialized) {
      // Small delay before hiding splash to allow layout to settle
      const timer = setTimeout(() => {
        console.log('[RootLayout] Hiding Splash Screen');
        SplashScreen.hideAsync().catch(() => {});
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loaded, error, isInitialized]);

  if ((!loaded && !error) || !isInitialized) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="approvals" options={{ headerShown: false }} />
        <Stack.Screen name="leave" options={{ headerShown: false }} />
        <Stack.Screen name="overtime" options={{ headerShown: false }} />
        <Stack.Screen name="payroll" options={{ headerShown: false }} />
        <Stack.Screen name="resign" options={{ headerShown: false }} />
        <Stack.Screen name="attendance-scan" options={{ headerShown: false }} />
        <Stack.Screen name="visit" options={{ headerShown: false }} />
        <Stack.Screen name="activity" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}

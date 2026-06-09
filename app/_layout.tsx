// app/_layout.tsx
import './../src/core/theme/global.css';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';
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

// Interop for components that don't support className by default
cssInterop(SafeAreaView, {
  className: 'style',
});

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes default
    },
  },
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Manrope_800ExtraBold,
    Manrope_700Bold,
    Inter_400Regular,
    Inter_700Bold,
  });
  const [isSessionLoaded, setIsSessionLoaded] = React.useState(false);

  useEffect(() => {
    async function initSession() {
      try {
        await sessionManager.initialize();
      } catch (err) {
        console.error('[RootLayout] Session initialization failed:', err);
      } finally {
        setIsSessionLoaded(true);
      }
    }
    initSession();
  }, []);

  useEffect(() => {
    if ((loaded || error) && isSessionLoaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error, isSessionLoaded]);

  if ((!loaded && !error) || !isSessionLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}

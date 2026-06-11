// app/_layout.tsx
import './../src/core/theme/global.css';
import { Stack } from 'expo-router';
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundaryProps, useRouter, useSegments } from 'expo-router';
import { Alert, Text, View, Pressable, AppState, AppStateStatus, Platform } from 'react-native';
import { queryClient } from '../src/core/api/query-client';
import React, { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
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
import { NotificationManager } from '../src/core/notifications/notification-manager';

SplashScreen.preventAutoHideAsync();

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log error to console for adb logcat visibility
    console.error('[CRITICAL_STARTUP_ERROR]', error);
  }, [error]);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#93000a', marginBottom: 10 }}>Oops! Terjadi Kesalahan</Text>
      <Text style={{ fontSize: 14, color: '#444', textAlign: 'center', marginBottom: 20 }}>{error.message}</Text>
      <Pressable onPress={retry} style={{ backgroundColor: '#003366', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Coba Lagi</Text>
      </Pressable>
    </View>
  );
}

function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

export default function RootLayout() {
  const { isInitialized, isLoggedIn, bootstrapError, setBootstrapError } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  
  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  const [loaded, error] = useFonts({
    Manrope_800ExtraBold,
    Manrope_700Bold,
    Inter_400Regular,
    Inter_700Bold,
  });

  useEffect(() => {
    sessionManager.initialize();
  }, []);

  const handleRetryBootstrap = React.useCallback(() => {
    setBootstrapError(null);
    sessionManager.initialize();
  }, [setBootstrapError]);

  useEffect(() => {
    if (isInitialized) {
      const inAuthGroup = segments[0] === '(auth)';

      if (!isLoggedIn && !inAuthGroup) {
        // Redirect to login if not logged in and not in auth group
        router.replace('/(auth)/login');
      } else if (isLoggedIn && inAuthGroup) {
        // Redirect to tabs if logged in and in auth group
        router.replace('/(tabs)');
      }
    }
  }, [isInitialized, isLoggedIn, segments]);

  useEffect(() => {
    if (isLoggedIn) {
      // Register for push notifications and retrieve token
      NotificationManager.registerForPushNotificationsAsync().then((token) => {
        if (token) {
          console.log('[RootLayout] Device Push Token:', token);
        }
      });

      // Set up foreground & background/click listeners
      const cleanup = NotificationManager.setupNotificationListeners(
        (notification) => {
          // Invalidate queries to auto-refresh state (e.g. badge count or approvals list)
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['approvals'] });
        },
        (response) => {
          // Route user to a specific screen if payload contains screen name
          const data = response.notification.request.content.data;
          if (data && data.screen) {
            router.push(data.screen as any);
          }
        }
      );

      return () => cleanup();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if ((loaded || error) && isInitialized) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error, isInitialized]);

  if ((!loaded && !error) || !isInitialized) {
    return null;
  }

  if (!isLoggedIn && bootstrapError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fbf9f8', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#000666', marginBottom: 8 }}>Tidak bisa memuat sesi</Text>
        <Text style={{ fontSize: 14, color: '#454652', textAlign: 'center', marginBottom: 20 }}>
          {bootstrapError}
        </Text>
        <Pressable onPress={handleRetryBootstrap} style={{ backgroundColor: '#000666', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Coba Lagi</Text>
        </Pressable>
      </View>
    );
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
        <Stack.Screen name="correction" options={{ headerShown: false }} />
        <Stack.Screen name="activity" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}

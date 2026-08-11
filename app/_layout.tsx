// app/_layout.tsx
import {
  Inter_400Regular,
  Inter_700Bold
} from '@expo-google-fonts/inter';
import {
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts
} from '@expo-google-fonts/manrope';
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundaryProps, Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform, Pressable, Text, View } from 'react-native';
import { queryClient } from '../src/core/api/query-client';
import { sessionManager } from '../src/core/auth/session-manager';
import { qk } from '../src/core/query/query-keys';
import { notificationIntent, resolveNotificationRoute } from '../src/utils/notification-router';
import { notificationService } from '../src/services/notification.service';
import { useAuthStore } from '../src/stores/auth.store';
// import { BootDebugOverlay } from '../src/components/debug/BootDebugOverlay';
import './../src/core/theme/global.css';

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

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function OfflineBanner() {
  const { isOffline, isLoggedIn } = useAuthStore();
  const insets = useSafeAreaInsets();

  if (!isOffline || !isLoggedIn) {
    return null;
  }

  return (
    <View
      style={{ paddingTop: Math.max(insets.top, 8), paddingBottom: 8 }}
      className="bg-amber-600 px-4 flex-row items-center justify-center gap-2 z-50 shadow-sm"
    >
      <MaterialIcons name="wifi-off" size={16} color="#ffffff" />
      <Text className="font-inter-bold text-xs text-white text-center">
        Anda sedang dalam mode offline.
      </Text>
    </View>
  );
}

function RootLayoutNav() {
  const { isInitialized, isLoggedIn, hasSeenOnboarding, checkOnboarding, bootstrapError, setBootstrapError, isOffline } = useAuthStore();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();
  const router = useRouter();
  const handledNotificationIdRef = useRef<string | null>(null);
  const pendingNotificationResponseRef = useRef<Notifications.NotificationResponse | null>(null);
  const pendingNotificationRouteRef = useRef<string | null>(null);
  const [debugOverlayVisible, setDebugOverlayVisible] = React.useState(true);
  const navigationReady = !!rootNavigationState?.key;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, [checkOnboarding]);

  const [loaded, error] = useFonts({
    Manrope_800ExtraBold,
    Manrope_700Bold,
    Inter_400Regular,
    Inter_700Bold,
  });

  useEffect(() => {
    sessionManager.initialize();
    checkOnboarding();
  }, [checkOnboarding]);

  const handleRetryBootstrap = React.useCallback(() => {
    setBootstrapError(null);
    sessionManager.initialize();
    checkOnboarding();
  }, [setBootstrapError, checkOnboarding]);

  useEffect(() => {
    if (!navigationReady) {
      return;
    }

    const pendingRoute = pendingNotificationRouteRef.current ?? notificationIntent.peek();
    if (pendingRoute) {
      return;
    }

    if (isInitialized && hasSeenOnboarding !== null) {
      if (hasSeenOnboarding === false) {
        if (segments[0] !== 'onboarding') {
          router.replace('/onboarding');
        }
      } else {
        const inAuthGroup = segments[0] === '(auth)';

        if (!isLoggedIn && !inAuthGroup) {
          // Redirect to login if not logged in and not in auth group
          router.replace('/(auth)/login');
        } else if (isLoggedIn && inAuthGroup) {
          // Redirect to tabs if logged in and in auth group
          router.replace('/(tabs)');
        }
      }
    }
  }, [isInitialized, isLoggedIn, hasSeenOnboarding, segments, router, navigationReady]);

  useEffect(() => {
    if (isLoggedIn) {
      let cleanup: (() => void) | undefined;
      let cancelled = false;

      const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
        const notificationId = response.notification.request.identifier;
        if (handledNotificationIdRef.current === notificationId) {
          return;
        }
        handledNotificationIdRef.current = notificationId;

        const route = resolveNotificationRoute(response.notification.request.content.data);
        if (route) {
          pendingNotificationRouteRef.current = route;
          notificationIntent.set(route);
        }
      };

      (async () => {
        let NotificationManager;
        try {
          ({ NotificationManager } = await import('../src/core/notifications/notification-manager'));
        } catch (error) {
          console.warn('[RootLayout] Notification setup skipped:', error);
          return;
        }
        if (cancelled) {
          return;
        }

        // Register for push notifications and retrieve token
        NotificationManager.registerForPushNotificationsAsync().then((token) => {
          if (token) {
            console.log('[RootLayout] Device Push Token:', token);
            // Sync token with backend
            notificationService.saveDeviceToken(token);
          }
        });

        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) {
          pendingNotificationResponseRef.current = lastResponse;
        }

        // Set up foreground & background/click listeners
        cleanup = NotificationManager.setupNotificationListeners(
          () => {
            // Invalidate queries to auto-refresh state (e.g. badge count or approvals list)
            queryClient.invalidateQueries({ queryKey: qk.notificationsRoot() });
            queryClient.invalidateQueries({ queryKey: qk.homeApprovalsRoot() });
          },
          handleNotificationResponse
        );

        if (pendingNotificationResponseRef.current) {
          handleNotificationResponse(pendingNotificationResponseRef.current);
          pendingNotificationResponseRef.current = null;
        }
      })();

      return () => {
        cancelled = true;
        cleanup?.();
      };
    }
  }, [isLoggedIn, router]);

  useEffect(() => {
    if ((loaded || error) && isInitialized && hasSeenOnboarding !== null) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [loaded, error, isInitialized, hasSeenOnboarding]);

  useEffect(() => {
    if (!navigationReady || !isInitialized || !isLoggedIn) {
      return;
    }

    const pendingRoute = pendingNotificationRouteRef.current ?? notificationIntent.peek();
    if (!pendingRoute) {
      return;
    }

    pendingNotificationRouteRef.current = null;
    notificationIntent.consume();
    router.push(pendingRoute as any);
  }, [navigationReady, isInitialized, isLoggedIn, router]);

  if ((!loaded && !error) || !isInitialized || hasSeenOnboarding === null) {
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
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/reset-password" options={{ headerShown: false }} />
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
      {/* <BootDebugOverlay
        visible={debugOverlayVisible}
        onToggle={() => setDebugOverlayVisible((current) => !current)}
        rows={[
          { label: 'init', value: String(isInitialized) },
          { label: 'login', value: String(isLoggedIn) },
          { label: 'onboard', value: String(hasSeenOnboarding) },
          { label: 'nav', value: String(navigationReady) },
          { label: 'seg', value: segments.join('/') || '-' },
          { label: 'intent', value: notificationIntent.peek() ?? '-' },
          { label: 'pending', value: String(!!pendingNotificationResponseRef.current) },
          { label: 'target', value: pendingNotificationRouteRef.current ?? '-' },
        ]}
      /> */}
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  );
}

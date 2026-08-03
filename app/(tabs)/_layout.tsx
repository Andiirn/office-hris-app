import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Redirect, router, Tabs, useRootNavigationState } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { notificationIntent } from '../../src/utils/notification-router';
import { Tokens } from '../../src/core/theme/tokens';
import { useAuthStore } from '../../src/stores/auth.store';

export default function TabLayout() {
  const { isLoggedIn, isInitialized } = useAuthStore();
  const rootNavigationState = useRootNavigationState();
  const navigationReady = !!rootNavigationState?.key;

  useEffect(() => {
    if (!navigationReady || !isLoggedIn) {
      return;
    }

    const pendingRoute = notificationIntent.peek();
    if (!pendingRoute) {
      return;
    }

    notificationIntent.consume();
    router.push(pendingRoute as any);
  }, [navigationReady, isLoggedIn]);

  console.log('[TabLayout] Render:', { isLoggedIn, isInitialized });

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Tokens.colors.primary,
        tabBarInactiveTintColor: Tokens.colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false, // Correct way to hide labels
        tabBarBackground: () => <View style={styles.tabBarBackground} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <MaterialIcons name="home-filled" size={24} color={focused ? '#ffffff' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <MaterialIcons name="calendar-today" size={24} color={focused ? '#ffffff' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Scan',
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start' }}>
              <Pressable
                onPress={() => router.push('/attendance-scan')}
                style={styles.fabButton}
              >
                <View style={styles.fabInner}>
                  <MaterialIcons name="qr-code-scanner" size={28} color="#fff" />
                </View>
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <MaterialIcons name="notifications" size={24} color={focused ? '#ffffff' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <MaterialIcons name="person" size={24} color={focused ? '#ffffff' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="attendance" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    height: 82,
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: 'rgba(251, 249, 248, 1)',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      }
    })
  },
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(251, 249, 248, 1)',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconContainerActive: {
    backgroundColor: Tokens.colors.primary,
  },
  fabButton: {
    top: -24,
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Tokens.colors.surface,
    padding: 6,
    ...Platform.select({
      ios: {
        shadowColor: Tokens.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      }
    }),
  },
  fabInner: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: Tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

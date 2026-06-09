import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Tokens } from '../../src/core/theme/tokens';
import { useAuthStore } from '../../src/stores/auth.store';

export default function TabLayout() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: Tokens.colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarBackground: () => <View style={styles.tabBarBackground} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? Tokens.colors.primary : 'transparent',
              }}
            >
              <MaterialIcons name="home-filled" size={size} color={focused ? '#ffffff' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: '',
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? Tokens.colors.primary : 'transparent',
              }}
            >
              <MaterialIcons name="calendar-today" size={size} color={focused ? '#ffffff' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: '',
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? Tokens.colors.primary : 'transparent',
              }}
            >
              <MaterialIcons name="notifications" size={size} color={focused ? '#ffffff' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '',
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? Tokens.colors.primary : 'transparent',
              }}
            >
              <MaterialIcons name="person" size={size} color={focused ? '#ffffff' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '',
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? Tokens.colors.primary : 'transparent',
              }}
            >
              <MaterialIcons name="settings" size={size} color={focused ? '#ffffff' : color} />
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
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginHorizontal: 0,
    marginBottom: 0,
    backgroundColor: 'rgba(251, 249, 248, 1)',
    borderWidth: 0,
    paddingTop: 8,
    paddingBottom: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      },
      android: {
        elevation: 2,
      }
    })
  },
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(251, 249, 248, 1)',
  },
  label: {
    fontSize: 0,
    height: 0,
    marginBottom: 0,
    marginTop: 0,
    opacity: 0,
  },
});

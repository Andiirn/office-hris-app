import React from 'react';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Home, Scan, Bell, User } from 'lucide-react-native';
import { StyleSheet, Platform } from 'react-native';
import { Tokens } from '../../src/core/theme/tokens';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Tokens.colors.primary,
        tabBarInactiveTintColor: Tokens.colors.outline,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: {
          fontFamily: 'Inter_700Bold',
          fontSize: 10,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint="light"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
              },
            ]}
          />
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color, size }) => <Scan size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 0,
    elevation: 0,
    height: 80,
    ...Platform.select({
      ios: {
        backgroundColor: 'transparent',
      },
      android: {
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
      },
    }),
  },
});

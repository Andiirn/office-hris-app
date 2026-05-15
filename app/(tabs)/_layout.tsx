import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Home, Calendar, User, Settings } from 'lucide-react-native';
import { Tokens } from '../../src/core/theme/tokens';
import React from 'react';
import { StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView intensity={80} style={styles.blur} tint="light" />
        ),
        tabBarActiveTintColor: Tokens.colors.primary,
        tabBarInactiveTintColor: Tokens.colors.outline,
        tabBarLabelStyle: styles.label,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <Calendar color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings color={color} size={24} />,
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
    borderTopLeftRadius: Tokens.radius.xl,
    borderTopRightRadius: Tokens.radius.xl,
    overflow: 'hidden',
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Tokens.colors.white80,
  },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    marginBottom: 8,
  },
});

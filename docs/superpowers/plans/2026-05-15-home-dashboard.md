# Home Dashboard & Tab Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a modern, glassmorphic Home dashboard and a 4-tab navigation system following `home.md` and `DESIGN.md`.

**Architecture:** Tab layout in `app/(tabs)/_layout.tsx`, Home screen in `app/(tabs)/index.tsx`, and new UI components in `src/components/ui`.

**Tech Stack:** Expo Router, Expo Blur (or semi-transparent Fallback), Lucide React Native (or Expo Symbols).

---

### Task 1: Setup Tab Navigation Structure

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/attendance.tsx`
- Create: `app/(tabs)/notifications.tsx`
- Create: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Install Lucide React Native for consistent icons**
Run: `npm install lucide-react-native`

- [ ] **Step 2: Update Tab Layout with Glassmorphism**
```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Home, Scan, Bell, User } from 'lucide-react-native';
import { Tokens } from '../../src/core/theme/tokens';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { position: 'absolute', borderTopWidth: 0, elevation: 0, height: 80 },
        tabBarBackground: () => (
          <BlurView intensity={80} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.8)' }} />
        ),
        tabBarActiveTintColor: Tokens.colors.primary,
        tabBarInactiveTintColor: Tokens.colors.outline,
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Home color={color} size={24} /> }} />
      <Tabs.Screen name="attendance" options={{ title: 'Attendance', tabBarIcon: ({ color }) => <Scan color={color} size={24} /> }} />
      <Tabs.Screen name="notifications" options={{ title: 'Inbox', tabBarIcon: ({ color }) => <Bell color={color} size={24} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <User color={color} size={24} /> }} />
    </Tabs>
  );
}
```

- [ ] **Step 3: Create stub screens for new tabs**
Create `app/(tabs)/attendance.tsx`, `notifications.tsx`, and `profile.tsx` with basic placeholders.

- [ ] **Step 4: Commit**
```bash
git add package.json app/(tabs)/_layout.tsx app/(tabs)/attendance.tsx app/(tabs)/notifications.tsx app/(tabs)/profile.tsx
git commit -m "feat: setup glassmorphic tab navigation structure"
```

---

### Task 2: Home Dashboard UI Atoms

**Files:**
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/ActionIcon.tsx`

- [ ] **Step 1: Create Surface Card with Soft Shadow**
```tsx
// src/components/ui/Card.tsx
import { View, StyleSheet } from 'react-native';
import { Tokens } from '../../core/theme/tokens';

export const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Tokens.colors.surface,
    borderRadius: Tokens.radius.lg,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
});
```

- [ ] **Step 2: Create ActionIcon for Grid**
```tsx
// src/components/ui/ActionIcon.tsx
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Tokens } from '../../core/theme/tokens';

export const ActionIcon = ({ icon: Icon, label, color }) => (
  <TouchableOpacity style={styles.container}>
    <View style={[styles.iconBox, { backgroundColor: color + '1A' }]}>
      <Icon color={color} size={24} />
    </View>
    <Text style={styles.label}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: '25%' },
  iconBox: { padding: 12, borderRadius: 12, marginBottom: 8 },
  label: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Tokens.colors.text },
});
```

- [ ] **Step 3: Commit**
```bash
git add src/components/ui/Card.tsx src/components/ui/ActionIcon.tsx
git commit -m "feat: add dashboard ui atoms (card, actionicon)"
```

---

### Task 3: Home Dashboard Screen Implementation

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Rebuild Home Screen Layout**
```tsx
// app/(tabs)/index.tsx (Partial)
import { ScrollView, View, Text, StyleSheet, Image } from 'react-native';
import { Card } from '../../src/components/ui/Card';
import { ActionIcon } from '../../src/components/ui/ActionIcon';
import { Briefcase, Clock, FileText, LogOut } from 'lucide-react-native';

export default function HomeScreen() {
  const { user } = useAuthStore();
  
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good Morning,</Text>
          <Text style={styles.name}>{user?.full_name}</Text>
        </View>
        <Image source={{ uri: 'https://ui-avatars.com/api/?name=' + user?.full_name }} style={styles.avatar} />
      </View>

      {/* Main Stats Card */}
      <Card style={styles.mainCard}>
        <Text style={styles.cardTitle}>Attendance Status</Text>
        <Text style={styles.cardStatus}>Not Clocked In</Text>
        <View style={styles.clockContainer}>
           <Text style={styles.time}>08:00 AM</Text>
        </View>
      </Card>

      {/* Quick Actions Grid */}
      <View style={styles.grid}>
        <ActionIcon icon={Briefcase} label="Leave" color="#4c56af" />
        <ActionIcon icon={Clock} label="Overtime" color="#e17c5a" />
        <ActionIcon icon={FileText} label="Payroll" color="#556158" />
        <ActionIcon icon={LogOut} label="Resign" color="#ba1a1a" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Tokens.colors.background, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 60, marginBottom: 24 },
  greeting: { fontFamily: 'Inter_400Regular', fontSize: 16, color: Tokens.colors.outline },
  name: { fontFamily: 'Manrope_800ExtraBold', fontSize: 24, color: Tokens.colors.text },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  mainCard: { marginBottom: 24 },
  cardTitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Tokens.colors.outline },
  cardStatus: { fontFamily: 'Manrope_700Bold', fontSize: 20, color: Tokens.colors.primary, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingVertical: 20 }
});
```

- [ ] **Step 2: Commit**
```bash
git add app/(tabs)/index.tsx
git commit -m "feat: implement home dashboard screen layout"
```

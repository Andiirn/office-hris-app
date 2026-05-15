# Refined Home Dashboard & Tab Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the refined, glassmorphic Home dashboard and 4-tab navigation (Home, Calendar, Profile, Settings) following the provided HTML mock and design specifications.

**Architecture:** Tab layout in `app/(tabs)/_layout.tsx`, Home screen in `app/(tabs)/index.tsx`, and new UI components in `src/components/ui`.

**Tech Stack:** Expo Router, Expo Blur, Lucide React Native.

---

### Task 1: Update Theme Tokens

**Files:**
- Modify: `src/core/theme/tokens.ts`

- [ ] **Step 1: Update tokens with new colors from mock**
```typescript
// src/core/theme/tokens.ts
export const Tokens = {
  colors: {
    primary: '#000666',
    primaryContainer: '#1a237e', // primary-container from mock
    onPrimaryContainer: '#8690ee',
    background: '#fbf9f8',
    surface: '#ffffff',
    onSurface: '#1b1c1c',
    onSurfaceVariant: '#454652',
    outline: '#767683',
    error: '#ba1a1a',
    errorContainer: '#ffdad6',
    onErrorContainer: '#93000a',
    secondaryContainer: '#d9e6da',
    onSecondaryContainer: '#5b675e',
    tertiaryFixed: '#ffdbd0',
    onTertiaryContainer: '#e17c5a',
    surfaceContainerHighest: '#e4e2e1',
    inputBackground: '#f0eded',
    white20: 'rgba(255, 255, 255, 0.2)',
    white80: 'rgba(255, 255, 255, 0.8)',
  },
  spacing: {
    page: 20,
    stackSm: 8,
    stackMd: 16,
    stackLg: 24,
  },
  radius: {
    lg: 16,
    xl: 24,
    full: 9999,
  }
};
```

- [ ] **Step 2: Commit**
```bash
git add src/core/theme/tokens.ts
git commit -m "chore: update theme tokens with refined color palette"
```

---

### Task 2: Refined Tab Navigation Structure

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/calendar.tsx`
- Create: `app/(tabs)/settings.tsx`
- Delete: `app/(tabs)/attendance.tsx`
- Delete: `app/(tabs)/notifications.tsx`

- [ ] **Step 1: Update Tab Layout with new names and icons**
Modify `app/(tabs)/_layout.tsx`:
- Tabs: `index` (Home), `calendar` (Calendar), `profile` (Profile), `settings` (Settings).
- Icons: `Home`, `Calendar`, `User`, `Settings` from Lucide.
- Tab bar style: `BlurView` with `white80`, `80px` height, rounded top (`24px`).

- [ ] **Step 2: Create new stub screens**
Create `app/(tabs)/calendar.tsx` and `app/(tabs)/settings.tsx`.

- [ ] **Step 3: Commit**
```bash
git add app/(tabs)/_layout.tsx app/(tabs)/calendar.tsx app/(tabs)/settings.tsx
git commit -m "feat: update tab navigation to Home, Calendar, Profile, Settings"
```

---

### Task 4: Home Dashboard Refinement

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Create: `src/components/ui/GlassCard.tsx`
- Create: `src/components/ui/StatusBadge.tsx`

- [ ] **Step 1: Create GlassCard component**
```tsx
// src/components/ui/GlassCard.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Tokens } from '../../core/theme/tokens';

export const GlassCard = ({ children, style }) => (
  <View style={[styles.container, style]}>
    <BlurView intensity={20} style={styles.blur}>
      <View style={styles.content}>{children}</View>
    </BlurView>
  </View>
);

const styles = StyleSheet.create({
  container: {
    borderRadius: Tokens.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Tokens.colors.white20,
  },
  blur: { backgroundColor: 'rgba(255, 255, 255, 0.4)' },
  content: { padding: 16 },
});
```

- [ ] **Step 2: Implement Refined Home Layout**
Modify `app/(tabs)/index.tsx`:
- **Top Header:** Fixed at top, glass effect, profile avatar, name, "Clocked Out" badge.
- **Hero:** Large clock (`Manrope_800ExtraBold`, 48px), date below.
- **Scan Button:** Large circular button (`w-48` equivalent, `192px`), primary-container color.
- **Shift Card:** `GlassCard` with schedule (08:00 - 17:00).
- **Grid:** Leave (sisa 12 hari), Overtime, Payroll, History.
- **Activity Feed:** List of recent logs with colored icons.

- [ ] **Step 3: Commit**
```bash
git add app/(tabs)/index.tsx src/components/ui/GlassCard.tsx src/components/ui/StatusBadge.tsx
git commit -m "feat: implement refined home dashboard layout matching mock"
```

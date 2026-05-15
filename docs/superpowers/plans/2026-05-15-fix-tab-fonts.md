# Fix Font Usage in Tab Screens

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure consistent font usage across all tab screens and the tab bar by applying the correct typography families.

**Architecture:** Update React Native `StyleSheet` definitions in screen components and `Tabs.screenOptions` in the layout component to use loaded custom fonts.

**Tech Stack:** React Native, Expo Router, Expo Google Fonts (Manrope, Inter).

---

### Task 1: Update Attendance Screen Fonts

**Files:**
- Modify: `app/(tabs)/attendance.tsx`

- [ ] **Step 1: Apply fonts to styles**
Update `styles.title` to use `Manrope_700Bold` and `styles.subtitle` to use `Inter_400Regular`. Remove `fontWeight: 'bold'` as it's built into the font family.

```typescript
const styles = StyleSheet.create({
  // ...
  title: { 
    fontFamily: 'Manrope_700Bold', 
    fontSize: 24, 
    color: Tokens.colors.text 
  },
  subtitle: { 
    fontFamily: 'Inter_400Regular', 
    fontSize: 16, 
    color: Tokens.colors.outline, 
    marginTop: 8 
  },
});
```

- [ ] **Step 2: Commit**
```bash
git add app/(tabs)/attendance.tsx
git commit -m "style(attendance): apply correct font families"
```

### Task 2: Update Notifications Screen Fonts

**Files:**
- Modify: `app/(tabs)/notifications.tsx`

- [ ] **Step 1: Apply fonts to styles**
Update `styles.title` to use `Manrope_700Bold` and `styles.subtitle` to use `Inter_400Regular`. Remove `fontWeight: 'bold'`.

```typescript
const styles = StyleSheet.create({
  // ...
  title: { 
    fontFamily: 'Manrope_700Bold', 
    fontSize: 24, 
    color: Tokens.colors.text 
  },
  subtitle: { 
    fontFamily: 'Inter_400Regular', 
    fontSize: 16, 
    color: Tokens.colors.outline, 
    marginTop: 8 
  },
});
```

- [ ] **Step 2: Commit**
```bash
git add app/(tabs)/notifications.tsx
git commit -m "style(notifications): apply correct font families"
```

### Task 3: Update Profile Screen Fonts

**Files:**
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Apply fonts to styles**
Update `styles.title` to use `Manrope_700Bold` and `styles.subtitle` to use `Inter_400Regular`. Remove `fontWeight: 'bold'`.

```typescript
const styles = StyleSheet.create({
  // ...
  title: { 
    fontFamily: 'Manrope_700Bold', 
    fontSize: 24, 
    color: Tokens.colors.text 
  },
  subtitle: { 
    fontFamily: 'Inter_400Regular', 
    fontSize: 16, 
    color: Tokens.colors.outline, 
    marginTop: 8 
  },
});
```

- [ ] **Step 2: Commit**
```bash
git add app/(tabs)/profile.tsx
git commit -m "style(profile): apply correct font families"
```

### Task 4: Update Tab Bar Typography

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Set tabBarLabelStyle in screenOptions**
Update `screenOptions` in the `Tabs` component to include `tabBarLabelStyle`.

```typescript
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Tokens.colors.primary,
        tabBarInactiveTintColor: Tokens.colors.outline,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: { 
          fontFamily: 'Inter_700Bold', 
          fontSize: 10 
        },
        // ...
      }}
```

- [ ] **Step 2: Commit**
```bash
git add app/(tabs)/_layout.tsx
git commit -m "style(tabs): set Inter_700Bold for tab labels"
```

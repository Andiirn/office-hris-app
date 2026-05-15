# Functional Login & UI Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a pixel-perfect Login screen according to `DESIGN.md` and `login.md`, including custom fonts, UI components, and API integration.

**Architecture:** UI components in `src/components/ui`, auth service in `src/services/`, and functional screen in `app/(auth)/login.tsx`.

**Tech Stack:** Expo Font, React Hook Form, Zod, TanStack Query, Axios.

---

### Task 1: Font Bundling & Theme Tokens

**Files:**
- Create: `src/core/theme/tokens.ts`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Install expo-font**
Run: `npx expo install expo-font @expo-google-fonts/manrope @expo-google-fonts/inter`

- [ ] **Step 2: Define Theme Tokens**
```typescript
// src/core/theme/tokens.ts
export const Tokens = {
  colors: {
    primary: '#000666',
    background: '#fbf9f8',
    surface: '#ffffff',
    text: '#1b1c1c',
    outline: '#767683',
    error: '#ba1a1a',
    inputBackground: '#f0eded',
  },
  spacing: {
    page: 20,
    stack: 16,
    gutter: 12,
  },
  radius: {
    lg: 16,
    md: 12,
    sm: 8,
  }
};
```

- [ ] **Step 3: Load Fonts in Root Layout**
```tsx
// app/_layout.tsx (Partial)
import { useFonts, Manrope_800ExtraBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_800ExtraBold,
    Manrope_700Bold,
    Inter_400Regular,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  // ... rest of provider/stack setup
}
```

- [ ] **Step 4: Commit**
```bash
git add package.json src/core/theme/tokens.ts app/_layout.tsx
git commit -m "chore: setup custom fonts and theme tokens"
```

---

### Task 2: Modern Minimalist UI Components

**Files:**
- Create: `src/components/ui/Input.tsx`
- Create: `src/components/ui/Button.tsx`

- [ ] **Step 1: Create Ghost-style Input**
```tsx
// src/components/ui/Input.tsx
import React from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';
import { Tokens } from '../../core/theme/tokens';

export const Input = ({ label, error, ...props }) => (
  <View style={styles.container}>
    {label && <Text style={styles.label}>{label}</Text>}
    <TextInput
      style={[styles.input, error && styles.inputError]}
      placeholderTextColor={Tokens.colors.outline}
      {...props}
    />
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: { marginBottom: Tokens.spacing.stack },
  label: { fontFamily: 'Inter_700Bold', fontSize: 12, marginBottom: 4, color: Tokens.colors.text },
  input: {
    backgroundColor: Tokens.colors.inputBackground,
    borderRadius: Tokens.radius.lg,
    padding: 16,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Tokens.colors.text,
  },
  inputError: { borderWidth: 1, borderColor: Tokens.colors.error },
  errorText: { color: Tokens.colors.error, fontSize: 12, marginTop: 4, fontFamily: 'Inter_400Regular' },
});
```

- [ ] **Step 2: Create Primary Button**
```tsx
// src/components/ui/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Tokens } from '../../core/theme/tokens';

export const Button = ({ title, loading, ...props }) => (
  <TouchableOpacity
    style={[styles.button, props.disabled && styles.disabled]}
    activeOpacity={0.8}
    {...props}
  >
    {loading ? (
      <ActivityIndicator color="#fff" />
    ) : (
      <Text style={styles.text}>{title}</Text>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: Tokens.colors.primary,
    borderRadius: Tokens.radius.lg,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Tokens.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabled: { opacity: 0.6 },
  text: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 16 },
});
```

- [ ] **Step 3: Commit**
```bash
git add src/components/ui/Input.tsx src/components/ui/Button.tsx
git commit -m "feat: add minimalist ui components (input, button)"
```

---

### Task 3: Auth Service & API Types

**Files:**
- Create: `src/types/auth.ts`
- Create: `src/services/auth.service.ts`

- [ ] **Step 1: Define Auth Types**
```typescript
// src/types/auth.ts
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    nik: string;
    full_name: string;
  };
}
```

- [ ] **Step 2: Implement Auth Service**
```typescript
// src/services/auth.service.ts
import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';
import { LoginResponse } from '../types/auth';

export const authService = {
  login: async (nik, password) => {
    const response = await api.post('/auth/login', {
      nik,
      password,
      device_fingerprint: '',
      device_name: 'Expo App',
      device_os: '',
    });
    return unwrapData<LoginResponse>(response.data);
  },
};
```

- [ ] **Step 3: Commit**
```bash
git add src/types/auth.ts src/services/auth.service.ts
git commit -m "feat: implement auth service and types"
```

---

### Task 4: Functional Login Screen Implementation

**Files:**
- Modify: `app/(auth)/login.tsx`

- [ ] **Step 1: Rebuild Login Screen with Form Logic**
```tsx
// app/(auth)/login.tsx
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Tokens } from '../../src/core/theme/tokens';
import { authService } from '../../src/services/auth.service';
import { useAuthStore } from '../../src/stores/auth.store';

const schema = z.object({
  nik: z.string().min(1, 'NIK is required'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

export default function LoginScreen() {
  const setAuth = useAuthStore(state => state.setAuth);
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { nik: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: (data) => authService.login(data.nik, data.password),
    onSuccess: (data) => {
      setAuth(data.user, data.access_token, data.refresh_token);
      router.replace('/(tabs)');
    },
    onError: (error) => {
      Alert.alert('Login Failed', error.response?.data?.message || 'Something went wrong');
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <Controller
          control={control}
          name="nik"
          render={({ field: { onChange, value } }) => (
            <Input
              label="NIK"
              placeholder="Enter your NIK"
              value={value}
              onChangeText={onChange}
              error={errors.nik?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Password"
              placeholder="Enter your password"
              secureTextEntry
              value={value}
              onChangeText={onChange}
              error={errors.password?.message}
            />
          )}
        />

        <Button
          title="Login"
          onPress={handleSubmit((data) => mutation.mutate(data))}
          loading={mutation.isPending}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Tokens.colors.background },
  content: { padding: Tokens.spacing.page, flex: 1, justifyContent: 'center' },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    color: Tokens.colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Tokens.colors.outline,
    marginBottom: 32,
    marginTop: 4,
  },
});
```

- [ ] **Step 2: Commit**
```bash
git add app/(auth)/login.tsx
git commit -m "feat: implement functional login screen with validation and api"
```

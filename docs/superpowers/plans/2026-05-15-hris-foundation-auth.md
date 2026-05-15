# HRIS Foundation & Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the core API layer with Axios and TanStack Query, and implement a secure, persistent authentication flow (Login/Session).

**Architecture:** Approach A (Module-Based). Logic is housed in `src/`, with `app/` serving as the routing layer. We use Zustand for state and Expo SecureStore for token persistence.

**Tech Stack:** Expo, Axios, TanStack Query, Zustand, Expo SecureStore, React Hook Form, Zod.

---

### Task 1: Setup Dependencies & Environment

**Files:**
- Modify: `package.json`
- Create: `.env`

- [ ] **Step 1: Install required dependencies**
Run: `npx expo install axios zustand expo-secure-store @tanstack/react-query react-hook-form zod @hookform/resolvers expo-location`

- [ ] **Step 2: Create .env file**
```env
EXPO_PUBLIC_API_URL=https://hris.javasuperfood.com/api/v1
```

- [ ] **Step 3: Commit**
```bash
git add package.json .env
git commit -m "chore: setup dependencies and environment"
```

---

### Task 2: Core API Layer & Envelope Normalization

**Files:**
- Create: `src/core/api/envelope.ts`
- Create: `src/core/api/client.ts`

- [ ] **Step 1: Create unwrapData helper**
```typescript
// src/core/api/envelope.ts
export interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: any;
}

export function unwrapData<T>(raw: any): T {
  if (raw && typeof raw === 'object' && raw.data !== undefined) {
    return raw.data as T;
  }
  return raw as T;
}
```

- [ ] **Step 2: Create Axios client skeleton**
```typescript
// src/core/api/client.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});
```

- [ ] **Step 3: Commit**
```bash
git add src/core/api/envelope.ts src/core/api/client.ts
git commit -m "feat: setup core api client and envelope helper"
```

---

### Task 3: Secure Token Storage

**Files:**
- Create: `src/core/auth/token-store.ts`

- [ ] **Step 1: Implement Token Storage**
```typescript
// src/core/auth/token-store.ts
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

export const tokenStore = {
  async setTokens(access: string, refresh: string) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
  },
  async getAccessToken() {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },
  async getRefreshToken() {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },
  async clearTokens() {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};
```

- [ ] **Step 2: Commit**
```bash
git add src/core/auth/token-store.ts
git commit -m "feat: implement secure token storage"
```

---

### Task 4: Auth Store (Zustand)

**Files:**
- Create: `src/stores/auth.store.ts`

- [ ] **Step 1: Define Auth Store**
```typescript
// src/stores/auth.store.ts
import { create } from 'zustand';
import { tokenStore } from '../core/auth/token-store';

interface User {
  id: string;
  nik: string;
  full_name: string;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  setAuth: (user: User, access: string, refresh: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  setAuth: async (user, access, refresh) => {
    await tokenStore.setTokens(access, refresh);
    set({ user, isLoggedIn: true });
  },
  logout: async () => {
    await tokenStore.clearTokens();
    set({ user: null, isLoggedIn: false });
  },
}));
```

- [ ] **Step 2: Commit**
```bash
git add src/stores/auth.store.ts
git commit -m "feat: implement auth store with zustand"
```

---

### Task 5: API Interceptors (Auth Injection & Refresh)

**Files:**
- Modify: `src/core/api/client.ts`

- [ ] **Step 1: Add Request Interceptor**
```typescript
// src/core/api/client.ts (Update)
import { tokenStore } from '../auth/token-store';

api.interceptors.request.use(async (config) => {
  const token = await tokenStore.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

- [ ] **Step 2: Add Response Interceptor (Stub for Refresh)**
```typescript
// src/core/api/client.ts (Update)
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      // TODO: Implement refresh logic or logout
      // For now, just trigger logout
    }
    return Promise.reject(err);
  }
);
```

- [ ] **Step 3: Commit**
```bash
git add src/core/api/client.ts
git commit -m "feat: add api interceptors for auth"
```

---

### Task 6: Basic Login Route

**Files:**
- Create: `app/(auth)/login.tsx`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Create (auth) directory and login screen**
```tsx
// app/(auth)/login.tsx
import { View, Text, TextInput, Button } from 'react-native';

export default function LoginScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Login</Text>
      <TextInput placeholder="NIK" style={{ borderWidth: 1, padding: 10, marginBottom: 10 }} />
      <TextInput placeholder="Password" secureTextEntry style={{ borderWidth: 1, padding: 10, marginBottom: 20 }} />
      <Button title="Login" onPress={() => {}} />
    </View>
  );
}
```

- [ ] **Step 2: Update Root Layout for Auth Guard**
```tsx
// app/_layout.tsx (Simplification for now)
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 3: Commit**
```bash
git add app/(auth)/login.tsx app/_layout.tsx
git commit -m "feat: add basic login route and layout setup"
```

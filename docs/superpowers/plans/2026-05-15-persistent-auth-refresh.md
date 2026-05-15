# Persistent Auth & Token Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement persistent session management, automatic token refresh via Axios interceptors, and login failure feedback.

**Architecture:** A dedicated `SessionManager` handles app initialization and global logout. Axios interceptors manage `401` errors by attempting a token refresh and retrying failed requests. UI state is managed via `useAuthStore` (Zustand).

**Tech Stack:** React Native (Expo), TypeScript, Axios, Zustand, Expo SecureStore, Expo SplashScreen.

---

### Task 1: Verify & Enhance TokenStore

**Files:**
- Modify: `src/core/auth/token-store.ts`
- Test: `src/core/auth/__tests__/token-store.test.ts`

- [ ] **Step 1: Write tests for TokenStore**
```ts
import { tokenStore } from '../token-store';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store');

describe('tokenStore', () => {
  it('should set and get tokens', async () => {
    await tokenStore.setTokens('access', 'refresh');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_access_token', 'access');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_refresh_token', 'refresh');
  });
});
```

- [ ] **Step 2: Run tests and ensure they pass**
Run: `npm test src/core/auth/__tests__/token-store.test.ts`

- [ ] **Step 3: Commit**
```bash
git add src/core/auth/token-store.ts src/core/auth/__tests__/token-store.test.ts
git commit -m "test: verify tokenStore functionality"
```

---

### Task 2: Implement SessionManager

**Files:**
- Create: `src/core/auth/session-manager.ts`
- Modify: `src/services/auth.service.ts`
- Test: `src/core/auth/__tests__/session-manager.test.ts`

- [ ] **Step 1: Define SessionManager logic**
```ts
import { tokenStore } from './token-store';
import { useAuthStore } from '../../stores/auth.store';
import { authService } from '../../services/auth.service';

export const sessionManager = {
  async initialize() {
    const accessToken = await tokenStore.getAccessToken();
    if (!accessToken) return;

    try {
      const user = await authService.getProfile();
      useAuthStore.getState().setUser(user);
    } catch (error) {
      await this.logout();
    }
  },
  async logout() {
    await tokenStore.clearTokens();
    useAuthStore.getState().clearAuth();
  }
};
```

- [ ] **Step 2: Add getProfile to authService**
```ts
// src/services/auth.service.ts
async getProfile(): Promise<User> {
  const response = await api.get('/profile');
  return unwrapData<User>(response.data);
}
```

- [ ] **Step 3: Commit**
```bash
git add src/core/auth/session-manager.ts src/services/auth.service.ts
git commit -m "feat: implement session manager and profile fetching"
```

---

### Task 3: Enhance Axios Client with Interceptors

**Files:**
- Modify: `src/core/api/client.ts`

- [ ] **Step 1: Implement refresh interceptor with race protection**
```ts
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    if (err.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await tokenStore.getRefreshToken();
        const response = await axios.post(`${process.env.EXPO_PUBLIC_API_URL}/auth/refresh`, { refresh_token: refreshToken });
        const { access_token, refresh_token } = response.data.data;
        
        await tokenStore.setTokens(access_token, refresh_token);
        processQueue(null, access_token);
        
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await sessionManager.logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);
```

- [ ] **Step 4: Commit**
```bash
git add src/core/api/client.ts
git commit -m "feat: add axios interceptors for token refresh"
```

---

### Task 4: Integrate with Root Layout

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Initialize session on mount**
```ts
// Inside RootLayout component
useEffect(() => {
  async function init() {
    try {
      await sessionManager.initialize();
    } finally {
      if (loaded || error) {
        SplashScreen.hideAsync();
      }
    }
  }
  init();
}, [loaded, error]);
```

- [ ] **Step 2: Commit**
```bash
git add app/_layout.tsx
git commit -m "feat: integrate session initialization in root layout"
```

---

### Task 5: Login Failure Handling

**Files:**
- Modify: `app/(auth)/login.tsx`

- [ ] **Step 1: Add error state and feedback**
```ts
const [errorMsg, setErrorMsg] = useState<string | null>(null);

const handleLogin = async (data: LoginData) => {
  try {
    setErrorMsg(null);
    await authService.login(data.nik, data.password);
    router.replace('/(tabs)');
  } catch (err: any) {
    const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
    setErrorMsg(msg);
  }
};
```

- [ ] **Step 2: Commit**
```bash
git add app/(auth)/login.tsx
git commit -m "feat: add login failure feedback"
```

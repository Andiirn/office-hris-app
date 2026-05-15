# Spec: Persistent Auth & Token Refresh

Implementing session persistence, automatic token refresh, and robust error handling for the HRIS Employee App.

## 1. Objectives
- Automatically restore session on app startup.
- Handle token expiration (401) seamlessly via refresh token.
- Prevent multiple simultaneous refresh requests (race condition protection).
- Provide visual feedback for login failures.
- Adhere to the structure defined in `GEMINI.md`.

## 2. Architecture

### 2.1 Components
- **`src/core/auth/session-manager.ts`**: Orchestrates the initialization and logout process.
- **`src/core/api/client.ts`**: Axios instance with request/response interceptors.
- **`src/stores/auth.store.ts`**: Zustand store for reactive UI state.
- **`src/core/auth/token-store.ts`**: Wrapper for `expo-secure-store`.

### 2.2 Initialization Flow (Splash Screen Delay)
1. `app/_layout.tsx` is mounted.
2. `SessionManager.initialize()` is called.
3. Check `tokenStore` for `access_token`.
4. If exists:
   - Call `authService.getProfile()`.
   - If success: Update `useAuthStore` with user data and set `isLoggedIn: true`.
   - If failure (even after auto-refresh attempt): Call `logout()`.
5. If not exists: Set `isLoggedIn: false`.
6. Once `initialize()` completes, `SplashScreen.hideAsync()` is triggered in `_layout.tsx`.

### 2.3 Token Refresh Logic (Axios Interceptor)
- **Request Interceptor**: Attach `Bearer {token}` to all requests (Existing).
- **Response Interceptor**:
  - Catch 401 status.
  - Check if a refresh is already in progress (`isRefreshing` flag).
  - If not, call `POST /auth/refresh` with the stored `refresh_token`.
  - On success: Update `tokenStore`, resolve all queued requests with the new token.
  - On failure: Trigger global logout.

## 3. Implementation Details

### 3.1 Session Manager
```ts
export const sessionManager = {
  async initialize() { ... },
  async logout() { ... }
}
```

### 3.2 Error Handling
- Use a Toast notification for `401` (Session Expired) if it happens outside of an background refresh.
- Map `422` (Validation) and `401` (Unauthorized Login) to user-friendly messages in the Login screen.

## 4. UI/UX
- **Loading State**: App stays on Splash Screen during `SessionManager.initialize()`.
- **Login Screen**: Shows an inline error message or Toast when login fails.
- **Redirects**: If session is found, navigation automatically shifts to `(tabs)`, otherwise stays/moves to `(auth)/login`.

## 5. Verification Plan
- **Unit Tests**:
  - `session-manager.test.ts`: Verify it correctly hydrates the store from tokens.
  - `client.test.ts`: Mock 401 response and verify the refresh token call and request retry.
- **Manual Verification**:
  - Open app -> stays on Splash -> enters Dashboard (if logged in).
  - Force token expiry -> verify next API call still works (refresh).
  - Wrong password -> verify error notification appears.

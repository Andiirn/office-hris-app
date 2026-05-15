# Design Spec: Modern Minimalist HRIS (Employee Expo App)
**Date:** 2026-05-15
**Status:** Approved

## 1. Overview
A mobile HRIS application for employees built with Expo. The app focuses on a professional yet empathetic user experience, featuring glassmorphism and modern minimalism.

## 2. Architecture: Approach A (Module-Based)
Logic is separated into a `src/` directory to maintain a clean `app/` (Expo Router) layer.

```text
src/
├── core/             # API client, theme, query config
├── features/         # Module-specific logic (auth, attendance, etc.)
├── components/       # Shared UI components (GlassCard, Button, etc.)
├── stores/           # Zustand stores (auth, ui)
└── types/            # TypeScript interfaces
```

## 3. API & Data Layer
- **Client:** Axios instance with base URL from `EXPO_PUBLIC_API_URL`.
- **Interceptors:**
  - Request: Injects `Bearer` token from `SecureStore`.
  - Response: Handles 401 via `POST /auth/refresh` or logout.
- **Normalization:** `unwrapData` helper to extract `data` from `{ success, data, meta }`.
- **Sync:** TanStack Query (React Query) for all server state.

## 4. Authentication (Priority 1)
- **Login:** Uses `nik`, `password`, and device metadata (`device_fingerprint`, `device_name`, `device_os`).
- **Session:** Tokens stored in `expo-secure-store`.
- **State:** `useAuthStore` (Zustand) tracks `isLoggedIn` and `user` profile.
- **Flow:** Persistence check on app boot via `GET /profile`.

## 5. Design System
- **Style:** Modern Minimalism + Glassmorphism.
- **Palette:** Navy Primary (`#000666`), Surface (`#fbf9f8`), Success/Error soft pastels.
- **Typography:** `Manrope` (Headlines), `Inter` (Body).
- **Radius:** 16px for cards and inputs.

## 6. Upcoming Features (Priority 2+)
- **Attendance:** Location-based checkin/checkout using `expo-location`. Requires GPS permission and lat/long submission.
- **Leave/Overtime/Payroll:** Following the API mapping in `api.md`.

## 7. Success Criteria
- Secure, persistent authentication.
- Pixel-perfect implementation of `DESIGN.md`.
- Robust error handling for network and API errors.
- TDD approach for all functional logic.

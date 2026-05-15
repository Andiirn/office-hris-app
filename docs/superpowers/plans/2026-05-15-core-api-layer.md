# Core API Layer & Envelope Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the core API layer, Axios client, and envelope normalization with TDD.

**Architecture:** Create a centralized API client using Axios and a helper for unwrapping standard API envelopes.

**Tech Stack:** React Native (Expo), TypeScript, Axios, Jest.

---

### Task 0: Setup Testing Environment

**Files:**
- Modify: `package.json`
- Create: `jest.config.js`

- [ ] **Step 1: Install Jest and related dependencies**
Run: `npm install --save-dev jest jest-expo @types/jest ts-jest`

- [ ] **Step 2: Add test script to package.json**
Add `"test": "jest"` to `scripts`.

- [ ] **Step 3: Create jest.config.js**
```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
};
```

### Task 1: Envelope Normalization (unwrapData)

**Files:**
- Create: `src/core/api/envelope.ts`
- Test: `src/core/api/__tests__/envelope.test.ts`

- [ ] **Step 1: Write the failing test**
Create `src/core/api/__tests__/envelope.test.ts`:
```typescript
import { unwrapData } from '../envelope';

describe('unwrapData', () => {
  it('should return data property if it exists', () => {
    const raw = { data: { id: 1, name: 'Test' }, success: true };
    expect(unwrapData(raw)).toEqual({ id: 1, name: 'Test' });
  });

  it('should return the object itself if data property does not exist', () => {
    const raw = { id: 1, name: 'Test' };
    expect(unwrapData(raw)).toEqual({ id: 1, name: 'Test' });
  });

  it('should handle null and undefined', () => {
    expect(unwrapData(null)).toBeNull();
    expect(unwrapData(undefined)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/core/api/__tests__/envelope.test.ts`
Expected: FAIL (Module not found or function not defined)

- [ ] **Step 3: Implement unwrapData**
Create `src/core/api/envelope.ts`:
```typescript
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

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/core/api/__tests__/envelope.test.ts`
Expected: PASS

### Task 2: Axios Client Skeleton

**Files:**
- Create: `src/core/api/client.ts`

- [ ] **Step 1: Implement Axios client**
Create `src/core/api/client.ts`:
```typescript
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});
```

### Task 3: Final Commit

- [ ] **Step 1: Commit all changes**
Run: `git add . && git commit -m "feat: setup core api client and envelope helper"`

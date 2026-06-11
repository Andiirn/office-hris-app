# Payroll & Home Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the existing Payroll screen into the Home Tab menu and ensure all routes requested (Leave, Overtime, Payroll, History) are accessible.

**Architecture:** Modify the `HomeScreen` component in `app/(tabs)/index.tsx` to include a new button for Payroll. The grid will simply expand to accommodate 5-6 items, wrapping naturally due to flex-wrap.

**Tech Stack:** React Native, Expo Router, Tailwind/NativeWind

---

### Task 1: Add Payroll Button to Home Tab

**Files:**
- Modify: `/Users/test/Documents/Project/HRIS/hris-app/app/(tabs)/index.tsx`

- [ ] **Step 1: Write the implementation**

Update `index.tsx` to include the Payroll item in the menu array.

```typescript
// Look for the array inside the return statement in `app/(tabs)/index.tsx`:
          {[
            { icon: 'event-available', title: 'Izin & Cuti', subtitle: leaveText, onPress: () => router.push('/leave') },
            { icon: 'work-history', title: 'Lembur', subtitle: 'Request Extra', onPress: () => router.push('/overtime') },
            { icon: 'payments', title: 'Slip Gaji', subtitle: 'Preview bulanan', onPress: () => router.push('/payroll') },
            { icon: 'event', title: 'Absensi', subtitle: 'History & koreksi', onPress: () => router.push('/attendance') },
            { icon: 'exit-to-app', title: 'Resign', subtitle: resignText, onPress: () => router.push('/resign') },
          ].map((item) => (
```

- [ ] **Step 2: Commit**

```bash
git add app/\\(tabs\\)/index.tsx
git commit -m "feat: add Payroll button to Home Tab"
```

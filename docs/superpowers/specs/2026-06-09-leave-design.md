# Design Spec: Leave (Cuti) Feature for Employee App
**Date:** 2026-06-09
**Status:** Pending Review

## 1. Overview
The Leave (Cuti) feature allows employees to view their remaining leave balances, track their leave request history, and submit new leave requests directly from the Expo mobile app. The UI will follow the established modern minimalist and glassmorphism design system.

## 2. Architecture & Components
The feature is centered around `app/leave.tsx` and supported by `src/services/leave.service.ts`.

### 2.1 Core Components
- **Leave Hub (Main View):**
  - **Header:** Displays the total remaining leave balance calculated from `/leave/balances/{employee_id}`.
  - **Calendar:** Utilizes `react-native-calendars` to visually mark dates with pending and approved leave requests.
  - **History List:** Shows a paginated list of previous and current requests fetched from `/leave/requests`. Includes status badges (PENDING, APPROVED, REJECTED, CANCELLED).
- **Request Modal:**
  - Triggered by selecting a date range on the calendar.
  - Form fields: Leave Type (from `/leave/types`), Reason, and Document Upload.
  - **Document Upload Logic:** If the selected leave type is related to "Sakit" (Sick), the document upload section becomes available to allow uploading medical certificates using `expo-document-picker`.

### 2.2 Data Flow
- **State Management:** Handled via TanStack Query for server state caching and optimistic updates.
- **API Integration:**
  - `GET /api/v1/leave/balances/{employee_id}`: Fetch balances.
  - `GET /api/v1/leave/requests`: Fetch history.
  - `GET /api/v1/leave/types`: Fetch available leave types.
  - `POST /api/v1/leave/requests`: Submit a new request.
  - `POST /api/v1/leave/requests/{id}/upload-document`: Upload supporting document (multipart/form-data).
  - `POST /api/v1/leave/requests/{id}/cancel`: Cancel a pending request.

## 3. Error Handling
- **API Errors:** Standardized extraction of error messages via the API envelope wrapper. Displayed using `Alert.alert`.
- **Validation:** Ensure dates are properly formatted (YYYY-MM-DD) before submission and required fields (leave type, reason) are populated.

## 4. Testing Strategy (TDD)
- **Service Layer:** Unit tests for `leave.service.ts` verifying API endpoint construction, payload formatting, and error handling (Already exists and passing).
- **UI Components:** Currently, there is a directive to "remove all test file if the code already perfect and works". We will follow the project rules regarding test files for UI components.

## 5. Migration from HRIS-fe
The logic conceptually mirrors `hris-fe/src/app/(employee)/leave` but is adapted for Expo using `expo-document-picker` instead of native web file inputs, and `Alert` for confirmations rather than web dialogs.

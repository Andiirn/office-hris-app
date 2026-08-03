import type { Router } from 'expo-router';

let pendingNotificationRoute: string | null = null;

/**
 * Interface representing FCM or Push Notification data payload from backend.
 */
export interface NotificationPayloadData {
  action_url?: string;
  reference_type?: string;
  reference_id?: string;
  screen?: string;
  [key: string]: any;
}

/**
 * Maps reference_type and optional reference_id to local mobile app routes.
 */
export function mapReferenceToRoute(referenceType?: string, referenceId?: string): string | null {
  if (!referenceType) return null;

  const normalizedType = referenceType.toUpperCase();

  switch (normalizedType) {
    case 'ATTENDANCE_CORRECTION':
      return '/correction';
    case 'LEAVE':
      return '/leave';
    case 'OVERTIME':
      return '/overtime';
    case 'RESIGN':
      return '/resign';
    case 'VISIT':
      return '/visit';
    case 'PAYROLL':
      return '/payroll';
    case 'APPROVAL':
      return '/approvals';
    default:
      return null;
  }
}

/**
 * Clean up backend web-based action_url to match mobile Expo Router paths.
 */
export function sanitizeActionUrl(actionUrl?: string): string | null {
  if (!actionUrl) return null;

  // Trim whitespace
  let path = actionUrl.trim();

  // Handle full URLs if sent by mistake
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const urlObj = new URL(path);
      path = urlObj.pathname;
    } catch {
      // If parsing URL fails, proceed with raw string
    }
  }

  // Remove admin prefix since mobile app is employee-focused
  if (path.startsWith('/admin')) {
    path = path.replace(/^\/admin/, '');
  }

  // Map specific approval paths first
  if (path.includes('/approval') || path.includes('/approvals')) {
    return '/approvals';
  }

  // Map known backend web path mappings to mobile Expo Router routes
  if (path.startsWith('/attendance/correction') || path.startsWith('/attendance/corrections')) {
    return '/correction';
  }
  if (path.startsWith('/leave')) {
    return '/leave';
  }
  if (path.startsWith('/overtime')) {
    return '/overtime';
  }
  if (path.startsWith('/resign')) {
    return '/resign';
  }
  if (path.startsWith('/attendance/visit') || path.startsWith('/visit')) {
    return '/visit';
  }
  if (path.startsWith('/payroll')) {
    return '/payroll';
  }
  if (path.startsWith('/notifications')) {
    return '/notifications';
  }

  // Ensure path starts with '/'
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  return path;
}

/**
 * Handles notification click/interaction navigation.
 * Evaluates action_url, reference_type, screen in order of priority.
 */
export function handleNotificationNavigation(data: NotificationPayloadData | undefined, router: Router): boolean {
  const route = resolveNotificationRoute(data);
  if (!route) return false;

  router.push(route as any);
  return true;
}

export function resolveNotificationRoute(data: NotificationPayloadData | undefined): string | null {
  if (!data) return null;

  console.log('[NotificationNavigation] Handling notification data payload:', data);

  if (data.action_url) {
    const route = sanitizeActionUrl(data.action_url);
    if (route) {
      console.log(`[NotificationNavigation] Navigating via action_url "${data.action_url}" -> "${route}"`);
      return route;
    }
  }

  if (data.reference_type) {
    const route = mapReferenceToRoute(data.reference_type, data.reference_id);
    if (route) {
      console.log(`[NotificationNavigation] Navigating via reference_type "${data.reference_type}" -> "${route}"`);
      return route;
    }
  }

  if (data.screen) {
    const route = sanitizeActionUrl(data.screen) || (data.screen.startsWith('/') ? data.screen : `/${data.screen}`);
    console.log(`[NotificationNavigation] Navigating via screen property "${data.screen}" -> "${route}"`);
    return route;
  }

  console.log('[NotificationNavigation] No specific route target found, navigating to /notifications');
  return '/notifications';
}

export const notificationIntent = {
  set(route: string | null) {
    pendingNotificationRoute = route;
  },
  peek() {
    return pendingNotificationRoute;
  },
  consume() {
    const route = pendingNotificationRoute;
    pendingNotificationRoute = null;
    return route;
  },
};

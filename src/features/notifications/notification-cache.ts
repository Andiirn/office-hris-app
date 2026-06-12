import { NotificationItem } from '../../types/notification';

export type NotificationInfiniteData = {
  pages: NotificationItem[][];
  pageParams: (number | undefined)[];
};

export function flattenNotificationPages(data?: NotificationInfiniteData | null) {
  return data?.pages.flat() ?? [];
}

export function markNotificationAsReadInPages(
  data: NotificationInfiniteData | undefined,
  notificationId: string,
) {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map((page) =>
      page.map((item) => (item.id === notificationId ? { ...item, is_read: true } : item)),
    ),
  };
}

export function markAllNotificationsAsReadInPages(data: NotificationInfiniteData | undefined) {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map((page) => page.map((item) => ({ ...item, is_read: true }))),
  };
}

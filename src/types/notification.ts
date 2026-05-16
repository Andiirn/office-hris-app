export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  data?: any;
}

export interface NotificationQuery {
  is_read?: boolean;
  page?: number;
  limit?: number;
}

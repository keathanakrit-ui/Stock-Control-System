export const NOTIFICATION_RUN_STATUSES = [
  "RUNNING",
  "SUCCEEDED",
  "PARTIAL_FAILED",
  "FAILED",
] as const;

export type NotificationRunStatus = typeof NOTIFICATION_RUN_STATUSES[number];

export const NOTIFICATION_CONDITIONS = [
  "LOW_STOCK",
  "OVER_STOCK",
  "NON_MOVEMENT",
] as const;

export type NotificationCondition = typeof NOTIFICATION_CONDITIONS[number];

export type NotificationRun = {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: NotificationRunStatus;
  products_scanned: number;
  notifications_claimed: number;
  notifications_sent: number;
  notifications_failed: number;
  error: string | null;
};

export type NotificationDeliveryAttempt = {
  id: number;
  run_id: string;
  product_id: number;
  product_code: string;
  product_name: string;
  condition: NotificationCondition;
  attempted_at: string;
  success: boolean;
  error: string | null;
};

export type NotificationMonitoringFilters = {
  dateFrom?: string;
  dateTo?: string;
  status?: NotificationRunStatus | "ALL";
  condition?: NotificationCondition | "ALL";
};

export type NotificationMonitoringData = {
  runs: NotificationRun[];
  attempts: NotificationDeliveryAttempt[];
};

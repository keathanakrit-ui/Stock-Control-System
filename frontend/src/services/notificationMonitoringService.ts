import { supabase } from "../lib/supabase";
import {
  NOTIFICATION_CONDITIONS,
  NOTIFICATION_RUN_STATUSES,
  type NotificationCondition,
  type NotificationDeliveryAttempt,
  type NotificationMonitoringData,
  type NotificationMonitoringFilters,
  type NotificationRun,
  type NotificationRunStatus,
} from "../models/notificationMonitoring";

type RawRecord = Record<string, unknown>;

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid ${field} returned from notification audit`);
  }
  return value;
}

function optionalString(value: unknown, field: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error(`Invalid ${field} returned from notification audit`);
  }
  return value;
}

function requiredNumber(value: unknown, field: string): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Invalid ${field} returned from notification audit`);
  }
  return number;
}

function requiredDate(value: unknown, field: string): string {
  const date = requiredString(value, field);
  if (Number.isNaN(new Date(date).getTime())) {
    throw new Error(`Invalid ${field} returned from notification audit`);
  }
  return date;
}

function optionalDate(value: unknown, field: string): string | null {
  return value === null ? null : requiredDate(value, field);
}

function runStatus(value: unknown): NotificationRunStatus {
  if (!NOTIFICATION_RUN_STATUSES.includes(value as NotificationRunStatus)) {
    throw new Error("Invalid status returned from notification audit");
  }
  return value as NotificationRunStatus;
}

function condition(value: unknown): NotificationCondition {
  if (!NOTIFICATION_CONDITIONS.includes(value as NotificationCondition)) {
    throw new Error("Invalid condition returned from notification audit");
  }
  return value as NotificationCondition;
}

function mapRun(row: RawRecord): NotificationRun {
  return {
    id: requiredString(row.id, "run id"),
    started_at: requiredDate(row.started_at, "started_at"),
    completed_at: optionalDate(row.completed_at, "completed_at"),
    status: runStatus(row.status),
    products_scanned: requiredNumber(row.products_scanned, "products_scanned"),
    notifications_claimed: requiredNumber(row.notifications_claimed, "notifications_claimed"),
    notifications_sent: requiredNumber(row.notifications_sent, "notifications_sent"),
    notifications_failed: requiredNumber(row.notifications_failed, "notifications_failed"),
    error: optionalString(row.error, "run error"),
  };
}

function mapAttempt(row: RawRecord): NotificationDeliveryAttempt {
  if (typeof row.success !== "boolean") {
    throw new Error("Invalid success value returned from notification audit");
  }
  return {
    id: requiredNumber(row.id, "attempt id"),
    run_id: requiredString(row.run_id, "run id"),
    product_id: requiredNumber(row.product_id, "product id"),
    product_code: requiredString(row.product_code, "product code"),
    product_name: requiredString(row.product_name, "product name"),
    condition: condition(row.condition),
    attempted_at: requiredDate(row.attempted_at, "attempted_at"),
    success: row.success,
    error: optionalString(row.error, "attempt error"),
  };
}

export async function getNotificationMonitoring(
  filters: NotificationMonitoringFilters = {},
): Promise<NotificationMonitoringData> {
  let runsQuery = supabase
    .from("stock_notification_runs")
    .select("id, started_at, completed_at, status, products_scanned, notifications_claimed, notifications_sent, notifications_failed, error")
    .order("started_at", { ascending: false })
    .limit(100);

  let attemptsQuery = supabase
    .from("stock_notification_delivery_attempts")
    .select("id, run_id, product_id, product_code, product_name, condition, attempted_at, success, error")
    .order("attempted_at", { ascending: false })
    .limit(250);

  if (filters.dateFrom) {
    const start = `${filters.dateFrom}T00:00:00.000`;
    runsQuery = runsQuery.gte("started_at", start);
    attemptsQuery = attemptsQuery.gte("attempted_at", start);
  }
  if (filters.dateTo) {
    const end = `${filters.dateTo}T23:59:59.999`;
    runsQuery = runsQuery.lte("started_at", end);
    attemptsQuery = attemptsQuery.lte("attempted_at", end);
  }
  if (filters.status && filters.status !== "ALL") {
    runsQuery = runsQuery.eq("status", filters.status);
  }
  if (filters.condition && filters.condition !== "ALL") {
    attemptsQuery = attemptsQuery.eq("condition", filters.condition);
  }

  const [runsResult, attemptsResult] = await Promise.all([
    runsQuery,
    attemptsQuery,
  ]);

  if (runsResult.error) throw runsResult.error;
  if (attemptsResult.error) throw attemptsResult.error;

  return {
    runs: ((runsResult.data ?? []) as RawRecord[]).map(mapRun),
    attempts: ((attemptsResult.data ?? []) as RawRecord[]).map(mapAttempt),
  };
}

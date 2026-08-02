import type { ProductStockSummary } from "../models/stockTransaction";

export const NON_MOVEMENT_DAYS = 90;

export type StockMonitoringCondition =
  | "LOW_STOCK"
  | "OVER_STOCK"
  | "NON_MOVEMENT"
  | "NORMAL";

export type StockMonitoringFlags = {
  isLowStock: boolean;
  isOverStock: boolean;
  isNonMovement: boolean;
};

export function getStockMonitoringFlags(
  product: ProductStockSummary,
  now = new Date(),
): StockMonitoringFlags {
  const nonMovementCutoff = new Date(now);
  nonMovementCutoff.setDate(
    nonMovementCutoff.getDate() - NON_MOVEMENT_DAYS,
  );

  return {
    isLowStock: product.current_qty < product.min_qty,
    isOverStock: product.current_qty > product.max_qty,
    isNonMovement:
      product.last_movement_at === null
      || new Date(product.last_movement_at) < nonMovementCutoff,
  };
}

export function getStockMonitoringConditions(
  product: ProductStockSummary,
  now = new Date(),
): StockMonitoringCondition[] {
  const flags = getStockMonitoringFlags(product, now);
  const conditions: StockMonitoringCondition[] = [];

  if (flags.isLowStock) conditions.push("LOW_STOCK");
  if (flags.isOverStock) conditions.push("OVER_STOCK");
  if (flags.isNonMovement) conditions.push("NON_MOVEMENT");

  return conditions.length > 0 ? conditions : ["NORMAL"];
}

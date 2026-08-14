import type { StockCondition } from "../_shared/linePush.ts";

export type RunStatus = "SUCCEEDED" | "PARTIAL_FAILED" | "FAILED";

export type AuditedClaim = {
  productId: number;
  productCode: string;
  productName: string;
  condition: StockCondition;
};

export function terminalRunStatus(
  sent: number,
  failed: number,
  operationalErrorCount: number,
): RunStatus {
  if (operationalErrorCount > 0) return "FAILED";
  if (failed === 0) return "SUCCEEDED";
  return sent > 0 ? "PARTIAL_FAILED" : "FAILED";
}

export function buildDeliveryAuditRows(
  runId: string,
  claims: AuditedClaim[],
  deliveryError: string | null,
) {
  return claims.map((claim) => ({
    run_id: runId,
    product_id: claim.productId,
    product_code: claim.productCode,
    product_name: claim.productName,
    condition: claim.condition,
    success: deliveryError === null,
    error: deliveryError?.slice(0, 1000) ?? null,
  }));
}

import { createClient } from "@supabase/supabase-js";
import {
  batchStockNotifications,
  formatStockNotifications,
  sendPushText,
  type StockCondition,
  type StockNotification,
} from "../_shared/linePush.ts";

const NON_MOVEMENT_DAYS = 90;
const DEFAULT_COOLDOWN_HOURS = 24;

type StockRow = {
  product_id: number;
  product_code: string;
  product_name: string;
  unit: string;
  min_qty: number;
  max_qty: number;
  current_qty: number;
  last_movement_at: string | null;
};

type Claim = StockNotification & { productId: number; claimToken: string };

function authorized(request: Request, secret: string): boolean {
  const supplied =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (supplied.length !== secret.length) return false;
  let difference = 0;
  for (let index = 0; index < secret.length; index++) {
    difference |= supplied.charCodeAt(index) ^ secret.charCodeAt(index);
  }
  return difference === 0;
}

function activeConditions(
  row: StockRow,
  now: Date,
): Record<StockCondition, boolean> {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - NON_MOVEMENT_DAYS);
  return {
    LOW_STOCK: Number(row.current_qty) < Number(row.min_qty),
    OVER_STOCK: Number(row.current_qty) > Number(row.max_qty),
    NON_MOVEMENT: row.last_movement_at === null ||
      new Date(row.last_movement_at) < cutoff,
  };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const engineSecret = Deno.env.get("NOTIFICATION_ENGINE_SECRET")?.trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const targetId = Deno.env.get("LINE_NOTIFICATION_TARGET_ID")?.trim();
  if (!engineSecret || !supabaseUrl || !serviceRoleKey || !targetId) {
    console.error("Stock notification server configuration is incomplete");
    return Response.json({ error: "Service unavailable" }, { status: 500 });
  }
  if (!authorized(request, engineSecret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.from("product_stock_summary").select(
    "product_id,product_code,product_name,unit,min_qty,max_qty,current_qty,last_movement_at",
  );
  if (error) {
    console.error("Unable to read stock summary", error.message);
    return Response.json({ error: "Unable to read stock summary" }, {
      status: 500,
    });
  }

  const claims: Claim[] = [];
  const conditions: StockCondition[] = [
    "LOW_STOCK",
    "OVER_STOCK",
    "NON_MOVEMENT",
  ];
  for (const row of (data ?? []) as StockRow[]) {
    const flags = activeConditions(row, new Date());
    for (const condition of conditions) {
      const { data: claimRows, error: claimError } = await supabase.rpc(
        "claim_stock_notification",
        {
          p_product_id: row.product_id,
          p_condition: condition,
          p_is_active: flags[condition],
          p_cooldown_hours: DEFAULT_COOLDOWN_HOURS,
          p_retry_minutes: 15,
        },
      );
      if (claimError) throw claimError;
      const claim = claimRows?.[0];
      if (claim?.should_send && claim.claim_token) {
        claims.push({
          productId: row.product_id,
          claimToken: claim.claim_token,
          condition,
          productCode: row.product_code,
          productName: row.product_name,
          currentQty: Number(row.current_qty),
          minQty: Number(row.min_qty),
          maxQty: Number(row.max_qty),
          unit: row.unit,
          lastMovementAt: row.last_movement_at,
        });
      }
    }
  }

  if (claims.length === 0) return Response.json({ status: "ok", sent: 0 });

  let sent = 0;
  let failed = 0;
  for (const batch of batchStockNotifications(claims)) {
    let deliveryError: string | null = null;
    try {
      await sendPushText(targetId, formatStockNotifications(batch));
      sent += batch.length;
    } catch (error) {
      deliveryError = error instanceof Error ? error.message : String(error);
      failed += batch.length;
      console.error("Stock notification delivery failed", deliveryError);
    }

    for (const claim of batch) {
      const { error: finalizeError } = await supabase.rpc(
        "finalize_stock_notification",
        {
          p_product_id: claim.productId,
          p_condition: claim.condition,
          p_claim_token: claim.claimToken,
          p_success: deliveryError === null,
          p_error: deliveryError,
        },
      );
      if (finalizeError) {
        console.error(
          "Unable to finalize notification claim",
          finalizeError.message,
        );
      }
    }
  }

  if (failed > 0) {
    return Response.json(
      { error: "Some LINE deliveries failed", sent, failed },
      { status: 502 },
    );
  }
  return Response.json({ status: "ok", sent });
});

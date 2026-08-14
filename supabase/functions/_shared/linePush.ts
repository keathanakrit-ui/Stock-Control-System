const LINE_PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";

export type StockCondition = "LOW_STOCK" | "OVER_STOCK" | "NON_MOVEMENT";

export type StockNotification = {
  condition: StockCondition;
  productCode: string;
  productName: string;
  currentQty: number;
  minQty: number;
  maxQty: number;
  unit: string;
  lastMovementAt: string | null;
};

const CONDITION_LABELS: Record<StockCondition, string> = {
  LOW_STOCK: "LOW STOCK",
  OVER_STOCK: "OVER STOCK",
  NON_MOVEMENT: "NON-MOVEMENT 90 DAYS",
};

export function formatStockNotifications(items: StockNotification[]): string {
  const lines = items.flatMap((item) => [
    `⚠️ ${CONDITION_LABELS[item.condition]}`,
    `${item.productCode} — ${item.productName}`,
    `คงเหลือ ${item.currentQty} ${item.unit} (Min ${item.minQty} / Max ${item.maxQty})`,
    item.condition === "NON_MOVEMENT"
      ? `เคลื่อนไหวล่าสุด: ${item.lastMovementAt ?? "ไม่เคยมีรายการเคลื่อนไหว"}`
      : "",
    "",
  ]);

  return ["Stock Control System", "", ...lines].join("\n").trim();
}

export function batchStockNotifications<T extends StockNotification>(
  items: T[],
  maxLength = 4500,
): T[][] {
  const batches: T[][] = [];
  for (const item of items) {
    const current = batches.at(-1);
    if (
      !current ||
      formatStockNotifications([...current, item]).length > maxLength
    ) {
      batches.push([item]);
    } else {
      current.push(item);
    }
  }
  return batches;
}

export async function sendPushText(
  targetId: string,
  message: string,
): Promise<void> {
  const accessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")?.trim();
  if (!accessToken) {
    throw new Error("LINE channel access token is not configured");
  }

  const response = await fetch(LINE_PUSH_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      to: targetId,
      messages: [{ type: "text", text: message }],
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `LINE push failed (${response.status}): ${responseBody.slice(0, 500)}`,
    );
  }
}

import { supabase } from "../lib/supabase";
import type {
  CreateStockTransactionInput,
  ProductStockSummary,
  StockTransactionRpcResult,
} from "../models/stockTransaction";

type RawProductStockSummary = Omit<
  ProductStockSummary,
  "id" | "product_id" | "min_qty" | "max_qty" | "current_qty"
> & {
  product_id: unknown;
  min_qty: unknown;
  max_qty: unknown;
  current_qty: unknown;
};

type RawStockTransactionRpcResult = {
  transaction_id: unknown;
  current_qty: unknown;
};

function normalizeNumber(value: unknown, fieldName: string): number {
  const normalized = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(normalized)) {
    throw new Error(`Invalid numeric value returned for ${fieldName}`);
  }

  return normalized;
}

export async function getProductsWithStock(): Promise<ProductStockSummary[]> {
  const { data, error } = await supabase
    .from("product_stock_summary")
    .select("*")
    .order("product_code", { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as RawProductStockSummary[];

  return rows.map((row) => ({
    ...row,
    id: normalizeNumber(row.product_id, "product_id"),
    product_id: normalizeNumber(row.product_id, "product_id"),
    min_qty: normalizeNumber(row.min_qty, "min_qty"),
    max_qty: normalizeNumber(row.max_qty, "max_qty"),
    current_qty: normalizeNumber(row.current_qty, "current_qty"),
  }));
}

export async function createStockTransaction(
  input: CreateStockTransactionInput,
): Promise<StockTransactionRpcResult> {
  const { data, error } = await supabase.rpc("create_stock_transaction", {
    p_product_id: input.product_id,
    p_transaction_type: input.transaction_type,
    p_quantity: input.quantity,
    p_reference: input.reference?.trim() || null,
    p_note: input.note?.trim() || null,
  });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as RawStockTransactionRpcResult[];
  const result = rows[0];

  if (!result) {
    throw new Error("Stock transaction RPC returned no result");
  }

  return {
    transaction_id: normalizeNumber(
      result.transaction_id,
      "transaction_id",
    ),
    current_qty: normalizeNumber(result.current_qty, "current_qty"),
  };
}

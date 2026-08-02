import type { Product } from "./product";

export type StockTransactionType = "RECEIVE" | "ISSUE";

export interface ProductStockSummary extends Product {
  product_id: number;
  current_qty: number;
  last_movement_at: string | null;
}

export interface CreateStockTransactionInput {
  product_id: number;
  transaction_type: StockTransactionType;
  quantity: number;
  reference?: string | null;
  note?: string | null;
}

export interface StockTransactionRpcResult {
  transaction_id: number;
  current_qty: number;
}

export interface StockTransactionHistoryRow {
  id: number;
  product_id: number;
  transaction_type: StockTransactionType;
  quantity: number;
  transaction_at: string;
  performed_by_user_id: string | null;
  performed_by_label: string;
  reference: string | null;
  note: string | null;
}

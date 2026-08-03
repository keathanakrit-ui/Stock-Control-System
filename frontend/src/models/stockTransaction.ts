import type { Product } from "./product";

export type StockTransactionType = "RECEIVE" | "ISSUE";

export interface ProductStockSummary extends Product {
  product_id: number;
  current_qty: number;
  last_movement_at: string | null;
}

export type BarcodeLookupResult =
  | {
      status: "found";
      product: ProductStockSummary;
    }
  | {
      status: "not_found";
    }
  | {
      status: "duplicate";
    };

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
  product_code: string;
  product_name: string;
  transaction_type: StockTransactionType;
  quantity: number;
  unit: string;
  transaction_at: string;
  performed_by_label: string;
  reference: string | null;
  note: string | null;
}

export type StockTransactionTypeFilter = "ALL" | StockTransactionType;

export interface StockTransactionFilters {
  search?: string;
  transaction_type?: StockTransactionTypeFilter;
  date_from?: string;
  date_to?: string;
}

import { supabase } from "../lib/supabase";
import type {
  CreateStockTransactionInput,
  ProductStockSummary,
  StockTransactionFilters,
  StockTransactionHistoryRow,
  StockTransactionRpcResult,
  StockTransactionType,
} from "../models/stockTransaction";

type RawProductStockSummary = Omit<
  ProductStockSummary,
  | "id"
  | "product_id"
  | "min_qty"
  | "max_qty"
  | "current_qty"
  | "last_movement_at"
> & {
  product_id: unknown;
  min_qty: unknown;
  max_qty: unknown;
  current_qty: unknown;
  last_movement_at: unknown;
};

type RawStockTransactionRpcResult = {
  transaction_id: unknown;
  current_qty: unknown;
};

type RawTransactionProduct = {
  product_code: unknown;
  product_name: unknown;
  unit: unknown;
};

type RawStockTransactionHistoryRow = {
  id: unknown;
  product_id: unknown;
  transaction_type: unknown;
  quantity: unknown;
  transaction_at: unknown;
  performed_by_label: unknown;
  reference: unknown;
  note: unknown;
  products: RawTransactionProduct | RawTransactionProduct[] | null;
};

function normalizeNumber(value: unknown, fieldName: string): number {
  const normalized = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(normalized)) {
    throw new Error(`Invalid numeric value returned for ${fieldName}`);
  }

  return normalized;
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid text value returned for ${fieldName}`);
  }

  return value;
}

function normalizeOptionalString(
  value: unknown,
  fieldName: string,
): string | null {
  if (value === null) return null;

  if (typeof value !== "string") {
    throw new Error(`Invalid text value returned for ${fieldName}`);
  }

  return value;
}

function normalizeTransactionType(value: unknown): StockTransactionType {
  if (value !== "RECEIVE" && value !== "ISSUE") {
    throw new Error("Invalid transaction type returned from stock history");
  }

  return value;
}

function normalizeTransactionDate(value: unknown): string {
  if (
    typeof value !== "string"
    || Number.isNaN(new Date(value).getTime())
  ) {
    throw new Error("Invalid transaction date returned from stock history");
  }

  return value;
}

function normalizeOptionalTransactionDate(value: unknown): string | null {
  if (value === null) return null;

  return normalizeTransactionDate(value);
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
    last_movement_at: normalizeOptionalTransactionDate(
      row.last_movement_at,
    ),
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

export async function getStockTransactions(
  filters: StockTransactionFilters = {},
): Promise<StockTransactionHistoryRow[]> {
  const { data, error } = await supabase
    .from("stock_transactions")
    .select(`
      id,
      product_id,
      transaction_type,
      quantity,
      transaction_at,
      performed_by_label,
      reference,
      note,
      products!inner (
        product_code,
        product_name,
        unit
      )
    `)
    .order("transaction_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as RawStockTransactionHistoryRow[];
  const mappedRows = rows.map((row) => {
    const product = Array.isArray(row.products)
      ? row.products[0]
      : row.products;

    if (!product) {
      throw new Error(
        `Product data is missing for transaction ${String(row.id)}`,
      );
    }

    return {
      id: normalizeNumber(row.id, "transaction id"),
      product_id: normalizeNumber(row.product_id, "product_id"),
      product_code: normalizeRequiredString(
        product.product_code,
        "product_code",
      ),
      product_name: normalizeRequiredString(
        product.product_name,
        "product_name",
      ),
      transaction_type: normalizeTransactionType(row.transaction_type),
      quantity: normalizeNumber(row.quantity, "transaction quantity"),
      unit: normalizeRequiredString(product.unit, "unit"),
      transaction_at: normalizeTransactionDate(row.transaction_at),
      performed_by_label: normalizeRequiredString(
        row.performed_by_label,
        "performed_by_label",
      ),
      reference: normalizeOptionalString(row.reference, "reference"),
      note: normalizeOptionalString(row.note, "note"),
    };
  });

  const normalizedSearch = filters.search?.trim().toLowerCase() ?? "";
  const dateFrom = filters.date_from
    ? new Date(`${filters.date_from}T00:00:00`)
    : null;
  const dateTo = filters.date_to
    ? new Date(`${filters.date_to}T23:59:59.999`)
    : null;

  return mappedRows.filter((transaction) => {
    const matchesSearch =
      transaction.product_code.toLowerCase().includes(normalizedSearch)
      || transaction.product_name.toLowerCase().includes(normalizedSearch);
    const matchesType =
      !filters.transaction_type
      || filters.transaction_type === "ALL"
      || transaction.transaction_type === filters.transaction_type;
    const transactionDate = new Date(transaction.transaction_at);
    const matchesDateFrom = !dateFrom || transactionDate >= dateFrom;
    const matchesDateTo = !dateTo || transactionDate <= dateTo;

    return (
      matchesSearch
      && matchesType
      && matchesDateFrom
      && matchesDateTo
    );
  });
}

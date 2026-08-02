import { useEffect, useState, type FormEvent } from "react";
import type {
  ProductStockSummary,
  StockTransactionType,
} from "../../models/stockTransaction";
import {
  createStockTransaction,
  getProductsWithStock,
} from "../../services/stockTransactionService";

type StockTransactionFormProps = {
  mode: StockTransactionType;
};

type VisibleMessage = {
  type: "success" | "error";
  text: string;
};

function getRpcErrorMessage(
  error: unknown,
  selectedProduct: ProductStockSummary,
): string {
  if (typeof error !== "object" || error === null) {
    return "Cannot save the stock transaction. Please try again.";
  }

  const rpcError = error as {
    message?: string;
    details?: string;
  };

  if (rpcError.message?.includes("INSUFFICIENT_STOCK")) {
    const availableMatch = rpcError.details?.match(
      /Available stock is ([^;]+);/,
    );
    const available = availableMatch?.[1] ?? selectedProduct.current_qty;

    return `Insufficient stock. Available quantity is ${available} ${selectedProduct.unit}.`;
  }

  if (rpcError.message?.includes("PRODUCT_NOT_FOUND")) {
    return "The selected product no longer exists. Refresh and select it again.";
  }

  if (
    rpcError.message?.includes("INVALID_QUANTITY")
    || rpcError.message?.includes("QUANTITY_SCALE_EXCEEDED")
    || rpcError.message?.includes("QUANTITY_OUT_OF_RANGE")
  ) {
    return "Enter a positive quantity with no more than 3 decimal places.";
  }

  return "Cannot save the stock transaction. Please check your connection and try again.";
}

function StockTransactionForm({ mode }: StockTransactionFormProps) {
  const [products, setProducts] = useState<ProductStockSummary[]>([]);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductStockSummary | null>(null);
  const [search, setSearch] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState<VisibleMessage | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts(selectedProductId?: number) {
    try {
      setLoadError("");
      const data = await getProductsWithStock();
      setProducts(data);

      if (selectedProductId !== undefined) {
        setSelectedProduct(
          data.find(
            (product) => product.product_id === selectedProductId,
          ) ?? null,
        );
      }

      return data;
    } catch (error) {
      console.error(error);
      setLoadError("Cannot load Product stock. Please try again.");
      return null;
    } finally {
      setIsLoadingProducts(false);
    }
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filteredProducts = products.filter(
    (product) =>
      product.product_code.toLowerCase().includes(normalizedSearch)
      || product.product_name.toLowerCase().includes(normalizedSearch),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    setMessage(null);

    if (!selectedProduct) {
      setMessage({
        type: "error",
        text: "Select a Product before saving.",
      });
      return;
    }

    const isValidQuantityFormat = /^\d+(\.\d{1,3})?$/.test(quantity);
    const parsedQuantity = Number(quantity);

    if (
      !isValidQuantityFormat
      || !Number.isFinite(parsedQuantity)
      || parsedQuantity <= 0
    ) {
      setMessage({
        type: "error",
        text: "Enter a positive quantity with no more than 3 decimal places.",
      });
      return;
    }

    if (
      mode === "ISSUE"
      && parsedQuantity > selectedProduct.current_qty
    ) {
      setMessage({
        type: "error",
        text: `Cannot issue more than the available ${selectedProduct.current_qty} ${selectedProduct.unit}.`,
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await createStockTransaction({
        product_id: selectedProduct.product_id,
        transaction_type: mode,
        quantity: parsedQuantity,
        reference,
        note,
      });

      setMessage({
        type: "success",
        text: `${mode === "RECEIVE" ? "Stock received" : "Stock issued"} successfully. New Current Qty: ${result.current_qty} ${selectedProduct.unit}.`,
      });
      setQuantity("");
      setReference("");
      setNote("");

      const refreshedProducts = await loadProducts(
        selectedProduct.product_id,
      );

      if (!refreshedProducts) {
        setMessage({
          type: "success",
          text: `${mode === "RECEIVE" ? "Stock received" : "Stock issued"} successfully. New Current Qty: ${result.current_qty} ${selectedProduct.unit}. Product stock refresh failed; reload the page to refresh it.`,
        });
      }
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: getRpcErrorMessage(error, selectedProduct),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-8 rounded-xl bg-white p-6 shadow">
      <form onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium">
            Search Product
          </label>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Product Code or Product Name..."
            className="w-full rounded-lg border border-gray-300 p-3"
          />
        </div>

        <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border">
          {isLoadingProducts && (
            <p className="p-4 text-gray-500">Loading Products...</p>
          )}

          {!isLoadingProducts && loadError && (
            <div className="p-4">
              <p className="text-red-600">{loadError}</p>
              <button
                type="button"
                onClick={() => {
                  setIsLoadingProducts(true);
                  void loadProducts();
                }}
                className="mt-2 text-blue-600 hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {!isLoadingProducts
            && !loadError
            && filteredProducts.length === 0 && (
              <p className="p-4 text-gray-500">
                No Product found for this search.
              </p>
            )}

          {!isLoadingProducts
            && !loadError
            && filteredProducts.map((product) => {
              const isSelected =
                selectedProduct?.product_id === product.product_id;

              return (
                <button
                  key={product.product_id}
                  type="button"
                  onClick={() => {
                    setSelectedProduct(product);
                    setMessage(null);
                  }}
                  className={`grid w-full grid-cols-4 gap-3 border-b p-3 text-left last:border-b-0 ${
                    isSelected
                      ? "bg-blue-50 ring-1 ring-inset ring-blue-500"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <span className="font-medium">{product.product_code}</span>
                  <span>{product.product_name}</span>
                  <span>{product.unit}</span>
                  <span>Current: {product.current_qty}</span>
                </button>
              );
            })}
        </div>

        {selectedProduct && (
          <div className="mt-6 rounded-lg bg-slate-100 p-4">
            <p className="font-semibold">
              {selectedProduct.product_code} — {selectedProduct.product_name}
            </p>
            <p className="mt-1 text-gray-600">
              Unit: {selectedProduct.unit}
            </p>
            <p
              className={`mt-1 font-semibold ${
                mode === "ISSUE" ? "text-blue-700" : "text-slate-700"
              }`}
            >
              Current Qty: {selectedProduct.current_qty}{" "}
              {selectedProduct.unit}
            </p>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium">
              {mode === "RECEIVE" ? "Received Quantity" : "Issue Quantity"}
            </label>
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="w-full rounded-lg border p-3"
              placeholder="0.000"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Reference (optional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              className="w-full rounded-lg border p-3"
              placeholder="PO, delivery note, request..."
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium">
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-24 w-full rounded-lg border p-3"
            placeholder="Additional details..."
          />
        </div>

        {message && (
          <div
            role="status"
            className={`mt-4 rounded-lg p-3 ${
              message.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || isLoadingProducts}
            className={`rounded-lg px-5 py-3 text-white disabled:cursor-not-allowed disabled:opacity-60 ${
              mode === "RECEIVE"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-orange-600 hover:bg-orange-700"
            }`}
          >
            {isSubmitting
              ? "Saving..."
              : mode === "RECEIVE"
                ? "Receive Stock"
                : "Issue Stock"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default StockTransactionForm;

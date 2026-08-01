import { useState, type FormEvent } from "react";
import type { Product, ProductInput } from "../../models/product";
import {
  createProduct,
  updateProduct,
} from "../../services/productService";

type ProductModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
  product: Product | null;
};

function ProductForm({
  open,
  onClose,
  onSuccess,
  product,
}: ProductModalProps) {
  const [productCode, setProductCode] = useState(product?.product_code ?? "");
  const [productName, setProductName] = useState(product?.product_name ?? "");
  const [category, setCategory] = useState(product?.category ?? "Spare Part");
  const [unit, setUnit] = useState(product?.unit ?? "PCS");
  const [minQty, setMinQty] = useState(String(product?.min_qty ?? 0));
  const [maxQty, setMaxQty] = useState(String(product?.max_qty ?? 0));
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    const trimmedCode = productCode.trim();
    const trimmedName = productName.trim();
    const parsedMinQty = Number(minQty);
    const parsedMaxQty = Number(maxQty);

    if (!trimmedCode) {
      alert("Please enter Product Code");
      return;
    }

    if (!trimmedName) {
      alert("Please enter Product Name");
      return;
    }

    if (
      !Number.isFinite(parsedMinQty)
      || !Number.isFinite(parsedMaxQty)
      || parsedMinQty < 0
      || parsedMaxQty < 0
    ) {
      alert("Min Qty and Max Qty must be valid non-negative numbers");
      return;
    }

    if (parsedMinQty > parsedMaxQty) {
      alert("Min Qty cannot be greater than Max Qty");
      return;
    }

    const input: ProductInput = {
      product_code: trimmedCode,
      product_name: trimmedName,
      category,
      unit,
      min_qty: parsedMinQty,
      max_qty: parsedMaxQty,
    };

    try {
      setIsSubmitting(true);

      if (product) {
        await updateProduct(product.id, input);
      } else {
        await createProduct(input);
      }

      await onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert(product ? "Cannot update product" : "Cannot add product");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {product ? "Edit Product" : "Add Product"}
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-2xl text-gray-500 hover:text-red-500"
            aria-label="Close product form"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Product Code
            </label>
            <input
              type="text"
              value={productCode}
              onChange={(event) => setProductCode(event.target.value)}
              className="w-full rounded-lg border p-3"
              placeholder="SP-0001"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Product Name
            </label>
            <input
              type="text"
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              className="w-full rounded-lg border p-3"
              placeholder="Bearing 6204"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Category</label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-lg border p-3"
            >
              <option>Spare Part</option>
              <option>Office Supply</option>
              <option>PPE</option>
              <option>Raw Material</option>
              <option>Chemical</option>
              <option>Tools</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Unit</label>
            <select
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              className="w-full rounded-lg border p-3"
            >
              <option>PCS</option>
              <option>BOX</option>
              <option>SET</option>
              <option>KG</option>
              <option>METER</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Min Qty</label>
            <input
              type="number"
              min="0"
              value={minQty}
              onChange={(event) => setMinQty(event.target.value)}
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Max Qty</label>
            <input
              type="number"
              min="0"
              value={maxQty}
              onChange={(event) => setMaxQty(event.target.value)}
              className="w-full rounded-lg border p-3"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border px-5 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Saving..."
              : product
                ? "Update"
                : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProductForm;

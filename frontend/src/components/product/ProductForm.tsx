import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import type { Product, ProductInput } from "../../models/product";
import {
  createProduct,
  updateProduct,
} from "../../services/productService";
import {
  getProductImagePublicUrl,
  ProductImageValidationError,
  uploadProductImage,
  validateProductImage,
} from "../../services/productImageService";

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
  const [size, setSize] = useState(product?.size ?? "");
  const [color, setColor] = useState(product?.color ?? "");
  const [location, setLocation] = useState(product?.location ?? "");
  const [barcode, setBarcode] = useState(product?.barcode ?? "");
  const [qrCode, setQrCode] = useState(product?.qr_code ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [supplier, setSupplier] = useState(product?.supplier ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");
  const [imageError, setImageError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const imagePreviewUrl = localPreviewUrl || product?.image_url || "";

  if (!open) return null;

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImageError("");

    if (!file) {
      setImageFile(null);
      setLocalPreviewUrl("");
      return;
    }

    try {
      validateProductImage(file);
      setImageFile(file);
      setLocalPreviewUrl(URL.createObjectURL(file));
    } catch (error) {
      setImageFile(null);
      setLocalPreviewUrl("");
      event.target.value = "";
      setImageError(
        error instanceof ProductImageValidationError
          ? error.message
          : "Cannot use this image.",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    const trimmedCode = productCode.trim();
    const trimmedName = productName.trim();
    const parsedMinQty = Number(minQty);
    const parsedMaxQty = Number(maxQty);
    const quantityPattern = /^\d+(?:\.\d{1,3})?$/;

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
      || !quantityPattern.test(minQty.trim())
      || !quantityPattern.test(maxQty.trim())
      || parsedMinQty < 0
      || parsedMaxQty < 0
    ) {
      alert(
        "Min Qty and Max Qty must be non-negative numbers with up to 3 decimal places",
      );
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
      size: size.trim() || null,
      color: color.trim() || null,
      location: location.trim() || null,
      barcode: barcode.trim() || null,
      qr_code: qrCode.trim() || null,
      brand: brand.trim() || null,
      supplier: supplier.trim() || null,
      image_url: product?.image_url ?? null,
    };

    let operation: "upload" | "save" = "save";

    try {
      setIsSubmitting(true);
      setImageError("");

      if (imageFile) {
        operation = "upload";
        setSubmitStatus("Uploading image...");
        const imagePath = await uploadProductImage(imageFile, trimmedCode);
        input.image_url = getProductImagePublicUrl(imagePath);
      }

      operation = "save";
      setSubmitStatus("Saving product...");

      if (product) {
        await updateProduct(product.id, input);
      } else {
        await createProduct(input);
      }

      await onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert(
        operation === "upload"
          ? "Cannot upload the image. Check that the Storage policy has been applied, then try again."
          : imageFile
            ? "The image was uploaded, but the product could not be saved. Please try again."
            : product
              ? "Cannot update product"
              : "Cannot add product",
      );
    } finally {
      setIsSubmitting(false);
      setSubmitStatus("");
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
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
              step="0.001"
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
              step="0.001"
              value={maxQty}
              onChange={(event) => setMaxQty(event.target.value)}
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Size</label>
            <input type="text" value={size} onChange={(event) => setSize(event.target.value)} className="w-full rounded-lg border p-3" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Color</label>
            <input type="text" value={color} onChange={(event) => setColor(event.target.value)} className="w-full rounded-lg border p-3" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Location</label>
            <input type="text" value={location} onChange={(event) => setLocation(event.target.value)} className="w-full rounded-lg border p-3" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Barcode</label>
            <input type="text" value={barcode} onChange={(event) => setBarcode(event.target.value)} className="w-full rounded-lg border p-3" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">QR Code</label>
            <input type="text" value={qrCode} onChange={(event) => setQrCode(event.target.value)} className="w-full rounded-lg border p-3" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Brand</label>
            <input type="text" value={brand} onChange={(event) => setBrand(event.target.value)} className="w-full rounded-lg border p-3" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Supplier</label>
            <input type="text" value={supplier} onChange={(event) => setSupplier(event.target.value)} className="w-full rounded-lg border p-3" />
          </div>

          <div className="col-span-2">
            <label className="mb-2 block text-sm font-medium">
              Product Image
            </label>
            <div className="flex items-start gap-4 rounded-lg border p-4">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-center text-xs text-slate-500">
                {imagePreviewUrl ? (
                  <img
                    src={imagePreviewUrl}
                    alt="Product preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  "No image"
                )}
              </div>
              <div className="min-w-0 flex-1">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  disabled={isSubmitting}
                  className="block w-full text-sm"
                />
                <p className="mt-2 text-xs text-slate-500">
                  JPEG, PNG, or WebP. Maximum 5 MB.
                </p>
                {product?.image_url && !imageFile && (
                  <p className="mt-2 text-xs text-slate-500">
                    The existing image will be kept unless you choose a new one.
                  </p>
                )}
                {imageError && (
                  <p className="mt-2 text-sm text-red-600" role="alert">
                    {imageError}
                  </p>
                )}
              </div>
            </div>
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
              ? submitStatus || "Saving..."
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

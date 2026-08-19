import { useEffect, useMemo, useState } from "react";
import MainLayout from "../../components/layout/MainLayout";
import type { Product } from "../../models/product";
import { getProducts, updateProduct } from "../../services/productService";
import {
  createProductQrLabelDataUrl,
  downloadQrLabel,
  printQrLabel,
} from "../../services/qrCodeService";

function QrGeneratorPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qrValue, setQrValue] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("Unable to load products for QR Generator", error);
        setErrorMessage("Unable to load products. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredProducts = useMemo(() => products.filter((product) =>
    product.product_code.toLowerCase().includes(normalizedSearch)
    || product.product_name.toLowerCase().includes(normalizedSearch)
  ).slice(0, 50), [normalizedSearch, products]);

  function selectProduct(product: Product) {
    setSelectedProduct(product);
    setQrValue(product.qr_code?.trim() || product.product_code);
    setPreviewUrl("");
    setMessage("");
    setErrorMessage("");
  }

  async function handleGenerate() {
    if (!selectedProduct || isGenerating) return;
    const normalizedValue = qrValue.trim();
    if (!normalizedValue) {
      setErrorMessage("QR Code value is required.");
      return;
    }
    if (normalizedValue.length > 200) {
      setErrorMessage("QR Code value must not exceed 200 characters.");
      return;
    }

    try {
      setIsGenerating(true);
      setMessage("");
      setErrorMessage("");
      let product = selectedProduct;

      if ((selectedProduct.qr_code?.trim() || "") !== normalizedValue) {
        const productInput = Object.fromEntries(
          Object.entries(selectedProduct).filter(([key]) => key !== "id"),
        ) as Omit<Product, "id">;
        product = await updateProduct(selectedProduct.id, {
          ...productInput,
          qr_code: normalizedValue,
        });
        setProducts((current) => current.map((item) =>
          item.id === product.id ? product : item
        ));
        setSelectedProduct(product);
      }

      const dataUrl = createProductQrLabelDataUrl({
        value: normalizedValue,
        productCode: product.product_code,
        productName: product.product_name,
      });
      setPreviewUrl(dataUrl);
      setQrValue(normalizedValue);
      setMessage(`QR Code ${normalizedValue} is ready and matches ${product.product_code}.`);
    } catch (error) {
      console.error("Unable to generate product QR Code", error);
      setErrorMessage("Unable to save or generate the QR Code. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <MainLayout>
      <div>
        <h2 className="text-3xl font-bold text-slate-800">QR Generator</h2>
        <p className="mt-1 text-gray-500">
          Create product QR labels that match Product Master records.
        </p>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_460px]">
          <section className="rounded-xl bg-white p-6 shadow">
            <label className="block text-sm font-medium text-slate-700">
              Search Product
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Product Code or Product Name..."
                className="mt-2 block w-full rounded-lg border border-slate-300 p-3"
              />
            </label>

            <div className="mt-4 max-h-80 overflow-y-auto rounded-lg border">
              {isLoading ? (
                <p className="p-4 text-gray-500">Loading products...</p>
              ) : filteredProducts.length === 0 ? (
                <p className="p-4 text-gray-500">No products found.</p>
              ) : filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => selectProduct(product)}
                  className={`grid w-full grid-cols-[160px_1fr] gap-3 border-b p-3 text-left last:border-0 ${
                    selectedProduct?.id === product.id
                      ? "bg-blue-50 ring-1 ring-inset ring-blue-500"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <span className="font-semibold">{product.product_code}</span>
                  <span>{product.product_name}</span>
                </button>
              ))}
            </div>

            {selectedProduct && (
              <div className="mt-6 space-y-4 border-t pt-6">
                <div>
                  <p className="font-semibold text-slate-800">
                    {selectedProduct.product_code} — {selectedProduct.product_name}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Saved QR Code: {selectedProduct.qr_code || "Not set"}
                  </p>
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  QR Code value
                  <input
                    value={qrValue}
                    onChange={(event) => {
                      setQrValue(event.target.value);
                      setPreviewUrl("");
                    }}
                    disabled={isGenerating}
                    className="mt-2 block w-full rounded-lg border border-slate-300 p-3"
                  />
                  <span className="mt-1 block text-xs font-normal text-gray-500">
                    This exact text will be saved to Product Master and encoded in the QR image.
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={isGenerating}
                  className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {isGenerating ? "Saving and generating..." : "Save & Generate QR"}
                </button>
              </div>
            )}

            {message && (
              <div role="status" className="mt-5 rounded-lg bg-green-50 p-3 text-green-700">
                {message}
              </div>
            )}
            {errorMessage && (
              <div role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">
                {errorMessage}
              </div>
            )}
          </section>

          <section className="rounded-xl bg-white p-6 shadow">
            <h3 className="text-xl font-bold text-slate-800">QR Label Preview</h3>
            {previewUrl && selectedProduct ? (
              <>
                <img
                  src={previewUrl}
                  alt={`QR Code ${selectedProduct.product_code}`}
                  className="mx-auto mt-4 w-full max-w-sm border"
                />
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => downloadQrLabel(previewUrl, selectedProduct.product_code)}
                    className="rounded-lg bg-emerald-600 px-5 py-3 text-white hover:bg-emerald-700"
                  >
                    Download PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        printQrLabel(previewUrl, selectedProduct.product_code);
                      } catch {
                        setErrorMessage("Print window was blocked. Allow pop-ups and try again.");
                      }
                    }}
                    className="rounded-lg border border-slate-400 px-5 py-3 text-slate-700 hover:bg-slate-50"
                  >
                    Print Label
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-4 grid min-h-80 place-items-center rounded-lg border-2 border-dashed text-center text-gray-400">
                Select a product and generate its QR label.
              </div>
            )}
          </section>
        </div>
      </div>
    </MainLayout>
  );
}

export default QrGeneratorPage;

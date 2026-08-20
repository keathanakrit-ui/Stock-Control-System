import { useEffect, useState } from "react";
import MainLayout from "../../components/layout/MainLayout";
import ProductForm from "../../components/product/ProductForm";
import ProductTable from "../../components/product/ProductTable";
import ProductToolbar from "../../components/product/ProductToolbar";
import type { Product } from "../../models/product";
import type { ProductStockSummary } from "../../models/stockTransaction";
import {
  deleteProduct,
  setProductActive,
} from "../../services/productService";
import { getProductsWithStock } from "../../services/stockTransactionService";
import { useAuth } from "../../hooks/useAuth";

function ProductPage() {
  const { role } = useAuth();
  const canManage = role === "SUPER_ADMIN" || role === "ADMIN";
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<ProductStockSummary[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [deletingProductId, setDeletingProductId] = useState<number | null>(
    null,
  );
  const [togglingProductId, setTogglingProductId] = useState<number | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const data = await getProductsWithStock();
      setProducts(data);
    } catch (error) {
      console.error(error);
      alert("Cannot load products");
    }
  }

  async function handleDelete(product: Product) {
    if (!canManage) return;
    const confirmed = window.confirm(
      `Delete ${product.product_code} - ${product.product_name}?`,
    );

    if (!confirmed) return;

    try {
      setDeletingProductId(product.id);
      await deleteProduct(product.id);
      await loadProducts();
    } catch (error) {
      console.error(error);
      const isReferencedByTransactions =
        typeof error === "object"
        && error !== null
        && "code" in error
        && error.code === "23503";

      alert(
        isReferencedByTransactions
          ? "This Product has stock transaction history and cannot be deleted."
          : "Cannot delete product",
      );
    } finally {
      setDeletingProductId(null);
    }
  }

  async function handleToggleActive(product: Product) {
    if (!canManage) return;

    const nextActive = !product.active;
    const confirmed = window.confirm(
      `${nextActive ? "Activate" : "Deactivate"} ${product.product_code} - ${product.product_name}?`,
    );
    if (!confirmed) return;

    try {
      setTogglingProductId(product.id);
      await setProductActive(product.id, nextActive);
      await loadProducts();
    } catch (error) {
      console.error(error);
      alert(`Cannot ${nextActive ? "activate" : "deactivate"} product`);
    } finally {
      setTogglingProductId(null);
    }
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filteredProducts = products.filter(
    (product) =>
      product.product_code.toLowerCase().includes(normalizedSearch)
      || product.product_name.toLowerCase().includes(normalizedSearch)
      || product.barcode?.toLowerCase().includes(normalizedSearch),
  );

  return (
    <MainLayout>
      <div>
        <ProductToolbar canManage={canManage} onAddProduct={() => setOpen(true)} />

        <div className="mt-8">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Product Code, Product Name, or Barcode..."
            className="w-full rounded-lg border border-gray-300 p-3"
          />
        </div>

        <ProductTable
          products={filteredProducts}
          onEdit={(product) => {
            setSelectedProduct(product);
            setOpen(true);
          }}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          deletingProductId={deletingProductId}
          togglingProductId={togglingProductId}
          canManage={canManage}
        />
      </div>

      {canManage && open && (
        <ProductForm
          key={selectedProduct?.id ?? "new-product"}
          open={open}
          onClose={() => {
            setOpen(false);
            setSelectedProduct(null);
          }}
          onSuccess={loadProducts}
          product={selectedProduct}
        />
      )}
    </MainLayout>
  );
}

export default ProductPage;

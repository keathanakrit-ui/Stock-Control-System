import { useEffect, useState } from "react";
import MainLayout from "../../components/layout/MainLayout";
import ProductForm from "../../components/product/ProductForm";
import ProductTable from "../../components/product/ProductTable";
import ProductToolbar from "../../components/product/ProductToolbar";
import type { Product } from "../../models/product";
import {
  deleteProduct,
  getProducts,
} from "../../services/productService";

function ProductPage() {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [deletingProductId, setDeletingProductId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error(error);
      alert("Cannot load products");
    }
  }

  async function handleDelete(product: Product) {
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
      alert("Cannot delete product");
    } finally {
      setDeletingProductId(null);
    }
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filteredProducts = products.filter(
    (product) =>
      product.product_code.toLowerCase().includes(normalizedSearch)
      || product.product_name.toLowerCase().includes(normalizedSearch),
  );

  return (
    <MainLayout>
      <div>
        <ProductToolbar onAddProduct={() => setOpen(true)} />

        <div className="mt-8">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Product Code or Product Name..."
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
          deletingProductId={deletingProductId}
        />
      </div>

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
    </MainLayout>
  );
}

export default ProductPage;

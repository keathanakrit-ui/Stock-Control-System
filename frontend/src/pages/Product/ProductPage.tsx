import ProductTable from "../../components/product/ProductTable";
import { useEffect, useState } from "react";
import MainLayout from "../../components/layout/MainLayout";
import ProductToolbar from "../../components/product/ProductToolbar";
import ProductForm from "../../components/product/ProductForm";
import { getProducts } from "../../services/productService";
import type { Product } from "../../models/product";
function ProductPage() {
  
  const [open, setOpen] = useState(false);
const [products, setProducts] = useState<Product[]>([]);
const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
useEffect(() => {
  loadProducts();
}, []);

async function loadProducts() {
  try {
    const data = await getProducts();
    console.log(data);
    setProducts(data);
  } catch (error) {
    console.error(error);
  }
}
  return (
    <MainLayout>
      <div>
        <ProductToolbar
          onAddProduct={() => setOpen(true)}
        />

        {/* Search */}
        <div className="mt-8">
          <input
            type="text"
            placeholder="Search Product Code or Product Name..."
            className="w-full rounded-lg border border-gray-300 p-3"
          />
        </div>

        {/* Table */}
        <ProductTable
  products={products}
  onEdit={(product) => {
    setSelectedProduct(product);
    setOpen(true);
  }}
/>
</div>
<ProductForm
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

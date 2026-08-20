import type { ProductStockSummary } from "../../models/stockTransaction";

type ProductTableProps = {
  products: ProductStockSummary[];
  onEdit: (product: ProductStockSummary) => void;
  onDelete: (product: ProductStockSummary) => void;
  onToggleActive: (product: ProductStockSummary) => void;
  deletingProductId: number | null;
  togglingProductId: number | null;
  canManage: boolean;
};

function ProductTable({
  products,
  onEdit,
  onDelete,
  onToggleActive,
  deletingProductId,
  togglingProductId,
  canManage,
}: ProductTableProps) {
  return (
    <div className="mt-8 overflow-hidden rounded-xl bg-white shadow">
      <table className="w-full">
        <thead className="bg-slate-100">
          <tr>
            <th className="p-4 text-left">Product Code</th>
            <th className="p-4 text-left">Product Name</th>
            <th className="p-4 text-left">Category</th>
            <th className="p-4 text-left">Current Qty</th>
            <th className="p-4 text-left">Min Qty</th>
            <th className="p-4 text-left">Max Qty</th>
            <th className="p-4 text-left">Unit</th>
            <th className="p-4 text-left">Status</th>
            {canManage && <th className="p-4 text-center">Action</th>}
          </tr>
        </thead>

        <tbody>
          {products.map((product) => (
            <tr key={product.id} className={`border-t ${product.active ? "" : "bg-slate-50 text-slate-500"}`}>
              <td className="p-4">{product.product_code}</td>
              <td className="p-4">{product.product_name}</td>
              <td className="p-4">{product.category}</td>
              <td className="p-4">{product.current_qty}</td>
              <td className="p-4">{product.min_qty}</td>
              <td className="p-4">{product.max_qty}</td>
              <td className="p-4">{product.unit}</td>
              <td className="p-4">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  product.active
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-200 text-slate-600"
                }`}>
                  {product.active ? "ACTIVE" : "INACTIVE"}
                </span>
              </td>

              {canManage && <td className="p-4 text-center">
                <button
                  type="button"
                  onClick={() => onEdit(product)}
                  disabled={deletingProductId === product.id}
                  className="mr-3"
                  aria-label={`Edit ${product.product_name}`}
                >
                  ✏️
                </button>

                <button
                  type="button"
                  onClick={() => onToggleActive(product)}
                  disabled={
                    deletingProductId === product.id
                    || togglingProductId === product.id
                  }
                  className="mr-3 text-sm font-medium text-blue-600 hover:underline disabled:opacity-50"
                >
                  {togglingProductId === product.id
                    ? "..."
                    : product.active
                      ? "Deactivate"
                      : "Activate"}
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(product)}
                  disabled={deletingProductId === product.id}
                  aria-label={`Delete ${product.product_name}`}
                >
                  {deletingProductId === product.id ? "..." : "🗑️"}
                </button>
              </td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProductTable;

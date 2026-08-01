import type { Product } from "../../models/product";

type ProductTableProps = {
  products: Product[];
  onEdit: (product: Product) => void;
};

function ProductTable({
  products,
  onEdit,
}: ProductTableProps) {
  return (
    <div className="mt-8 overflow-hidden rounded-xl bg-white shadow">
      <table className="w-full">
        <thead className="bg-slate-100">
          <tr>
            <th className="p-4 text-left">Product Code</th>
            <th className="p-4 text-left">Product Name</th>
            <th className="p-4 text-left">Category</th>
            <th className="p-4 text-left">Qty</th>
            <th className="p-4 text-left">Unit</th>
            <th className="p-4 text-center">Action</th>
          </tr>
        </thead>

        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-t">
              <td className="p-4">{product.product_code}</td>
              <td className="p-4">{product.product_name}</td>
              <td className="p-4">{product.category}</td>
              <td className="p-4">-</td>
              <td className="p-4">{product.unit}</td>

              <td className="p-4 text-center">
                <button
                  onClick={() => onEdit(product)}
                  className="mr-3"
                >
                  ✏️
                </button>

                <button>🗑</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProductTable;
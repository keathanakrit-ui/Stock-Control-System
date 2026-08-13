type ProductToolbarProps = {
  onAddProduct: () => void;
  canManage: boolean;
};

function ProductToolbar({ onAddProduct, canManage }: ProductToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">
          Product Master
        </h2>

        <p className="mt-1 text-gray-500">
          Manage all products in stock
        </p>
      </div>

      {canManage && <button
        onClick={onAddProduct}
        className="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700"
      >
        + Add Product
      </button>}
    </div>
  );
}

export default ProductToolbar;

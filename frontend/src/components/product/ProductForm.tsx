import { useEffect, useState } from "react";
import { createProduct } from "../../services/productService";

type ProductModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;

  product?: any;
};
 function ProductForm({
  open,
  onClose,
  onSuccess,
  product,
}: ProductModalProps){

  const [productCode, setProductCode] = useState("");
  const [productName, setProductName] = useState("");
useEffect(() => {
  console.log("ProductModal:", product);

  if (product) {
    console.log("Code =", product.product_code);
    console.log("Name =", product.product_name);

    setProductCode(product.product_code);
    setProductName(product.product_name);
  } else {
    setProductCode("");
    setProductName("");
  }
}, [product]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            Add Product
          </h2>

          <button
            onClick={onClose}
            className="text-2xl text-gray-500 hover:text-red-500"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="grid grid-cols-2 gap-4">

          <div>
            <label className="mb-2 block text-sm font-medium">
              Product Code
            </label>
<input
  type="text"
  value={productCode}
  onChange={(e) => setProductCode(e.target.value)}
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
  onChange={(e) => setProductName(e.target.value)}
  className="w-full rounded-lg border p-3"
  placeholder="Bearing 6204"
/>
         
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Category
            </label>

            <select className="w-full rounded-lg border p-3">
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
            <label className="mb-2 block text-sm font-medium">
              Unit
            </label>

            <select className="w-full rounded-lg border p-3">
              <option>PCS</option>
              <option>BOX</option>
              <option>SET</option>
              <option>KG</option>
              <option>METER</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Min Qty
            </label>

            <input
              type="number"
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Max Qty
            </label>

            <input
              type="number"
              className="w-full rounded-lg border p-3"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border px-5 py-2"
          >
            Cancel
          </button>
<button
  onClick={async () => {

    if (!productCode.trim()) {
      alert("Please enter Product Code");
      return;
    }

    if (!productName.trim()) {
      alert("Please enter Product Name");
      return;
    }

    try {
      await createProduct({
        product_code: productCode,
        product_name: productName,
        category: "Spare Part",
        unit: "PCS",
        min_qty: 0,
        max_qty: 0,
      });

    alert("Product added successfully");

setProductCode("");
setProductName("");

onSuccess();
onClose();

    } catch (error) {
      console.error(error);
      alert("Cannot save product");
    }
  }}
  className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
>
  Save
</button>
        </div>

      </div>
    </div>
  );
}

export default ProductForm;
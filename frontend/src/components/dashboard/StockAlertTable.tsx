import type { ProductStockSummary } from "../../models/stockTransaction";

type StockAlertKind = "LOW_STOCK" | "OVER_STOCK" | "NON_MOVEMENT";

type StockAlertTableProps = {
  title: string;
  kind: StockAlertKind;
  products: ProductStockSummary[];
};

function StockAlertTable({
  title,
  kind,
  products,
}: StockAlertTableProps) {
  const thresholdHeading =
    kind === "LOW_STOCK"
      ? "Min Qty"
      : kind === "OVER_STOCK"
        ? "Max Qty"
        : "Last Movement";

  return (
    <section className="overflow-hidden rounded-xl bg-white shadow">
      <div className="border-b px-6 py-4">
        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px]">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-4 text-left">Product Code</th>
              <th className="p-4 text-left">Product Name</th>
              <th className="p-4 text-right">Current Qty</th>
              <th className="p-4 text-right">{thresholdHeading}</th>
              <th className="p-4 text-left">Unit</th>
            </tr>
          </thead>

          <tbody>
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-gray-500"
                >
                  No products currently match this alert.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.product_id} className="border-t">
                  <td className="p-4 font-medium">
                    {product.product_code}
                  </td>
                  <td className="p-4">{product.product_name}</td>
                  <td className="p-4 text-right">
                    {product.current_qty}
                  </td>
                  <td className="p-4 text-right">
                    {kind === "LOW_STOCK"
                      ? product.min_qty
                      : kind === "OVER_STOCK"
                        ? product.max_qty
                        : product.last_movement_at
                          ? new Date(
                            product.last_movement_at,
                          ).toLocaleString()
                          : "No movement"}
                  </td>
                  <td className="p-4">{product.unit}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default StockAlertTable;

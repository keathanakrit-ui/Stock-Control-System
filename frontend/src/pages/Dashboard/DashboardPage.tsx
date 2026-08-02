import { useEffect, useState } from "react";
import KpiCard from "../../components/dashboard/KpiCard";
import StockAlertTable from "../../components/dashboard/StockAlertTable";
import MainLayout from "../../components/layout/MainLayout";
import type { ProductStockSummary } from "../../models/stockTransaction";
import { getProductsWithStock } from "../../services/stockTransactionService";
import { getStockMonitoringFlags } from "../../utils/stockMonitoring";

function DashboardPage() {
  const [products, setProducts] = useState<ProductStockSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setErrorMessage("");
      const data = await getProductsWithStock();
      setProducts(data);
    } catch (error) {
      console.error(error);
      setErrorMessage("Cannot load stock monitoring data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const now = new Date();
  const lowStockProducts = products
    .filter((product) => getStockMonitoringFlags(product, now).isLowStock)
    .sort(
      (first, second) =>
        second.min_qty
        - second.current_qty
        - (first.min_qty - first.current_qty),
    );
  const overStockProducts = products
    .filter((product) => getStockMonitoringFlags(product, now).isOverStock)
    .sort(
      (first, second) =>
        second.current_qty
        - second.max_qty
        - (first.current_qty - first.max_qty),
    );
  const nonMovementProducts = products
    .filter(
      (product) =>
        getStockMonitoringFlags(product, now).isNonMovement,
    )
    .sort((first, second) => {
      if (
        first.last_movement_at === null
        && second.last_movement_at === null
      ) {
        return first.product_code.localeCompare(second.product_code);
      }

      if (first.last_movement_at === null) return -1;
      if (second.last_movement_at === null) return 1;

      return (
        new Date(first.last_movement_at).getTime()
        - new Date(second.last_movement_at).getTime()
      );
    });

  return (
    <MainLayout>
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Dashboard</h2>

        <p className="mt-2 text-gray-600">
          Stock monitoring overview
        </p>

        {isLoading ? (
          <div className="mt-8 rounded-xl bg-white p-8 text-center text-gray-500 shadow">
            Loading stock monitoring...
          </div>
        ) : errorMessage ? (
          <div className="mt-8 rounded-xl bg-white p-8 text-center shadow">
            <p className="text-red-600">{errorMessage}</p>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                void loadDashboard();
              }}
              className="mt-3 text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-4 gap-6">
              <KpiCard
                title="Total Products"
                value={products.length}
                color="bg-blue-500"
                icon="#"
              />

              <KpiCard
                title="Low Stock"
                value={lowStockProducts.length}
                color="bg-red-500"
                icon="↓"
              />

              <KpiCard
                title="Over Stock"
                value={overStockProducts.length}
                color="bg-yellow-500"
                icon="↑"
              />

              <KpiCard
                title="Non Movement"
                value={nonMovementProducts.length}
                color="bg-slate-500"
                icon="90"
              />
            </div>

            {products.length === 0 ? (
              <div className="mt-8 rounded-xl bg-white p-8 text-center text-gray-500 shadow">
                No Products are available for stock monitoring.
              </div>
            ) : (
              <div className="mt-8 space-y-6">
                <StockAlertTable
                  title="Low Stock"
                  kind="LOW_STOCK"
                  products={lowStockProducts}
                />
                <StockAlertTable
                  title="Over Stock"
                  kind="OVER_STOCK"
                  products={overStockProducts}
                />
                <StockAlertTable
                  title="Non Movement (90 Days)"
                  kind="NON_MOVEMENT"
                  products={nonMovementProducts}
                />
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default DashboardPage;

import MainLayout from "../../components/layout/MainLayout";
import KpiCard from "../../components/dashboard/KpiCard";

function DashboardPage() {
  return (
    <MainLayout>
      <div>
        <h2 className="text-3xl font-bold text-slate-800">
          Dashboard
        </h2>

        <p className="mt-2 text-gray-600">
          Welcome to Stock Consumption Control System
        </p>

        <div className="mt-8 grid grid-cols-4 gap-6">
          <KpiCard
            title="Total Item"
            value="1,250"
            color="bg-blue-500"
            icon="📦"
          />

          <KpiCard
            title="Low Stock"
            value="15"
            color="bg-red-500"
            icon="⚠️"
          />

          <KpiCard
            title="Over Stock"
            value="8"
            color="bg-yellow-500"
            icon="📈"
          />

          <KpiCard
            title="Today Issue"
            value="32"
            color="bg-green-500"
            icon="📤"
          />
        </div>
      </div>
    </MainLayout>
  );
}

export default DashboardPage;
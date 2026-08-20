import MainLayout from "../../components/layout/MainLayout";
import StockTransactionForm from "../../components/stock/StockTransactionForm";

function IssuePage() {
  return (
    <MainLayout>
      <div>
        <h2 className="text-2xl font-bold text-slate-800 md:text-3xl">Issue Stock</h2>
        <p className="mt-1 text-gray-500">
          Record stock issued from inventory
        </p>

        <StockTransactionForm mode="ISSUE" />
      </div>
    </MainLayout>
  );
}

export default IssuePage;

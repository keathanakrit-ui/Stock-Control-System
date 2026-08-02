import MainLayout from "../../components/layout/MainLayout";
import StockTransactionForm from "../../components/stock/StockTransactionForm";

function ReceivePage() {
  return (
    <MainLayout>
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Receive Stock</h2>
        <p className="mt-1 text-gray-500">
          Record stock received into inventory
        </p>

        <StockTransactionForm mode="RECEIVE" />
      </div>
    </MainLayout>
  );
}

export default ReceivePage;

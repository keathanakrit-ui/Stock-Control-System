import type { StockTransactionHistoryRow } from "../../models/stockTransaction";

type TransactionTableProps = {
  transactions: StockTransactionHistoryRow[];
};

function TransactionTable({ transactions }: TransactionTableProps) {
  return (
    <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow">
      <table className="w-full min-w-[1100px]">
        <thead className="bg-slate-100">
          <tr>
            <th className="p-4 text-left">Date / Time</th>
            <th className="p-4 text-left">Product Code</th>
            <th className="p-4 text-left">Product Name</th>
            <th className="p-4 text-left">Type</th>
            <th className="p-4 text-right">Qty</th>
            <th className="p-4 text-left">Unit</th>
            <th className="p-4 text-left">User</th>
            <th className="p-4 text-left">Reference</th>
            <th className="p-4 text-left">Note</th>
          </tr>
        </thead>

        <tbody>
          {transactions.length === 0 ? (
            <tr>
              <td
                colSpan={9}
                className="p-8 text-center text-gray-500"
              >
                No transactions match the selected filters.
              </td>
            </tr>
          ) : (
            transactions.map((transaction) => (
              <tr key={transaction.id} className="border-t">
                <td className="whitespace-nowrap p-4">
                  {new Date(transaction.transaction_at).toLocaleString()}
                </td>
                <td className="p-4 font-medium">
                  {transaction.product_code}
                </td>
                <td className="p-4">{transaction.product_name}</td>
                <td className="p-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      transaction.transaction_type === "RECEIVE"
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {transaction.transaction_type}
                  </span>
                </td>
                <td className="p-4 text-right">{transaction.quantity}</td>
                <td className="p-4">{transaction.unit}</td>
                <td className="p-4">{transaction.performed_by_label}</td>
                <td className="p-4">{transaction.reference || "-"}</td>
                <td className="p-4">{transaction.note || "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default TransactionTable;

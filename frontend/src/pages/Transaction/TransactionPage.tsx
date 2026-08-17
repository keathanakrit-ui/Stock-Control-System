import { useEffect, useState } from "react";
import DatePicker from "../../components/common/DatePicker";
import MainLayout from "../../components/layout/MainLayout";
import TransactionTable from "../../components/stock/TransactionTable";
import { useAuth } from "../../hooks/useAuth";
import type {
  StockTransactionHistoryRow,
  StockTransactionTypeFilter,
} from "../../models/stockTransaction";
import { getStockTransactions } from "../../services/stockTransactionService";

function TransactionPage() {
  const { role } = useAuth();
  const [transactions, setTransactions] = useState<
    StockTransactionHistoryRow[]
  >([]);
  const [search, setSearch] = useState("");
  const [transactionType, setTransactionType] =
    useState<StockTransactionTypeFilter>("ALL");
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [exportMessage, setExportMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const canExport =
    role === "SUPER_ADMIN" || role === "ADMIN" || role === "STORE";

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    try {
      setErrorMessage("");
      const data = await getStockTransactions();
      setTransactions(data);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        "Cannot load transaction history. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const normalizedSearch = search.trim().toLowerCase();
  const fromDate = dateFrom
    ? new Date(
      dateFrom.getFullYear(),
      dateFrom.getMonth(),
      dateFrom.getDate(),
      0,
      0,
      0,
      0,
    )
    : null;
  const toDate = dateTo
    ? new Date(
      dateTo.getFullYear(),
      dateTo.getMonth(),
      dateTo.getDate(),
      23,
      59,
      59,
      999,
    )
    : null;
  const hasReversedDateRange =
    fromDate !== null
    && toDate !== null
    && fromDate > toDate;
  const dateValidationMessage = hasReversedDateRange
    ? "Date From cannot be after Date To."
    : "";

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.product_code.toLowerCase().includes(normalizedSearch)
      || transaction.product_name.toLowerCase().includes(normalizedSearch);
    const matchesType =
      transactionType === "ALL"
      || transaction.transaction_type === transactionType;
    const transactionDate = new Date(transaction.transaction_at);
    const matchesDateFrom = !fromDate || transactionDate >= fromDate;
    const matchesDateTo = !toDate || transactionDate <= toDate;

    return (
      matchesSearch
      && matchesType
      && matchesDateFrom
      && matchesDateTo
    );
  });

  async function handleExport() {
    if (
      !canExport
      || isExporting
      || hasReversedDateRange
      || filteredTransactions.length === 0
    ) return;

    try {
      setIsExporting(true);
      setExportMessage("");
      const { exportTransactionReport } = await import(
        "../../services/transactionReportService"
      );
      const fileName = await exportTransactionReport(filteredTransactions, {
        search,
        transactionType,
        dateFrom,
        dateTo,
      });
      setExportMessage(`Exported ${filteredTransactions.length} records to ${fileName}.`);
    } catch (error) {
      console.error(error);
      setExportMessage("Cannot export the Excel report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <MainLayout>
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">
              Transaction History
            </h2>
            <p className="mt-1 text-gray-500">
              Review Receive and Issue stock movements
            </p>
          </div>
          {canExport && (
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={
                isLoading
                || isExporting
                || Boolean(errorMessage)
                || hasReversedDateRange
                || filteredTransactions.length === 0
              }
              className="rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExporting ? "Exporting..." : "Export Excel"}
            </button>
          )}
        </div>

        <div className="mt-8 grid grid-cols-4 gap-4 rounded-xl bg-white p-6 shadow">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Search Product
            </label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Product Code or Product Name..."
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Transaction Type
            </label>
            <select
              value={transactionType}
              onChange={(event) =>
                setTransactionType(
                  event.target.value as StockTransactionTypeFilter,
                )}
              className="w-full rounded-lg border p-3"
            >
              <option value="ALL">All</option>
              <option value="RECEIVE">Receive</option>
              <option value="ISSUE">Issue</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Date From
            </label>
            <DatePicker
              id="transaction-date-from"
              value={dateFrom}
              onChange={setDateFrom}
              ariaLabel="Select Date From"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Date To
            </label>
            <DatePicker
              id="transaction-date-to"
              value={dateTo}
              onChange={setDateTo}
              ariaLabel="Select Date To"
            />
          </div>
        </div>

        {exportMessage && (
          <div
            role="status"
            className={`mt-4 rounded-lg p-3 ${
              exportMessage.startsWith("Exported")
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {exportMessage}
          </div>
        )}

        {isLoading ? (
          <div className="mt-6 rounded-xl bg-white p-8 text-center text-gray-500 shadow">
            Loading transaction history...
          </div>
        ) : errorMessage ? (
          <div className="mt-6 rounded-xl bg-white p-8 text-center shadow">
            <p className="text-red-600">{errorMessage}</p>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                void loadTransactions();
              }}
              className="mt-3 text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : dateValidationMessage ? (
          <div
            role="alert"
            className="mt-6 rounded-xl bg-red-50 p-4 text-red-700 shadow"
          >
            {dateValidationMessage}
          </div>
        ) : (
          <TransactionTable transactions={filteredTransactions} />
        )}
      </div>
    </MainLayout>
  );
}

export default TransactionPage;

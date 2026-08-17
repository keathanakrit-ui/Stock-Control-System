import writeXlsxFile, {
  type Cell,
  type SheetData,
} from "write-excel-file/browser";
import type {
  StockTransactionHistoryRow,
  StockTransactionTypeFilter,
} from "../models/stockTransaction";

type TransactionReportFilters = {
  search: string;
  transactionType: StockTransactionTypeFilter;
  dateFrom: Date | null;
  dateTo: Date | null;
};

const HEADER_STYLE = {
  fontWeight: "bold" as const,
  backgroundColor: "#E2E8F0",
  borderColor: "#94A3B8",
  borderStyle: "thin" as const,
};

function reportTimestamp(date: Date): string {
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ];

  return `${parts[0]}${parts[1]}${parts[2]}-${parts[3]}${parts[4]}${parts[5]}`;
}

function formatFilterDate(date: Date | null): string {
  return date ? date.toLocaleDateString() : "All dates";
}

function buildFilterSummary(filters: TransactionReportFilters): string {
  const product = filters.search.trim() || "All products";
  const type = filters.transactionType === "ALL"
    ? "All transaction types"
    : filters.transactionType;

  return [
    `Product: ${product}`,
    `Type: ${type}`,
    `Date: ${formatFilterDate(filters.dateFrom)} to ${formatFilterDate(filters.dateTo)}`,
  ].join(" | ");
}

function headerCell(value: string): Cell {
  return {
    value,
    ...HEADER_STYLE,
    align: "center",
  };
}

export async function exportTransactionReport(
  transactions: StockTransactionHistoryRow[],
  filters: TransactionReportFilters,
): Promise<string> {
  const generatedAt = new Date();
  const titleRow: Cell[] = [
    {
      value: "Stock Transaction Report",
      fontWeight: "bold",
      fontSize: 18,
      textColor: "#0F172A",
      columnSpan: 9,
      align: "center",
    },
    ...Array<Cell>(8).fill(null),
  ];
  const metadataRow: Cell[] = [
    {
      value: `Generated: ${generatedAt.toLocaleString()} | Records: ${transactions.length}`,
      columnSpan: 9,
      textColor: "#475569",
    },
    ...Array<Cell>(8).fill(null),
  ];
  const filterRow: Cell[] = [
    {
      value: buildFilterSummary(filters),
      columnSpan: 9,
      textColor: "#475569",
    },
    ...Array<Cell>(8).fill(null),
  ];
  const headings = [
    "Date / Time",
    "Product Code",
    "Product Name",
    "Type",
    "Quantity",
    "Unit",
    "User",
    "Reference",
    "Note",
  ].map(headerCell);
  const transactionRows: SheetData = transactions.map((transaction) => [
    {
      value: new Date(transaction.transaction_at),
      type: Date,
      format: "dd/mm/yyyy hh:mm:ss",
    },
    transaction.product_code,
    transaction.product_name,
    transaction.transaction_type,
    {
      value: transaction.quantity,
      type: Number,
      format: "0.000",
    },
    transaction.unit,
    transaction.performed_by_label,
    transaction.reference ?? "",
    transaction.note ?? "",
  ]);
  const sheetData: SheetData = [
    titleRow,
    metadataRow,
    filterRow,
    [],
    headings,
    ...transactionRows,
  ];
  const fileName = `stock-transactions-${reportTimestamp(generatedAt)}.xlsx`;

  await writeXlsxFile(sheetData, {
    sheet: "Transactions",
    stickyRowsCount: 5,
    columns: [
      { width: 22 },
      { width: 18 },
      { width: 28 },
      { width: 12 },
      { width: 14 },
      { width: 12 },
      { width: 24 },
      { width: 24 },
      { width: 36 },
    ],
  }).toFile(fileName);

  return fileName;
}

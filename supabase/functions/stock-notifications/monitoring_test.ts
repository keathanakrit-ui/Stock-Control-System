import { buildDeliveryAuditRows, terminalRunStatus } from "./monitoring.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${
        JSON.stringify(actual)
      }`,
    );
  }
}

Deno.test("terminal run status represents success and delivery failures", () => {
  assertEquals(terminalRunStatus(0, 0, 0), "SUCCEEDED");
  assertEquals(terminalRunStatus(2, 1, 0), "PARTIAL_FAILED");
  assertEquals(terminalRunStatus(0, 3, 0), "FAILED");
  assertEquals(terminalRunStatus(3, 0, 1), "FAILED");
});

Deno.test("delivery audit keeps Product snapshots and bounds errors", () => {
  const longError = "x".repeat(1001);
  const rows = buildDeliveryAuditRows("run-1", [{
    productId: 42,
    productCode: "SKU-42",
    productName: "Widget",
    condition: "LOW_STOCK",
  }], longError);

  assertEquals(rows, [{
    run_id: "run-1",
    product_id: 42,
    product_code: "SKU-42",
    product_name: "Widget",
    condition: "LOW_STOCK",
    success: false,
    error: "x".repeat(1000),
  }]);
});

import qrcode from "qrcode-generator";

export type ProductQrLabel = {
  value: string;
  productCode: string;
  productName: string;
};

export function createProductQrLabelDataUrl(label: ProductQrLabel): string {
  const value = label.value.trim();
  if (!value) throw new Error("QR Code value is required");

  const qr = qrcode(0, "H");
  qr.addData(value, "Byte");
  qr.make();

  const canvas = document.createElement("canvas");
  const width = 1200;
  const height = 1400;
  const qrAreaSize = 1024;
  const quietModules = 4;
  const moduleCount = qr.getModuleCount();
  const cellSize = Math.floor(qrAreaSize / (moduleCount + quietModules * 2));
  const renderedSize = cellSize * (moduleCount + quietModules * 2);
  const qrLeft = Math.floor((width - renderedSize) / 2);
  const qrTop = 55;

  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#000000";

  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      if (!qr.isDark(row, column)) continue;
      context.fillRect(
        qrLeft + (column + quietModules) * cellSize,
        qrTop + (row + quietModules) * cellSize,
        cellSize,
        cellSize,
      );
    }
  }

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#0f172a";
  context.font = "bold 72px Arial, sans-serif";
  context.fillText(label.productCode, width / 2, 1165);
  context.font = "44px Arial, sans-serif";
  context.fillText(label.productName.slice(0, 38), width / 2, 1245);
  context.fillStyle = "#475569";
  context.font = "32px Arial, sans-serif";
  context.fillText(`QR: ${value}`, width / 2, 1320);

  return canvas.toDataURL("image/png");
}

export function downloadQrLabel(dataUrl: string, productCode: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `product-qr-${productCode.replace(/[^a-z0-9._-]/gi, "-")}.png`;
  link.click();
}

export function printQrLabel(dataUrl: string, productCode: string): void {
  const printWindow = window.open("", "_blank", "width=700,height=800");
  if (!printWindow) throw new Error("Print window was blocked");

  printWindow.document.write(`<!doctype html>
<html><head><title>QR ${productCode}</title>
<style>body{margin:0;display:grid;place-items:center;min-height:100vh}img{width:min(95vw,600px);height:auto}@media print{img{width:90mm}}</style>
</head><body><img src="${dataUrl}" alt="QR ${productCode}"></body></html>`);
  printWindow.document.close();
  printWindow.addEventListener("load", () => {
    printWindow.focus();
    printWindow.print();
  });
}

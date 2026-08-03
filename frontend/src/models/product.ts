export interface Product {
  id: number;

  product_code: string;
  product_name: string;

  category: string;
  unit: string;

  min_qty: number;
  max_qty: number;

  size: string | null;
  color: string | null;
  location: string | null;
  barcode: string | null;
  qr_code: string | null;
  brand: string | null;
  supplier: string | null;
  image_url: string | null;
}

export type CreateProductInput = Omit<Product, "id">;
export type UpdateProductInput = Omit<Product, "id">;
export type ProductInput = CreateProductInput;

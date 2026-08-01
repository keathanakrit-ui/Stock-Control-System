export interface Product {
  id: number;

  product_code: string;
  product_name: string;

  category: string;
  unit: string;

  min_qty: number;
  max_qty: number;
}

export type ProductInput = Omit<Product, "id">;
export type CreateProductInput = ProductInput;
export type UpdateProductInput = ProductInput;

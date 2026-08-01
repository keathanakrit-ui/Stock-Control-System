import { supabase } from "../lib/supabase";
import type {
  CreateProductInput,
  Product,
  UpdateProductInput,
} from "../models/product";

export async function createProduct(
  product: CreateProductInput,
): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .insert([product])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function updateProduct(
  id: number,
  product: UpdateProductInput,
): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .update(product)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteProduct(id: number): Promise<void> {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}

import { supabase } from "../lib/supabase";

export async function createProduct(product: {
  product_code: string;
  product_name: string;
  category: string;
  unit: string;
  min_qty: number;
  max_qty: number;
}) {
  const { data, error } = await supabase
    .from("products")
    .insert([product])
    .select();

  if (error) {
    throw error;
  }

  return data;
}
export async function getProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}
import { supabase } from "../lib/supabase";

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw error;

  return data;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

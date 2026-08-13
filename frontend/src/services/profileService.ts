import { supabase } from "../lib/supabase";
import { isAppRole, type Profile } from "../models/profile";

export async function getCurrentProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("id, full_name, role, active").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (typeof data.id !== "string" || !isAppRole(data.role) || typeof data.active !== "boolean") throw new Error("Invalid profile authorization data.");
  return { id: data.id, full_name: typeof data.full_name === "string" ? data.full_name : null, role: data.role, active: data.active };
}

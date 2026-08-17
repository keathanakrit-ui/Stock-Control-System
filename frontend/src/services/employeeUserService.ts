import { supabase } from "../lib/supabase";
import type {
  CreatedEmployeeUser,
  CreateEmployeeUserInput,
} from "../models/employeeUser";

export async function createEmployeeUser(
  input: CreateEmployeeUserInput,
): Promise<CreatedEmployeeUser> {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: input,
  });

  if (error) throw error;
  if (!data || typeof data.employeeCode !== "string") {
    throw new Error("Invalid response from employee account service");
  }

  return data as CreatedEmployeeUser;
}

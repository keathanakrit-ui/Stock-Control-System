import { supabase } from "../lib/supabase";
import type {
  CreatedEmployeeUser,
  CreateEmployeeUserInput,
  ManagedEmployeeUser,
  UpdateEmployeeUserInput,
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

export async function getManagedEmployeeUsers(): Promise<ManagedEmployeeUser[]> {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: { action: "list" },
  });

  if (error) throw error;
  if (!data || !Array.isArray(data.users)) {
    throw new Error("Invalid employee account list response");
  }

  return data.users as ManagedEmployeeUser[];
}

export async function updateEmployeeUser(
  input: UpdateEmployeeUserInput,
): Promise<void> {
  const { error } = await supabase.functions.invoke("admin-users", {
    body: {
      action: "update",
      userId: input.id,
      fullName: input.fullName,
      role: input.role,
      active: input.active,
    },
  });

  if (error) throw error;
}

export async function resetEmployeePassword(
  userId: string,
  password: string,
): Promise<void> {
  const { error } = await supabase.functions.invoke("admin-users", {
    body: { action: "resetPassword", userId, password },
  });

  if (error) throw error;
}

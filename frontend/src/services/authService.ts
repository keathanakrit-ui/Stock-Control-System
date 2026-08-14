import { supabase } from "../lib/supabase";

const EMPLOYEE_AUTH_DOMAIN = "staff.stock-control.internal";
const EMPLOYEE_CODE_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;

export class EmployeeCodeValidationError extends Error {}

export function employeeCodeToAuthEmail(employeeCode: string): string {
  const normalizedCode = employeeCode.trim().toLowerCase();

  if (!EMPLOYEE_CODE_PATTERN.test(normalizedCode)) {
    throw new EmployeeCodeValidationError(
      "Employee ID must be 3-30 characters using letters, numbers, dots, hyphens, or underscores.",
    );
  }

  return `${normalizedCode}@${EMPLOYEE_AUTH_DOMAIN}`;
}

export async function signInWithPassword(employeeCode: string, password: string) {
  const email = employeeCodeToAuthEmail(employeeCode);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw error;

  return data;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

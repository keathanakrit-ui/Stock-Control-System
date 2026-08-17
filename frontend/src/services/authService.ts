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

export function loginIdentifierToAuthEmail(identifier: string): string {
  const normalizedIdentifier = identifier.trim().toLowerCase();

  if (normalizedIdentifier.includes("@")) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentifier)) {
      throw new EmployeeCodeValidationError("Please enter a valid email address.");
    }
    return normalizedIdentifier;
  }

  return employeeCodeToAuthEmail(normalizedIdentifier);
}

export async function signInWithPassword(identifier: string, password: string) {
  const email = loginIdentifierToAuthEmail(identifier);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw error;

  return data;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Please enter a valid email address.");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  if (password.length < 8 || password.length > 72) {
    throw new Error("Password must be 8-72 characters.");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export const MANAGED_ROLES = ["ADMIN", "STORE", "USER"] as const;
export type ManagedRole = typeof MANAGED_ROLES[number];

export type CreateEmployeeUserInput = {
  employeeCode: string;
  fullName: string;
  password: string;
  role: ManagedRole;
  active: boolean;
};

const EMPLOYEE_CODE_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;

export class InputValidationError extends Error {}

export function validateCreateEmployeeUser(
  value: unknown,
): CreateEmployeeUserInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InputValidationError("Invalid request body");
  }

  const body = value as Record<string, unknown>;
  const employeeCode = typeof body.employeeCode === "string"
    ? body.employeeCode.trim().toLowerCase()
    : "";
  const fullName = typeof body.fullName === "string"
    ? body.fullName.trim()
    : "";

  if (!EMPLOYEE_CODE_PATTERN.test(employeeCode)) {
    throw new InputValidationError(
      "Employee ID must be 3-30 characters using letters, numbers, dots, hyphens, or underscores.",
    );
  }
  if (!fullName || fullName.length > 120) {
    throw new InputValidationError("Full name must be 1-120 characters.");
  }
  if (typeof body.password !== "string" || body.password.length < 8) {
    throw new InputValidationError("Password must be at least 8 characters.");
  }
  if (body.password.length > 72) {
    throw new InputValidationError("Password must not exceed 72 characters.");
  }
  if (!MANAGED_ROLES.includes(body.role as ManagedRole)) {
    throw new InputValidationError("Invalid role.");
  }
  if (typeof body.active !== "boolean") {
    throw new InputValidationError("Invalid active status.");
  }

  return {
    employeeCode,
    fullName,
    password: body.password,
    role: body.role as ManagedRole,
    active: body.active,
  };
}

export const MANAGED_ROLES = ["ADMIN", "STORE", "USER"] as const;
export type ManagedRole = typeof MANAGED_ROLES[number];

export type CreateEmployeeUserInput = {
  employeeCode: string;
  fullName: string;
  password: string;
  role: ManagedRole;
  active: boolean;
};

export type UpdateEmployeeUserInput = {
  userId: string;
  fullName: string;
  role: ManagedRole;
  active: boolean;
};

export type ResetEmployeePasswordInput = {
  userId: string;
  password: string;
};

const EMPLOYEE_CODE_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;
const USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class InputValidationError extends Error {}

function objectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InputValidationError("Invalid request body");
  }
  return value as Record<string, unknown>;
}

function validateUserId(value: unknown): string {
  const userId = typeof value === "string" ? value.trim() : "";
  if (!USER_ID_PATTERN.test(userId)) {
    throw new InputValidationError("Invalid employee user ID.");
  }
  return userId;
}

function validatePassword(value: unknown): string {
  if (typeof value !== "string" || value.length < 8) {
    throw new InputValidationError("Password must be at least 8 characters.");
  }
  if (value.length > 72) {
    throw new InputValidationError("Password must not exceed 72 characters.");
  }
  return value;
}

export function validateCreateEmployeeUser(
  value: unknown,
): CreateEmployeeUserInput {
  const body = objectBody(value);
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
  const password = validatePassword(body.password);
  if (!MANAGED_ROLES.includes(body.role as ManagedRole)) {
    throw new InputValidationError("Invalid role.");
  }
  if (typeof body.active !== "boolean") {
    throw new InputValidationError("Invalid active status.");
  }

  return {
    employeeCode,
    fullName,
    password,
    role: body.role as ManagedRole,
    active: body.active,
  };
}

export function validateUpdateEmployeeUser(
  value: unknown,
): UpdateEmployeeUserInput {
  const body = objectBody(value);
  const userId = validateUserId(body.userId);
  const fullName = typeof body.fullName === "string"
    ? body.fullName.trim()
    : "";

  if (!fullName || fullName.length > 120) {
    throw new InputValidationError("Full name must be 1-120 characters.");
  }
  if (!MANAGED_ROLES.includes(body.role as ManagedRole)) {
    throw new InputValidationError("Invalid role.");
  }
  if (typeof body.active !== "boolean") {
    throw new InputValidationError("Invalid active status.");
  }

  return {
    userId,
    fullName,
    role: body.role as ManagedRole,
    active: body.active,
  };
}

export function validateResetEmployeePassword(
  value: unknown,
): ResetEmployeePasswordInput {
  const body = objectBody(value);
  return {
    userId: validateUserId(body.userId),
    password: validatePassword(body.password),
  };
}

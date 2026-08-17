import {
  InputValidationError,
  validateCreateEmployeeUser,
  validateResetEmployeePassword,
  validateUpdateEmployeeUser,
} from "./validation.ts";

Deno.test("normalizes a valid employee account", () => {
  const result = validateCreateEmployeeUser({
    employeeCode: " EMP-001 ",
    fullName: " Store One ",
    password: "temporary-pass",
    role: "STORE",
    active: true,
  });

  if (result.employeeCode !== "emp-001") throw new Error("code not normalized");
  if (result.fullName !== "Store One") throw new Error("name not normalized");
});

Deno.test("rejects elevated and malformed input", () => {
  const invalidValues = [
    {
      employeeCode: "x@",
      fullName: "Test",
      password: "12345678",
      role: "USER",
      active: true,
    },
    {
      employeeCode: "emp001",
      fullName: "",
      password: "12345678",
      role: "USER",
      active: true,
    },
    {
      employeeCode: "emp001",
      fullName: "Test",
      password: "short",
      role: "USER",
      active: true,
    },
    {
      employeeCode: "emp001",
      fullName: "Test",
      password: "12345678",
      role: "SUPER_ADMIN",
      active: true,
    },
  ];

  for (const value of invalidValues) {
    try {
      validateCreateEmployeeUser(value);
      throw new Error("invalid input was accepted");
    } catch (error) {
      if (!(error instanceof InputValidationError)) throw error;
    }
  }
});

Deno.test("validates managed employee updates", () => {
  const result = validateUpdateEmployeeUser({
    userId: "94c0d958-552c-4eb9-a9b4-558f531879d7",
    fullName: " Store Employee ",
    role: "STORE",
    active: false,
  });

  if (result.fullName !== "Store Employee") {
    throw new Error("name not normalized");
  }
  if (result.role !== "STORE") throw new Error("role not retained");
  if (result.active !== false) throw new Error("active status not retained");
});

Deno.test("validates password resets and rejects invalid targets", () => {
  const reset = validateResetEmployeePassword({
    userId: "94c0d958-552c-4eb9-a9b4-558f531879d7",
    password: "temporary-password",
  });
  if (reset.userId !== "94c0d958-552c-4eb9-a9b4-558f531879d7") {
    throw new Error("user ID not retained");
  }

  let rejected = false;
  try {
    validateResetEmployeePassword({
      userId: "not-a-user-id",
      password: "temporary-password",
    });
  } catch (error) {
    rejected = error instanceof InputValidationError;
  }
  if (!rejected) throw new Error("invalid user ID accepted");
});

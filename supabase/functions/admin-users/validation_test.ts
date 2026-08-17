import {
  InputValidationError,
  validateCreateEmployeeUser,
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

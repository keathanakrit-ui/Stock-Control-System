export const MANAGED_EMPLOYEE_ROLES = ["ADMIN", "STORE", "USER"] as const;
export type ManagedEmployeeRole = typeof MANAGED_EMPLOYEE_ROLES[number];

export type CreateEmployeeUserInput = {
  employeeCode: string;
  fullName: string;
  password: string;
  role: ManagedEmployeeRole;
  active: boolean;
};

export type CreatedEmployeeUser = Omit<CreateEmployeeUserInput, "password">;

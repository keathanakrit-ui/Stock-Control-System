export const APP_ROLES = ["SUPER_ADMIN", "ADMIN", "STORE", "USER"] as const;
export type AppRole = (typeof APP_ROLES)[number];
export type Profile = { id: string; full_name: string | null; role: AppRole; active: boolean };
export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

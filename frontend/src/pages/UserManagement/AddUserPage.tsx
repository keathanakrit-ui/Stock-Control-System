import { useState, type FormEvent } from "react";
import MainLayout from "../../components/layout/MainLayout";
import {
  MANAGED_EMPLOYEE_ROLES,
  type CreatedEmployeeUser,
  type ManagedEmployeeRole,
} from "../../models/employeeUser";
import { createEmployeeUser } from "../../services/employeeUserService";

function AddUserPage() {
  const [employeeCode, setEmployeeCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<ManagedEmployeeRole>("USER");
  const [active, setActive] = useState(true);
  const [created, setCreated] = useState<CreatedEmployeeUser | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    if (!employeeCode.trim() || !fullName.trim() || !password) {
      setErrorMessage("Please complete all required fields.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setCreated(null);
      const result = await createEmployeeUser({
        employeeCode: employeeCode.trim(),
        fullName: fullName.trim(),
        password,
        role,
        active,
      });
      setCreated(result);
      setEmployeeCode("");
      setFullName("");
      setPassword("");
      setConfirmPassword("");
      setRole("USER");
      setActive(true);
    } catch (error) {
      console.error("Unable to create employee account", error);
      setErrorMessage("Unable to create employee account. Check the Employee ID and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl">
        <h2 className="text-3xl font-bold text-slate-800">Add User</h2>
        <p className="mt-2 text-gray-600">Create an employee account and assign application access.</p>

        {created && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800" role="status">
            Account <strong>{created.employeeCode}</strong> was created for {created.fullName} with the {created.role} role.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-xl bg-white p-6 shadow">
          <label className="block text-sm font-medium text-slate-700">Employee ID
            <input value={employeeCode} onChange={(event) => setEmployeeCode(event.target.value.toUpperCase())} disabled={isSubmitting} autoComplete="off" spellCheck={false} placeholder="EMP001" className="mt-1 block w-full rounded-lg border border-slate-300 p-3 uppercase" />
            <span className="mt-1 block text-xs font-normal text-gray-500">3-30 letters, numbers, dots, hyphens, or underscores.</span>
          </label>

          <label className="block text-sm font-medium text-slate-700">Full name
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} disabled={isSubmitting} autoComplete="off" placeholder="Employee name" className="mt-1 block w-full rounded-lg border border-slate-300 p-3" />
          </label>

          <label className="block text-sm font-medium text-slate-700">Role
            <select value={role} onChange={(event) => setRole(event.target.value as ManagedEmployeeRole)} disabled={isSubmitting} className="mt-1 block w-full rounded-lg border border-slate-300 p-3">
              {MANAGED_EMPLOYEE_ROLES.map((managedRole) => <option key={managedRole} value={managedRole}>{managedRole}</option>)}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">Initial password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={isSubmitting} autoComplete="new-password" placeholder="At least 8 characters" className="mt-1 block w-full rounded-lg border border-slate-300 p-3" />
          </label>

          <label className="block text-sm font-medium text-slate-700">Confirm password
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={isSubmitting} autoComplete="new-password" placeholder="Enter the password again" className="mt-1 block w-full rounded-lg border border-slate-300 p-3" />
          </label>

          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} disabled={isSubmitting} className="h-4 w-4" />
            Account is active
          </label>

          {errorMessage && <p className="text-sm text-red-600" role="alert">{errorMessage}</p>}

          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? "Creating account..." : "Create user"}
          </button>
        </form>
      </div>
    </MainLayout>
  );
}

export default AddUserPage;

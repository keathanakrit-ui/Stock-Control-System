import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../../components/layout/MainLayout";
import {
  MANAGED_EMPLOYEE_ROLES,
  type ManagedEmployeeUser,
  type UpdateEmployeeUserInput,
} from "../../models/employeeUser";
import {
  getManagedEmployeeUsers,
  resetEmployeePassword,
  updateEmployeeUser,
} from "../../services/employeeUserService";

type UserDrafts = Record<string, UpdateEmployeeUserInput>;

function ManageUsersPage() {
  const [users, setUsers] = useState<ManagedEmployeeUser[]>([]);
  const [drafts, setDrafts] = useState<UserDrafts>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState("");
  const [resetUser, setResetUser] = useState<ManagedEmployeeUser | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadUsers() {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const data = await getManagedEmployeeUsers();
      setUsers(data);
      setDrafts(Object.fromEntries(data.map((user) => [user.id, {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        active: user.active,
      }])));
    } catch (error) {
      console.error("Unable to load employee accounts", error);
      setErrorMessage("Unable to load employee accounts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    void getManagedEmployeeUsers()
      .then((data) => {
        if (cancelled) return;
        setUsers(data);
        setDrafts(Object.fromEntries(data.map((user) => [user.id, {
          id: user.id,
          fullName: user.fullName,
          role: user.role,
          active: user.active,
        }])));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("Unable to load employee accounts", error);
        setErrorMessage("Unable to load employee accounts. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function changeDraft(
    userId: string,
    changes: Partial<UpdateEmployeeUserInput>,
  ) {
    setDrafts((current) => ({
      ...current,
      [userId]: { ...current[userId], ...changes },
    }));
  }

  async function saveUser(userId: string) {
    const draft = drafts[userId];
    if (!draft || savingUserId) return;
    if (!draft.fullName.trim()) {
      setErrorMessage("Full name is required.");
      return;
    }

    try {
      setSavingUserId(userId);
      setMessage("");
      setErrorMessage("");
      await updateEmployeeUser({ ...draft, fullName: draft.fullName.trim() });
      setUsers((current) => current.map((user) =>
        user.id === userId
          ? { ...user, ...draft, fullName: draft.fullName.trim() }
          : user
      ));
      setMessage(`Account ${users.find((user) => user.id === userId)?.employeeCode ?? ""} was updated.`);
    } catch (error) {
      console.error("Unable to update employee account", error);
      setErrorMessage("Unable to update employee account. Please try again.");
    } finally {
      setSavingUserId("");
    }
  }

  function openPasswordReset(user: ManagedEmployeeUser) {
    setResetUser(user);
    setPassword("");
    setConfirmPassword("");
    setMessage("");
    setErrorMessage("");
  }

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetUser || isResetting) return;
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      setIsResetting(true);
      setMessage("");
      setErrorMessage("");
      await resetEmployeePassword(resetUser.id, password);
      setMessage(`Password for ${resetUser.employeeCode} was reset successfully.`);
      setResetUser(null);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Unable to reset employee password", error);
      setErrorMessage("Unable to reset employee password. Please try again.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <MainLayout>
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Manage Users</h2>
            <p className="mt-1 text-gray-500">
              Change employee roles, account status, and passwords.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void loadUsers()}
              disabled={isLoading}
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Refresh
            </button>
            <Link
              to="/users/add"
              className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
            >
              Add User
            </Link>
          </div>
        </div>

        {message && (
          <div role="status" className="mt-5 rounded-lg bg-green-50 p-3 text-green-700">
            {message}
          </div>
        )}
        {errorMessage && (
          <div role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="mt-6 rounded-xl bg-white p-8 text-center text-gray-500 shadow">
            Loading employee accounts...
          </div>
        ) : users.length === 0 ? (
          <div className="mt-6 rounded-xl bg-white p-8 text-center text-gray-500 shadow">
            No employee accounts found.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-4 text-left">Employee ID</th>
                  <th className="p-4 text-left">Full name</th>
                  <th className="p-4 text-left">Role</th>
                  <th className="p-4 text-center">Active</th>
                  <th className="p-4 text-left">Created</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const draft = drafts[user.id];
                  if (!draft) return null;

                  return (
                    <tr key={user.id} className="border-t align-top">
                      <td className="p-4 font-semibold">{user.employeeCode}</td>
                      <td className="p-4">
                        <input
                          aria-label={`Full name for ${user.employeeCode}`}
                          value={draft.fullName}
                          onChange={(event) => changeDraft(user.id, { fullName: event.target.value })}
                          disabled={savingUserId === user.id}
                          className="w-full rounded-lg border border-slate-300 p-2"
                        />
                      </td>
                      <td className="p-4">
                        <select
                          aria-label={`Role for ${user.employeeCode}`}
                          value={draft.role}
                          onChange={(event) => changeDraft(user.id, {
                            role: event.target.value as UpdateEmployeeUserInput["role"],
                          })}
                          disabled={savingUserId === user.id}
                          className="w-full rounded-lg border border-slate-300 p-2"
                        >
                          {MANAGED_EMPLOYEE_ROLES.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4 text-center">
                        <input
                          aria-label={`Active status for ${user.employeeCode}`}
                          type="checkbox"
                          checked={draft.active}
                          onChange={(event) => changeDraft(user.id, { active: event.target.checked })}
                          disabled={savingUserId === user.id}
                          className="h-5 w-5"
                        />
                      </td>
                      <td className="whitespace-nowrap p-4 text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void saveUser(user.id)}
                            disabled={Boolean(savingUserId)}
                            className="rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60"
                          >
                            {savingUserId === user.id ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openPasswordReset(user)}
                            disabled={Boolean(savingUserId)}
                            className="rounded-lg border border-blue-600 px-4 py-2 text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                          >
                            Reset Password
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {resetUser && (
          <form
            onSubmit={handlePasswordReset}
            className="mt-6 max-w-xl space-y-4 rounded-xl border border-blue-200 bg-white p-6 shadow"
          >
            <div>
              <h3 className="text-xl font-bold text-slate-800">
                Reset Password: {resetUser.employeeCode}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Set a temporary password and provide it securely to the employee.
              </p>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              New password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isResetting}
                autoComplete="new-password"
                className="mt-1 block w-full rounded-lg border border-slate-300 p-3"
                placeholder="At least 8 characters"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={isResetting}
                autoComplete="new-password"
                className="mt-1 block w-full rounded-lg border border-slate-300 p-3"
                placeholder="Enter the password again"
              />
            </label>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isResetting}
                className="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isResetting ? "Resetting..." : "Set New Password"}
              </button>
              <button
                type="button"
                onClick={() => setResetUser(null)}
                disabled={isResetting}
                className="rounded-lg border px-5 py-3 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </MainLayout>
  );
}

export default ManageUsersPage;

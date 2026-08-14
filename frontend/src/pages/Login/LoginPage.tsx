import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { EmployeeCodeValidationError } from "../../services/authService";

function LoginPage() {
  const { user, isLoading, signIn } = useAuth();
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmedEmployeeCode = employeeCode.trim();
    if (!trimmedEmployeeCode || !password) {
      setErrorMessage("Please enter your employee ID and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await signIn(trimmedEmployeeCode, password);
    } catch (error) {
      console.error("Supabase sign-in failed", error);
      setErrorMessage(
        error instanceof EmployeeCodeValidationError
          ? error.message
          : "Sign in failed. Check your employee ID and password, then try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">Checking session...</div>;
  }

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <h1 className="text-center text-2xl font-bold">Stock Consumption Control</h1>
        <p className="mt-2 text-center text-gray-500">Sign in to continue</p>

        <div className="mt-6">
          <label htmlFor="employee-code" className="block text-sm font-medium">Employee ID</label>
          <input
            id="employee-code"
            type="text"
            value={employeeCode}
            onChange={(event) => setEmployeeCode(event.target.value)}
            autoComplete="username"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={isSubmitting}
            className="mt-2 w-full rounded-lg border p-3"
            placeholder="EMP001"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-lg border p-3"
            placeholder="Enter Password"
          />
        </div>

        {errorMessage && <p className="mt-4 text-sm text-red-600" role="alert">{errorMessage}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 w-full rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;

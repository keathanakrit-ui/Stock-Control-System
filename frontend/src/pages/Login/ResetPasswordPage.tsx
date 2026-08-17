import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { signOut, updatePassword } from "../../services/authService";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) console.error("Unable to restore recovery session", error);
      setHasRecoverySession(Boolean(data.session));
      setIsChecking(false);
    });
    return () => { mounted = false; };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await updatePassword(password);
      await signOut();
      navigate("/login", { replace: true, state: { passwordReset: true } });
    } catch (error) {
      console.error("Unable to update password", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update the password. Request a new recovery link.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isChecking) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">Checking recovery link...</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <h1 className="text-center text-2xl font-bold">Set New Password</h1>
        {!hasRecoverySession ? (
          <>
            <p className="mt-4 text-center text-red-600" role="alert">
              This recovery link is invalid or expired. Request a new link.
            </p>
            <Link to="/forgot-password" className="mt-6 block text-center text-blue-600 hover:underline">Request a new recovery link</Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">New password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" disabled={isSubmitting} placeholder="8-72 characters" className="mt-2 w-full rounded-lg border p-3" />
            </label>
            <label className="block text-sm font-medium">Confirm new password
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" disabled={isSubmitting} placeholder="Enter the password again" className="mt-2 w-full rounded-lg border p-3" />
            </label>
            {errorMessage && <p className="text-sm text-red-600" role="alert">{errorMessage}</p>}
            <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-700 disabled:opacity-60">
              {isSubmitting ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;

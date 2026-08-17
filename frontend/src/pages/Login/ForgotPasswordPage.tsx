import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../../services/authService";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await requestPasswordReset(email);
      setSent(true);
    } catch (error) {
      console.error("Unable to request password recovery", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to send the recovery email. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <h1 className="text-center text-2xl font-bold">Forgot Password</h1>
        <p className="mt-2 text-center text-gray-500">
          Use the real email address registered for your account.
        </p>

        {sent ? (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">
            If the email belongs to an account, a password recovery link has been sent. Check your inbox and spam folder.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6">
            <label htmlFor="recovery-email" className="block text-sm font-medium">Email</label>
            <input
              id="recovery-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              disabled={isSubmitting}
              placeholder="name@example.com"
              className="mt-2 w-full rounded-lg border p-3"
            />
            {errorMessage && <p className="mt-4 text-sm text-red-600" role="alert">{errorMessage}</p>}
            <button type="submit" disabled={isSubmitting} className="mt-6 w-full rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-700 disabled:opacity-60">
              {isSubmitting ? "Sending..." : "Send recovery email"}
            </button>
          </form>
        )}

        <Link to="/login" className="mt-6 block text-center text-sm text-blue-600 hover:underline">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;

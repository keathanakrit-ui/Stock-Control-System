import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

function Header() {
  const { user, role, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (isSigningOut) return;

    try {
      setIsSigningOut(true);
      await signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Supabase sign-out failed", error);
      alert("Cannot sign out right now. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
      <h1 className="text-xl font-bold text-slate-700">Stock Consumption Control</h1>
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{role}</span>
        {profile?.full_name && <span className="max-w-48 truncate text-sm text-slate-700">{profile.full_name}</span>}
        <span className="max-w-64 truncate text-sm text-slate-600">{user?.email}</span>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSigningOut ? "Signing out..." : "Logout"}
        </button>
      </div>
    </header>
  );
}

export default Header;

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
    <header className="flex min-h-16 items-center justify-between gap-2 border-b bg-white px-3 py-2 shadow-sm md:px-6">
      <h1 className="text-sm font-bold text-slate-700 md:text-xl">
        <span className="md:hidden">Stock Control</span>
        <span className="hidden md:inline">Stock Consumption Control</span>
      </h1>
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{role}</span>
        {profile?.full_name && <span className="hidden max-w-48 truncate text-sm text-slate-700 sm:inline">{profile.full_name}</span>}
        <span className="hidden max-w-64 truncate text-sm text-slate-600 lg:inline">{user?.email}</span>
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

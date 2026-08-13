import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import type { AppRole } from "../../models/profile";

function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles?: readonly AppRole[] }) {
  const { user, role, active, isLoading, accessError } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">Checking session...</div>;
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!active || !role) return <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-center text-red-700" role="alert">{accessError ?? "Application access is unavailable for this account."}</div>;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/" replace />;

  return children;
}

export default ProtectedRoute;

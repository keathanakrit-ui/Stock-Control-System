import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">Checking session...</div>;
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return children;
}

export default ProtectedRoute;

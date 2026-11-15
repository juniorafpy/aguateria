import { Navigate, Outlet } from "react-router-dom";
import { PantallaCarga } from "@/components/loading";
import { authClient } from "@/lib/auth-client";

export function ProtectedRoute() {
  const { data, isPending } = authClient.useSession();

  if (isPending) return <PantallaCarga />;
  if (!data?.session) return <Navigate to="/login" replace />;

  return <Outlet />;
}

export function AdminRoute() {
  const { data, isPending } = authClient.useSession();

  if (isPending) return <PantallaCarga />;
  if (data?.user.role !== "admin") return <Navigate to="/" replace />;

  return <Outlet />;
}

import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

type Role = "admin" | "teacher" | "student";

export default function RequireRole({
  role,
  children,
}: {
  role: Role | Role[];
  children: ReactNode;
}) {
  const { user, roles, loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Загрузка…</div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  const need = Array.isArray(role) ? role : [role];
  const ok = need.some((r) => roles.includes(r));
  if (!ok) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">Нет доступа</h1>
          <p className="text-muted-foreground">У вашего аккаунта нет прав для этой страницы.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

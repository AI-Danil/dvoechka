import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Loader2 } from "lucide-react";
import { useEffect } from "react";

export default function Account() {
  const { user, roles, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (roles.includes("admin")) navigate("/admin/dashboard", { replace: true });
    else if (roles.includes("teacher")) navigate("/teacher/dashboard", { replace: true });
    else if (roles.includes("student")) navigate("/student/dashboard", { replace: true });
  }, [loading, roles, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader><CardTitle>Аккаунт</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          {roles.length === 0 && (
            <>
              <p className="text-sm">У вас пока нет назначенной роли. Если вы администратор — откройте панель админа, чтобы получить роль.</p>
              <div className="flex gap-2">
                <Button asChild variant="outline"><Link to="/admin/dashboard">Панель админа</Link></Button>
                <Button variant="outline" onClick={signOut}><LogOut className="h-4 w-4 mr-2" /> Выйти</Button>
              </div>
            </>
          )}
          {roles.length > 0 && (
            <Button variant="outline" onClick={signOut}><LogOut className="h-4 w-4 mr-2" /> Выйти</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";

export default function Account() {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader><CardTitle>Аккаунт</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <p className="text-sm">У вас пока нет назначенной роли. Если вы администратор — откройте панель админа, чтобы получить роль.</p>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/admin/dashboard">Панель админа</Link></Button>
            <Button variant="outline" onClick={signOut}><LogOut className="h-4 w-4 mr-2" /> Выйти</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

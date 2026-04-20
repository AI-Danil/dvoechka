import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";

export default function StudentDashboard() {
  const { signOut, user } = useAuth();
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Кабинет ученика</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Выйти
          </Button>
        </header>
        <Card>
          <CardHeader><CardTitle>Доступные тесты</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Здесь появятся назначенные вам тесты. Пока используйте главную страницу для прохождения тестов.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

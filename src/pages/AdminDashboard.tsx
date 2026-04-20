import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Users, GraduationCap, BookOpen, ClipboardList, LogOut, ShieldCheck } from "lucide-react";
import CreateTestForm from "@/components/CreateTestForm";
import MyTestsList from "@/components/MyTestsList";

export default function AdminDashboard() {
  const { signOut, user, roles, refreshRoles } = useAuth();
  const { toast } = useToast();
  const [counts, setCounts] = useState({ teachers: 0, classes: 0, subjects: 0, students: 0 });
  const [adminCount, setAdminCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [t, c, s, st] = await Promise.all([
      supabase.from("teachers").select("*", { count: "exact", head: true }),
      supabase.from("classes").select("*", { count: "exact", head: true }),
      supabase.from("subjects").select("*", { count: "exact", head: true }),
      supabase.from("students").select("*", { count: "exact", head: true }),
    ]);
    setCounts({
      teachers: t.count ?? 0,
      classes: c.count ?? 0,
      subjects: s.count ?? 0,
      students: st.count ?? 0,
    });
    const { count } = await supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    setAdminCount(count ?? 0);
  };

  useEffect(() => {
    void load();
  }, []);

  const claimAdmin = async () => {
    setBusy(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setBusy(false);
      toast({ title: "Не авторизован", description: "Войдите заново", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.functions.invoke("claim-admin", {
      body: {},
      headers: { Authorization: `Bearer ${token}` },
    });
    setBusy(false);
    const ok = (data as any)?.ok === true;
    if (!ok) {
      toast({
        title: "Не удалось",
        description: (data as any)?.error ?? error?.message ?? "Ошибка",
        variant: "destructive",
      });
    } else {
      toast({ title: "Готово", description: "Вы теперь админ" });
      await refreshRoles();
      await load();
    }
  };

  const isAdmin = roles.includes("admin");

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Панель администратора</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Выйти
          </Button>
        </header>

        {!isAdmin && adminCount === 0 && (
          <Card className="border-primary">
            <CardContent className="pt-6 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">В системе ещё нет администратора</p>
                <p className="text-sm text-muted-foreground">Станьте первым админом — это работает один раз</p>
              </div>
              <Button onClick={claimAdmin} disabled={busy}>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Стать админом
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Users />} label="Учителя" value={counts.teachers} />
          <StatCard icon={<GraduationCap />} label="Ученики" value={counts.students} />
          <StatCard icon={<BookOpen />} label="Классы" value={counts.classes} />
          <StatCard icon={<ClipboardList />} label="Предметы" value={counts.subjects} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Быстрые действия</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button asChild variant="outline"><Link to="/admin">Старая панель результатов</Link></Button>
            <Button variant="outline" disabled>Пригласить учителя (скоро)</Button>
            <Button variant="outline" disabled>Управление классами (скоро)</Button>
            <Button variant="outline" disabled>Конструктор тестов в UI (скоро)</Button>
          </CardContent>
        </Card>

        <CreateTestForm isAdmin onCreated={() => {}} />
        <MyTestsList isAdmin />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

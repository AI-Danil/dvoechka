import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, BookOpen, Users } from "lucide-react";
import CreateTestViaChat from "@/components/CreateTestViaChat";

interface Assignment {
  id: string;
  subject: { name: string } | null;
  class: { name: string; year: number } | null;
}

export default function TeacherDashboard() {
  const { signOut, user } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: t } = await supabase
        .from("teachers")
        .select("id, full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!t) return;
      setProfile({ full_name: t.full_name });

      const { data: a } = await supabase
        .from("teacher_assignments")
        .select("id, subject:subjects(name), class:classes(name, year)")
        .eq("teacher_id", t.id);
      setAssignments((a ?? []) as any);
    })();
  }, [user]);

  const subjects = Array.from(new Set(assignments.map((a) => a.subject?.name).filter(Boolean)));
  const classes = Array.from(new Set(assignments.map((a) => a.class ? `${a.class.name} (${a.class.year})` : null).filter(Boolean)));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Кабинет учителя</h1>
            <p className="text-sm text-muted-foreground">{profile?.full_name ?? user?.email}</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Выйти
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> Мои предметы</CardTitle></CardHeader>
            <CardContent>
              {subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Назначений ещё нет. Админ должен назначить вам предметы.</p>
              ) : (
                <ul className="space-y-1">{subjects.map((s) => <li key={s as string}>{s}</li>)}</ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Мои классы</CardTitle></CardHeader>
            <CardContent>
              {classes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Классы ещё не назначены.</p>
              ) : (
                <ul className="space-y-1">{classes.map((c) => <li key={c as string}>{c}</li>)}</ul>
              )}
            </CardContent>
          </Card>
        </div>

        <CreateTestViaChat />

        <Card>
          <CardHeader><CardTitle>Скоро</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Просмотр результатов учеников по своим предметам, UI-конструктор тестов, назначение тестов классам.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

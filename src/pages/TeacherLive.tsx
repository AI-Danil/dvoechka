// Учитель: страница управления live-сессиями.
// Создаёт сессию из своего опубликованного теста, показывает код,
// видит список учеников в реальном времени, стартует/останавливает.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Play, Square, Copy, Plus } from "lucide-react";

interface Test {
  id: string;
  title: string;
  kind: "quiz" | "written" | "hybrid";
  status: "draft" | "published";
}
interface Session {
  id: string;
  test_id: string;
  code: string;
  status: "waiting" | "running" | "finished";
  duration_sec: number;
  started_at: string | null;
  ends_at: string | null;
  created_at: string;
}
interface Participant {
  id: string;
  session_id: string;
  student_name: string;
  joined_at: string;
  submitted_at: string | null;
}

export default function TeacherLive() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>("");
  const [duration, setDuration] = useState<number>(40);
  const [creating, setCreating] = useState(false);

  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [now, setNow] = useState(Date.now());

  // Тики раз в секунду для таймера
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Загрузка опубликованных тестов
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("tests")
        .select("id, title, kind, status")
        .eq("author_user_id", user.id)
        .eq("status", "published")
        .order("created_at", { ascending: false });
      setTests((data ?? []) as Test[]);
      if (data && data.length > 0) setSelectedTestId(data[0].id);
    })();
  }, [user]);

  // Realtime подписки на сессию и участников
  const sessionChanRef = useRef<any>(null);
  useEffect(() => {
    if (!activeSession) return;

    // Загрузить участников сразу
    void supabase
      .from("test_session_participants")
      .select("*")
      .eq("session_id", activeSession.id)
      .order("joined_at", { ascending: true })
      .then(({ data }) => setParticipants((data ?? []) as Participant[]));

    const ch = supabase
      .channel(`live-session-${activeSession.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "test_sessions", filter: `id=eq.${activeSession.id}` },
        (p) => {
          if (p.new) setActiveSession((prev) => (prev ? { ...prev, ...(p.new as any) } : prev));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "test_session_participants", filter: `session_id=eq.${activeSession.id}` },
        () => {
          void supabase
            .from("test_session_participants")
            .select("*")
            .eq("session_id", activeSession.id)
            .order("joined_at", { ascending: true })
            .then(({ data }) => setParticipants((data ?? []) as Participant[]));
        },
      )
      .subscribe();
    sessionChanRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
    };
  }, [activeSession?.id]);

  const createSession = async () => {
    if (!selectedTestId) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-session", {
        body: { test_id: selectedTestId, duration_min: duration },
      });
      const r = data as any;
      if (error || !r?.ok) {
        toast({ title: "Ошибка", description: r?.error ?? error?.message, variant: "destructive" });
        return;
      }
      setActiveSession(r.session);
      setParticipants([]);
      toast({ title: "Сессия создана", description: `Код: ${r.session.code}` });
    } finally {
      setCreating(false);
    }
  };

  const startSession = async () => {
    if (!activeSession) return;
    const { data, error } = await supabase.functions.invoke("start-session", {
      body: { session_id: activeSession.id },
    });
    const r = data as any;
    if (error || !r?.ok) {
      toast({ title: "Ошибка", description: r?.error ?? error?.message, variant: "destructive" });
      return;
    }
    setActiveSession(r.session);
    toast({ title: "Старт!", description: "Тест запущен у всех учеников" });
  };

  const stopSession = async () => {
    if (!activeSession) return;
    if (!confirm("Завершить сессию досрочно? Все ученики увидят экран окончания.")) return;
    const { data, error } = await supabase.functions.invoke("stop-session", {
      body: { session_id: activeSession.id },
    });
    const r = data as any;
    if (error || !r?.ok) {
      toast({ title: "Ошибка", description: r?.error ?? error?.message, variant: "destructive" });
      return;
    }
    setActiveSession((s) => (s ? { ...s, status: "finished" } : s));
  };

  const copyCode = () => {
    if (!activeSession) return;
    navigator.clipboard.writeText(activeSession.code);
    toast({ title: "Код скопирован" });
  };

  const remaining = useMemo(() => {
    if (!activeSession?.ends_at) return null;
    const ms = new Date(activeSession.ends_at).getTime() - now;
    return Math.max(0, Math.floor(ms / 1000));
  }, [activeSession?.ends_at, now]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const submittedCount = participants.filter((p) => p.submitted_at).length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/teacher/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> К кабинету
          </Link>
          <h1 className="text-2xl font-semibold">Live-сессии</h1>
          <div />
        </div>

        {!activeSession && (
          <Card>
            <CardHeader>
              <CardTitle>Создать live-сессию</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Нет опубликованных тестов. Сначала опубликуйте тест в кабинете.
                </p>
              ) : (
                <>
                  <div>
                    <Label>Тест</Label>
                    <select
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={selectedTestId}
                      onChange={(e) => setSelectedTestId(e.target.value)}
                    >
                      {tests.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({t.kind})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="dur">Длительность, минут</Label>
                    <Input
                      id="dur"
                      type="number"
                      min={1}
                      max={300}
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value) || 40)}
                      className="mt-1 w-32"
                    />
                  </div>
                  <Button onClick={createSession} disabled={creating || !selectedTestId}>
                    <Plus className="h-4 w-4 mr-2" /> Создать сессию
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {activeSession && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Код сессии</span>
                  <Badge variant={activeSession.status === "running" ? "default" : "secondary"}>
                    {activeSession.status === "waiting" && "ожидание"}
                    {activeSession.status === "running" && "идёт"}
                    {activeSession.status === "finished" && "завершено"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center gap-3 py-6 bg-muted rounded-lg">
                  <span className="text-6xl font-mono font-bold tracking-widest text-primary">
                    {activeSession.code}
                  </span>
                  <Button variant="ghost" size="icon" onClick={copyCode}>
                    <Copy className="h-5 w-5" />
                  </Button>
                </div>

                {activeSession.status === "running" && remaining !== null && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Осталось</p>
                    <p className="text-3xl font-mono font-semibold">{fmt(remaining)}</p>
                  </div>
                )}

                <div className="flex gap-2 justify-center">
                  {activeSession.status === "waiting" && (
                    <Button onClick={startSession}>
                      <Play className="h-4 w-4 mr-2" /> Старт
                    </Button>
                  )}
                  {activeSession.status === "running" && (
                    <Button variant="destructive" onClick={stopSession}>
                      <Square className="h-4 w-4 mr-2" /> Стоп досрочно
                    </Button>
                  )}
                  {activeSession.status === "finished" && (
                    <Button variant="outline" onClick={() => setActiveSession(null)}>
                      Закрыть и создать новую
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Участники: {participants.length}
                  {activeSession.status !== "waiting" && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      (сдали: {submittedCount})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Пока никто не подключился…</p>
                ) : (
                  <ul className="divide-y">
                    {participants.map((p) => (
                      <li key={p.id} className="py-2 flex items-center justify-between">
                        <span>{p.student_name}</span>
                        {p.submitted_at ? (
                          <Badge>сдано</Badge>
                        ) : (
                          <Badge variant="outline">в работе</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

// Ученик: вход по коду класса + ФИО, комната ожидания, тест с общим таймером.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2 } from "lucide-react";
import LiveSessionRunner from "@/components/LiveSessionRunner";

const RUSSIAN_NAME_REGEX = /^[А-ЯЁа-яё]+\s+[А-ЯЁа-яё]+$/;

interface JoinedSession {
  id: string;
  test_id: string;
  status: "waiting" | "running" | "finished";
  duration_sec: number;
  started_at: string | null;
  ends_at: string | null;
  test_title: string;
  test_kind: "quiz" | "written" | "hybrid";
  subject_name: string;
  class_name: string;
}
interface JoinedAttempt {
  id: string;
  draft_answers: any;
  current_phase: string;
  current_question: number;
  cheat_log: any[];
}

type Phase = "input" | "waiting" | "running" | "finished";

export default function LiveStudent() {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [phase, setPhase] = useState<Phase>("input");
  const [session, setSession] = useState<JoinedSession | null>(null);
  const [attempt, setAttempt] = useState<JoinedAttempt | null>(null);

  const channelRef = useRef<any>(null);
  const broadcastRef = useRef<any>(null);
  const pollRef = useRef<any>(null);

  // Перепроверка статуса через join-session (используется и поллингом, и broadcast'ом)
  const recheck = async () => {
    const codeTrim = code.trim().toUpperCase();
    if (!codeTrim || !name.trim()) return;
    try {
      const { data } = await supabase.functions.invoke("join-session", {
        body: { code: codeTrim, student_name: name.trim() },
      });
      const r = data as any;
      if (!r?.ok) return;
      if (r.session) {
        setSession((prev) => (prev ? { ...prev, ...r.session } : r.session));
        if (r.session.status === "running" && r.attempt) {
          setAttempt(r.attempt);
          setPhase("running");
        } else if (r.session.status === "finished") {
          setPhase("finished");
        }
      }
    } catch {
      /* ignore */
    }
  };

  // Realtime подписка на сессию (быстрый путь, может не сработать из-за RLS — это ок)
  useEffect(() => {
    if (!session) return;
    const ch = supabase
      .channel(`live-stu-${session.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "test_sessions", filter: `id=eq.${session.id}` },
        async (p) => {
          const ns = p.new as any;
          if (!ns) return;
          setSession((prev) => (prev ? { ...prev, ...ns } : prev));
          if (ns.status === "running" && phase === "waiting") {
            await recheck();
          }
          if (ns.status === "finished") {
            setPhase("finished");
          }
        },
      )
      .subscribe();
    channelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, phase, code, name]);

  // Broadcast канал — без RLS, мгновенная доставка start/stop по коду
  useEffect(() => {
    if (phase !== "waiting") return;
    const codeTrim = code.trim().toUpperCase();
    if (!codeTrim) return;
    const ch = supabase
      .channel("live-broadcast", { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "session_started" }, (msg: any) => {
        if (msg?.payload?.code === codeTrim) {
          recheck();
        }
      })
      .on("broadcast", { event: "session_finished" }, (msg: any) => {
        if (msg?.payload?.code === codeTrim) {
          setPhase("finished");
        }
      })
      .subscribe();
    broadcastRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, code, name]);

  // Фолбэк-поллинг — каждые 3 сек, пока ждём
  useEffect(() => {
    if (phase !== "waiting") return;
    pollRef.current = setInterval(() => {
      recheck();
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, code, name]);

  const join = async () => {
    const codeTrim = code.trim().toUpperCase();
    if (codeTrim.length !== 4) {
      toast({ title: "Код", description: "Код состоит из 4 символов", variant: "destructive" });
      return;
    }
    if (!RUSSIAN_NAME_REGEX.test(name.trim())) {
      toast({ title: "Имя", description: "Введите Имя и Фамилию русскими буквами", variant: "destructive" });
      return;
    }
    setJoining(true);
    try {
      const { data, error } = await supabase.functions.invoke("join-session", {
        body: { code: codeTrim, student_name: name.trim() },
      });
      const r = data as any;
      if (error || !r?.ok) {
        toast({ title: "Не удалось войти", description: r?.error ?? error?.message, variant: "destructive" });
        return;
      }
      setSession(r.session);
      if (r.session.status === "waiting") {
        setPhase("waiting");
      } else if (r.session.status === "running" && r.attempt) {
        setAttempt(r.attempt);
        setPhase("running");
      }
    } finally {
      setJoining(false);
    }
  };

  // ====== UI ======

  if (phase === "input") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Link to="/" className="text-sm text-muted-foreground inline-flex items-center mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> На главную
            </Link>
            <CardTitle>Войти по коду класса</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="code">Код от учителя</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Например: 7K2P"
                maxLength={4}
                className="mt-1 text-center text-2xl font-mono tracking-widest uppercase"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="name">Имя и Фамилия</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Иванов"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Два слова на русском</p>
            </div>
            <Button className="w-full" size="lg" onClick={join} disabled={joining}>
              {joining ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Войти
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "waiting" && session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Комната ожидания</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 py-6">
            <div className="text-5xl">⏳</div>
            <p className="text-lg font-medium">{session.test_title}</p>
            <p className="text-sm text-muted-foreground">
              {session.class_name} • {session.subject_name}
            </p>
            <p className="text-sm">
              <strong>{name.trim()}</strong>, ждите — учитель скоро запустит тест.
            </p>
            <p className="text-xs text-muted-foreground">
              Не закрывайте вкладку. Тест начнётся автоматически.
            </p>
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "running" && session && attempt && session.ends_at) {
    return (
      <LiveSessionRunner
        testId={session.test_id}
        testTitle={session.test_title}
        testKind={session.test_kind}
        attemptId={attempt.id}
        studentName={name.trim()}
        endsAt={session.ends_at}
        initialDraft={attempt.draft_answers}
        onFinished={() => setPhase("finished")}
      />
    );
  }

  // finished
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="py-12 space-y-4">
          <div className="text-5xl">🔒</div>
          <h2 className="text-xl font-bold">Тест завершён</h2>
          <p className="text-muted-foreground">Ответы отправлены учителю.</p>
          <Link to="/">
            <Button variant="outline">На главную</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Eye, Film, RefreshCw } from "lucide-react";

interface Result {
  id: string;
  created_at: string | null;
  student_name: string;
  subject: string;
  grade: number;
  attempt: number | null;
  time_spent: number | null;
  cheat_log: any;
  answers: any;
  replay_url: string | null;
  test_type: string | null;
}

interface Props {
  isAdmin?: boolean;
}

export default function TestResultsList({ isAdmin = false }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Result[]>([]);
  const [allowedSubjects, setAllowedSubjects] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [onlyCheats, setOnlyCheats] = useState(false);
  const [detail, setDetail] = useState<Result | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("test_results")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setRows((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  // Для учителя — узнаём предметы из назначений
  useEffect(() => {
    if (isAdmin || !user) {
      setAllowedSubjects(null);
      return;
    }
    (async () => {
      const { data: t } = await supabase.from("teachers").select("id").eq("user_id", user.id).maybeSingle();
      if (!t) {
        setAllowedSubjects([]);
        return;
      }
      const { data: a } = await supabase
        .from("teacher_assignments")
        .select("subject:subjects(name)")
        .eq("teacher_id", t.id);
      const names = Array.from(new Set((a ?? []).map((x: any) => x.subject?.name).filter(Boolean)));
      setAllowedSubjects(names);
    })();
  }, [user, isAdmin]);

  const subjects = useMemo(
    () => Array.from(new Set(rows.map((r) => r.subject).filter(Boolean))),
    [rows],
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (allowedSubjects && allowedSubjects.length > 0 && !allowedSubjects.includes(r.subject)) return false;
      if (subjectFilter !== "all" && r.subject !== subjectFilter) return false;
      if (search.trim() && !r.student_name.toLowerCase().includes(search.toLowerCase())) return false;
      const cheats = Array.isArray(r.cheat_log) ? r.cheat_log.length : 0;
      if (onlyCheats && cheats === 0) return false;
      return true;
    });
  }, [rows, allowedSubjects, subjectFilter, search, onlyCheats]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Результаты учеников</CardTitle>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Обновить
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Поиск по имени"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="sm:max-w-xs"><SelectValue placeholder="Предмет" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все предметы</SelectItem>
              {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            variant={onlyCheats ? "default" : "outline"}
            onClick={() => setOnlyCheats((v) => !v)}
          >
            Только с нарушениями
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Ученик</TableHead>
                <TableHead>Предмет</TableHead>
                <TableHead>Балл</TableHead>
                <TableHead>Поп.</TableHead>
                <TableHead>Время, c</TableHead>
                <TableHead>Наруш.</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    Пока нет результатов
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((r) => {
                const cheats = Array.isArray(r.cheat_log) ? r.cheat_log.length : 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">
                      {r.created_at ? new Date(r.created_at).toLocaleString("ru-RU") : "—"}
                    </TableCell>
                    <TableCell>{r.student_name}</TableCell>
                    <TableCell>{r.subject}</TableCell>
                    <TableCell><Badge variant="secondary">{r.grade}</Badge></TableCell>
                    <TableCell>{r.attempt ?? 1}</TableCell>
                    <TableCell>{r.time_spent ?? "—"}</TableCell>
                    <TableCell>
                      {cheats > 0 ? <Badge variant="destructive">{cheats}</Badge> : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {r.replay_url && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={r.replay_url} target="_blank" rel="noreferrer"><Film className="h-4 w-4" /></a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.student_name} — {detail?.subject}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium mb-1">Балл: {detail.grade}</p>
                <p className="text-muted-foreground text-xs">
                  {detail.created_at ? new Date(detail.created_at).toLocaleString("ru-RU") : ""}
                  {" · "}тип: {detail.test_type ?? "—"}
                </p>
              </div>
              {Array.isArray(detail.answers?.per_question) && detail.answers.per_question.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Время по вопросам</p>
                  <div className="rounded border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>№</TableHead>
                          <TableHead>Выбран</TableHead>
                          <TableHead>Правильный</TableHead>
                          <TableHead>Время, с</TableHead>
                          <TableHead>Таймаут</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.answers.per_question.map((pq: any, i: number) => {
                          const br = detail.answers?.breakdown?.[i];
                          return (
                            <TableRow key={i}>
                              <TableCell>{(pq.position ?? i) + 1}</TableCell>
                              <TableCell>{br?.user_answer ?? "—"}</TableCell>
                              <TableCell>{br?.correct ?? "—"}</TableCell>
                              <TableCell>{pq.time_spent ?? "—"}</TableCell>
                              <TableCell>{pq.timed_out ? "да" : "нет"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              <div>
                <p className="font-medium mb-1">Ответы</p>
                <pre className="bg-muted p-2 rounded text-xs whitespace-pre-wrap break-words max-h-64 overflow-auto">
{JSON.stringify(detail.answers, null, 2)}
                </pre>
              </div>
              <div>
                <p className="font-medium mb-1">Нарушения ({Array.isArray(detail.cheat_log) ? detail.cheat_log.length : 0})</p>
                <pre className="bg-muted p-2 rounded text-xs whitespace-pre-wrap break-words max-h-64 overflow-auto">
{JSON.stringify(detail.cheat_log ?? [], null, 2)}
                </pre>
              </div>
              {detail.replay_url && (
                <a href={detail.replay_url} target="_blank" rel="noreferrer" className="text-primary underline text-sm">
                  Открыть запись сессии ↗
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

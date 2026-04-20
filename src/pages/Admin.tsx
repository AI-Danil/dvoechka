import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import TeacherLoginGate from "@/components/TeacherLoginGate";
import { useTeacherAuth } from "@/hooks/useTeacherAuth";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Play, FileText, RefreshCw, Video } from "lucide-react";

interface ResultRow {
  id: string;
  student_name: string;
  grade: number;
  subject: string;
  test_type: string | null;
  attempt: number | null;
  time_spent: number | null;
  cheat_count: number;
  replay_url: string | null;
  created_at: string;
}

function AdminInner() {
  const { token, logout } = useTeacherAuth();
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("[Admin] load(): invoking list-results, token len:", (token || "").length);
      const { data, error: invokeErr } = await supabase.functions.invoke("list-results", {
        headers: { "x-teacher-token": token || "" },
      });
      console.log("[Admin] list-results response:", { invokeErr, data });
      if (invokeErr) {
        const msg = String((invokeErr as Error)?.message || invokeErr);
        // ВАЖНО: не делаем logout автоматически — раньше любая ошибка fetch (network/CORS)
        // выглядела как "non-2xx" и моментально выкидывала юзера обратно на логин.
        // Теперь только показываем ошибку, юзер сам решит.
        if (msg.toLowerCase().includes("unauthorized") || msg.includes("401")) {
          setError("Сессия истекла. Войдите заново и попробуйте снова.");
        } else {
          setError(`Ошибка загрузки: ${msg}`);
        }
        return;
      }
      if (data?.error) {
        setError(String(data.error));
        return;
      }
      setRows(data?.results || []);
    } catch (e) {
      console.error("[Admin] load() exception:", e);
      setError(`Не удалось загрузить результаты: ${(e as Error)?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("test_results_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "test_results" },
        () => { void load(); }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.student_name.toLowerCase().includes(q) ||
      String(r.grade).includes(q) ||
      r.subject.toLowerCase().includes(q) ||
      (r.test_type || "").toLowerCase().includes(q)
    );
  });

  const fmtTime = (s: number | null) => {
    if (!s) return "—";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}м ${sec}с`;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Результаты тестов</h1>
            <p className="text-sm text-muted-foreground">Всего записей: {rows.length}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Обновить
            </Button>
            <Button variant="ghost" onClick={logout}>
              <LogOut className="h-4 w-4" /> Выйти
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              <Input
                placeholder="Поиск: имя, класс, предмет, тип…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && <p className="text-destructive text-sm mb-3">{error}</p>}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Ученик</TableHead>
                    <TableHead>Класс</TableHead>
                    <TableHead>Предмет</TableHead>
                    <TableHead>Тест</TableHead>
                    <TableHead>Попытка</TableHead>
                    <TableHead>Время</TableHead>
                    <TableHead>Подозр.</TableHead>
                    <TableHead>Запись</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(r.created_at).toLocaleString("ru-RU")}
                      </TableCell>
                      <TableCell className="font-medium">{r.student_name}</TableCell>
                      <TableCell>{r.grade}</TableCell>
                      <TableCell>{r.subject}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.test_type || "—"}</TableCell>
                      <TableCell>{r.attempt || 1}</TableCell>
                      <TableCell>{fmtTime(r.time_spent)}</TableCell>
                      <TableCell>
                        {r.cheat_count > 0 ? (
                          <Badge variant="destructive">{r.cheat_count}</Badge>
                        ) : (
                          <Badge variant="secondary">0</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.replay_url ? (
                          <Badge variant="default" className="gap-1">
                            <Video className="h-3 w-3" /> есть
                          </Badge>
                        ) : (
                          <Badge variant="outline">нет</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/replay/${r.id}`}>
                              <Play className="h-3 w-3" /> Запись
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="ghost">
                            <Link to={`/replay/${r.id}?tab=log`}>
                              <FileText className="h-3 w-3" /> Лог
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        Нет данных
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Admin() {
  return (
    <TeacherLoginGate>
      <AdminInner />
    </TeacherLoginGate>
  );
}

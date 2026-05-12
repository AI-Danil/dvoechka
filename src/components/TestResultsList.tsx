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
import { Link } from "react-router-dom";
import { Eye, Film, FileText, RefreshCw, Paperclip, Sparkles, Loader2, Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import LegacyAnswerView, { buildLegacyView } from "@/components/LegacyAnswerView";

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
  attachments: any;
  replay_url: string | null;
  test_type: string | null;
  ai_grading: any | null;
  ai_total_score: number | null;
  ai_graded_at: string | null;
  teacher_grade: number | null;
  teacher_comment: string | null;
  teacher_graded_at: string | null;
  _kind?: "result" | "draft";
  _draftUpdatedAt?: string;
}

const MARKER_LABELS: Record<string, string> = {
  off_curriculum: "🚩 не по программе",
  ai_generated_style: "🤖 похоже на ИИ-текст",
  copy_paste: "📋 копипаст",
  empty: "∅ пусто",
};

interface Props {
  isAdmin?: boolean;
}

function formatCheatType(t: string): string {
  const map: Record<string, string> = {
    copy: "📋 Копирование",
    paste: "📥 Вставка",
    cut: "✂️ Вырезание",
    contextmenu: "🖱 Правый клик",
    blur: "👁 Уход с вкладки",
    visibility_hidden: "🙈 Скрыта вкладка",
    devtools: "🛠 DevTools",
    keyboard_shortcut: "⌨️ Шорткат",
    selectstart: "🔤 Выделение текста",
  };
  return map[t] ?? t;
}

export default function TestResultsList({ isAdmin = false }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Result[]>([]);
  const [allowedSubjects, setAllowedSubjects] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [onlyCheats, setOnlyCheats] = useState(false);
  const [includeDrafts, setIncludeDrafts] = useState(true);
  const [onlyDrafts, setOnlyDrafts] = useState(false);
  const [detail, setDetail] = useState<Result | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [teacherGradeInput, setTeacherGradeInput] = useState<string>("");
  const [teacherCommentInput, setTeacherCommentInput] = useState<string>("");
  const [savingGrade, setSavingGrade] = useState(false);

  useEffect(() => {
    if (!detail) return;
    setTeacherGradeInput(detail.teacher_grade != null ? String(detail.teacher_grade) : "");
    setTeacherCommentInput(detail.teacher_comment ?? "");
  }, [detail]);

  const load = async () => {
    setLoading(true);
    const [resultsRes, draftsRes] = await Promise.all([
      supabase
        .from("test_results")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("student_drafts")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(500),
    ]);

    const results: Result[] = ((resultsRes.data ?? []) as any[]).map((r) => ({
      ...r,
      _kind: "result" as const,
    }));

    // Дедуп: если у ученика на тот же test_id (или subject+grade+attempt) уже есть результат — черновик прячем.
    const submittedKeys = new Set(
      results.map((r) =>
        [
          r.student_name?.toLowerCase().trim(),
          r.subject,
          String(r.grade),
          String(r.attempt ?? 1),
        ].join("|"),
      ),
    );

    const drafts: Result[] = ((draftsRes.data ?? []) as any[])
      .map((d) => {
        const writtenObj = d.written && typeof d.written === "object" ? d.written : {};
        const quizObj = d.quiz && typeof d.quiz === "object" ? d.quiz : null;
        const synthAnswers: Record<string, unknown> = { ...writtenObj };
        if (quizObj && Array.isArray((quizObj as any).perQuestion)) {
          synthAnswers.quizResults = { perQuestion: (quizObj as any).perQuestion };
        }
        return {
          id: `draft:${d.id}`,
          created_at: d.updated_at ?? d.created_at,
          student_name: d.student_name,
          subject: d.subject,
          grade: Number(d.grade) || 0,
          attempt: Number(d.attempt) || 1,
          time_spent: null,
          cheat_log: [],
          answers: synthAnswers,
          attachments: {},
          replay_url: null,
          test_type: d.test_id ?? null,
          ai_grading: null,
          ai_total_score: null,
          ai_graded_at: null,
          teacher_grade: null,
          teacher_comment: null,
          teacher_graded_at: null,
          _kind: "draft" as const,
          _draftUpdatedAt: d.updated_at,
        } as Result;
      })
      .filter((d) => {
        const key = [
          d.student_name?.toLowerCase().trim(),
          d.subject,
          String(d.grade),
          String(d.attempt ?? 1),
        ].join("|");
        return !submittedKeys.has(key);
      });

    const merged = [...results, ...drafts].sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });

    setRows(merged);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

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
      if (!includeDrafts && r._kind === "draft") return false;
      if (onlyDrafts && r._kind !== "draft") return false;
      return true;
    });
  }, [rows, allowedSubjects, subjectFilter, search, onlyCheats, includeDrafts, onlyDrafts]);

  // --- helpers for the detail dialog ---
  const detailBreakdown: any[] = useMemo(
    () => (detail && Array.isArray(detail.answers?.breakdown) ? detail.answers.breakdown : []),
    [detail],
  );
  const quizItems = detailBreakdown.filter((b) => b.response_kind === "quiz");
  const writtenItems = detailBreakdown.filter((b) => b.response_kind === "written");
  const score = useMemo(() => {
    const correct = quizItems.filter((q) => q.is_correct).length;
    return { correct, total: quizItems.length };
  }, [quizItems]);

  const cheatList: any[] = Array.isArray(detail?.cheat_log) ? detail!.cheat_log : [];
  const attachments: Record<string, any> =
    detail?.attachments && typeof detail.attachments === "object" ? detail.attachments : {};

  const aiItemsByPos: Record<number, any> = useMemo(() => {
    const map: Record<number, any> = {};
    const items = detail?.ai_grading?.items;
    if (Array.isArray(items)) for (const it of items) map[Number(it.position)] = it;
    return map;
  }, [detail]);

  const runAiGrade = async () => {
    if (!detail) return;
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-grade-written", {
        body: { result_id: detail.id },
      });
      if (error || (data as any)?.error) {
        toast({
          title: "Не удалось оценить",
          description: (data as any)?.error ?? error?.message ?? "Ошибка",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "ИИ оценил работу", description: `Предварительная оценка: ${(data as any).ai_total_score}` });
      await load();
      const { data: fresh } = await supabase.from("test_results").select("*").eq("id", detail.id).maybeSingle();
      if (fresh) setDetail(fresh as any);
    } finally {
      setAiBusy(false);
    }
  };

  const saveTeacherGrade = async () => {
    if (!detail) return;
    const raw = teacherGradeInput.trim();
    const num = raw === "" ? null : Number(raw.replace(",", "."));
    if (num != null && (Number.isNaN(num) || num < 1 || num > 5)) {
      toast({ title: "Оценка должна быть от 1 до 5", variant: "destructive" });
      return;
    }
    setSavingGrade(true);
    const { error } = await supabase
      .from("test_results")
      .update({
        teacher_grade: num,
        teacher_comment: teacherCommentInput || null,
        teacher_graded_at: new Date().toISOString(),
        teacher_graded_by: user?.id ?? null,
      })
      .eq("id", detail.id);
    setSavingGrade(false);
    if (error) {
      toast({ title: "Не удалось сохранить", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Оценка сохранена" });
    await load();
    const { data: fresh } = await supabase.from("test_results").select("*").eq("id", detail.id).maybeSingle();
    if (fresh) setDetail(fresh as any);
  };

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
                <TableHead>Класс</TableHead>
                <TableHead>Поп.</TableHead>
                <TableHead>Время, c</TableHead>
                <TableHead>Наруш.</TableHead>
                <TableHead>Оценка</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
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
                    <TableCell>
                      {r.teacher_grade != null ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">{r.teacher_grade}</Badge>
                      ) : r.ai_total_score != null ? (
                        <Badge variant="outline" className="border-purple-400 text-purple-700">🤖 {r.ai_total_score}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setDetail(r)} title="Подробнее">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" asChild title="Запись экрана">
                        <Link to={`/replay/${r.id}`}><Film className="h-4 w-4" /></Link>
                      </Button>
                      <Button size="sm" variant="ghost" asChild title="Лог событий">
                        <Link to={`/replay/${r.id}?tab=log`}><FileText className="h-4 w-4" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.student_name} — {detail?.subject}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-5 text-sm">
              <div className="flex flex-wrap gap-3 items-center">
                <Badge variant="secondary">Класс: {detail.grade}</Badge>
                {quizItems.length > 0 && (
                  <Badge>Квиз: {score.correct}/{score.total}</Badge>
                )}
                {detail.time_spent != null && (
                  <Badge variant="outline">⏱ {Math.floor(detail.time_spent / 60)}м {detail.time_spent % 60}с</Badge>
                )}
                {detail.ai_total_score != null && (
                  <Badge variant="outline" className="border-purple-400 text-purple-700">
                    🤖 ИИ: {detail.ai_total_score}
                  </Badge>
                )}
                {detail.teacher_grade != null && (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600">
                    👨‍🏫 Учитель: {detail.teacher_grade}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {detail.created_at ? new Date(detail.created_at).toLocaleString("ru-RU") : ""}
                  {" · "}тип: {detail.test_type ?? "—"}
                </span>
              </div>

              {quizItems.length > 0 && (
                <div>
                  <p className="font-semibold mb-2">📋 Квиз</p>
                  <div className="rounded border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">№</TableHead>
                          <TableHead>Выбрано</TableHead>
                          <TableHead>Правильный</TableHead>
                          <TableHead className="w-24">Итог</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quizItems.map((q: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell>{q.position}</TableCell>
                            <TableCell>{String(q.user_answer ?? "—")}</TableCell>
                            <TableCell>{String(q.correct ?? "—")}</TableCell>
                            <TableCell>
                              {q.is_correct ? (
                                <Badge variant="secondary">✓</Badge>
                              ) : (
                                <Badge variant="destructive">✗</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {writtenItems.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">✍ Развёрнутые ответы</p>
                    <Button
                      size="sm"
                      variant={detail.ai_grading ? "outline" : "default"}
                      onClick={runAiGrade}
                      disabled={aiBusy}
                    >
                      {aiBusy ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-1" />
                      )}
                      {detail.ai_grading ? "Переоценить ИИ" : "Оценить через ИИ"}
                    </Button>
                  </div>
                  {detail.ai_grading?.overall_comment && (
                    <div className="mb-3 p-3 rounded border border-purple-200 bg-purple-50 text-xs">
                      <p className="font-medium text-purple-900">🤖 Общее впечатление ИИ</p>
                      <p className="mt-1">{detail.ai_grading.overall_comment}</p>
                      {detail.ai_grading.originality_note && (
                        <p className="mt-1 italic text-purple-800">
                          Оригинальность: {detail.ai_grading.originality_note}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="space-y-3">
                    {writtenItems.map((w: any, i: number) => {
                      const att = attachments[String(w.position)] ?? attachments[w.position];
                      const ai = aiItemsByPos[Number(w.position)];
                      return (
                        <div key={i} className="rounded border p-3 bg-muted/30">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Задание №{w.position}</span>
                              {ai && (
                                <Badge
                                  variant={ai.score === 2 ? "default" : ai.score === 1 ? "secondary" : "destructive"}
                                  className="text-xs"
                                >
                                  ИИ: {ai.score}/2
                                </Badge>
                              )}
                            </div>
                            {att?.url && (
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary text-xs inline-flex items-center gap-1 underline"
                              >
                                <Paperclip className="h-3 w-3" /> {att.name ?? "файл"}
                              </a>
                            )}
                          </div>
                          <pre className="whitespace-pre-wrap break-words text-sm font-sans">
{w.user_answer || <span className="text-muted-foreground">— пусто —</span>}
                          </pre>
                          {ai && (
                            <div className="mt-2 pt-2 border-t border-dashed text-xs space-y-1">
                              <p className="text-muted-foreground">
                                <span className="font-medium text-purple-700">🤖 ИИ:</span> {ai.feedback}
                              </p>
                              {Array.isArray(ai.ai_markers) && ai.ai_markers.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {ai.ai_markers.map((m: string) => (
                                    <Badge key={m} variant="outline" className="border-amber-400 text-amber-800 text-xs">
                                      {MARKER_LABELS[m] ?? m}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {ai.ai_marker_note && (
                                <p className="italic text-muted-foreground">{ai.ai_marker_note}</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {quizItems.length === 0 && writtenItems.length === 0 && buildLegacyView(detail.answers) && (
                <LegacyAnswerView answers={detail.answers} />
              )}

              <div className="rounded border-2 border-emerald-300 p-4 bg-emerald-50/50 space-y-3">
                <p className="font-semibold text-emerald-900">👨‍🏫 Финальная оценка учителя</p>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Оценка (1–5)</label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      step={0.25}
                      value={teacherGradeInput}
                      onChange={(e) => setTeacherGradeInput(e.target.value)}
                      className="w-24"
                      placeholder="—"
                    />
                  </div>
                  <Button onClick={saveTeacherGrade} disabled={savingGrade} className="bg-emerald-600 hover:bg-emerald-700">
                    {savingGrade ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    Сохранить
                  </Button>
                  {detail.teacher_graded_at && (
                    <span className="text-xs text-muted-foreground">
                      сохранено: {new Date(detail.teacher_graded_at).toLocaleString("ru-RU")}
                    </span>
                  )}
                </div>
                <Textarea
                  value={teacherCommentInput}
                  onChange={(e) => setTeacherCommentInput(e.target.value)}
                  placeholder="Комментарий учителя (необязательно)"
                  rows={2}
                />
              </div>


              {Object.keys(attachments).length > 0 && writtenItems.length === 0 && (
                <div>
                  <p className="font-semibold mb-2">📎 Файлы</p>
                  <ul className="space-y-1">
                    {Object.entries(attachments).map(([pos, a]: any) => (
                      <li key={pos}>
                        <a href={a?.url} target="_blank" rel="noreferrer" className="text-primary underline text-sm">
                          Задание №{pos}: {a?.name ?? a?.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="font-semibold mb-2">⚠ Нарушения ({cheatList.length})</p>
                {cheatList.length === 0 ? (
                  <p className="text-muted-foreground text-xs">Нет</p>
                ) : (
                  <div className="rounded border overflow-hidden max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-32">Время</TableHead>
                          <TableHead>Тип</TableHead>
                          <TableHead>Детали</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cheatList.map((ev: any, i: number) => {
                          const ts = ev.ts ?? ev.timestamp ?? ev.time;
                          const date = ts ? new Date(typeof ts === "number" ? ts : ts).toLocaleTimeString("ru-RU") : "—";
                          const type = ev.type ?? ev.event ?? ev.kind ?? "—";
                          const details = ev.detail ?? ev.details ?? ev.text ?? ev.key ?? "";
                          return (
                            <TableRow key={i}>
                              <TableCell className="text-xs">{date}</TableCell>
                              <TableCell className="text-xs">{formatCheatType(String(type))}</TableCell>
                              <TableCell className="text-xs break-words max-w-xs">
                                {typeof details === "object" ? JSON.stringify(details) : String(details)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">Показать сырой JSON</summary>
                <pre className="bg-muted p-2 rounded mt-2 whitespace-pre-wrap break-words max-h-64 overflow-auto">
{JSON.stringify({ answers: detail.answers, cheat_log: detail.cheat_log, attachments: detail.attachments }, null, 2)}
                </pre>
              </details>

              {detail.replay_url && (
                <Link to={`/replay/${detail.id}`} className="text-primary underline text-sm block">
                  🎬 Открыть запись сессии ↗
                </Link>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

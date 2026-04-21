import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trash2, Plus, CheckCircle2 } from "lucide-react";

interface Question {
  id: string;
  position: number;
  question_text: string;
  options: string[];
  correct_index: number | null;
  points: number;
  response_kind: "quiz" | "written";
  block_title: string | null;
  expected_answer: string | null;
  seconds_override: number | null;
}

interface TestRow {
  id: string;
  title: string;
  kind: "quiz" | "written" | "hybrid";
  status: "draft" | "published";
  time_per_question_sec: number;
}

export default function TestPreview({
  testId,
  onClose,
}: {
  testId: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [test, setTest] = useState<TestRow | null>(null);
  const [qs, setQs] = useState<Question[]>([]);
  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    const [{ data: t }, { data: q }] = await Promise.all([
      supabase.from("tests").select("id, title, kind, status, time_per_question_sec").eq("id", testId).maybeSingle(),
      supabase
        .from("test_questions")
        .select("id, position, question_text, options, correct_index, points, response_kind, block_title, expected_answer, seconds_override")
        .eq("test_id", testId)
        .order("position"),
    ]);
    setTest(t as any);
    setQs(((q ?? []) as any).map((x: any) => ({
      ...x,
      options: Array.isArray(x.options) ? x.options : [],
      response_kind: x.response_kind ?? (((t as any)?.kind === "written") ? "written" : "quiz"),
      block_title: x.block_title ?? null,
      expected_answer: x.expected_answer ?? null,
      seconds_override: x.seconds_override ?? null,
    })));
  };

  useEffect(() => {
    load();
  }, [testId]);

  const updateGlobalTime = async (sec: number) => {
    if (!test) return;
    const clamped = Math.max(5, Math.min(300, sec));
    setTest({ ...test, time_per_question_sec: clamped });
    const { error } = await supabase
      .from("tests")
      .update({ time_per_question_sec: clamped })
      .eq("id", test.id);
    if (error) toast({ title: "Не сохранилось", description: error.message, variant: "destructive" });
  };

  const saveQuestion = async (q: Question) => {
    setSavingId(q.id);
    const { error } = await supabase
      .from("test_questions")
      .update({
        question_text: q.question_text,
        options: q.options,
        correct_index: q.correct_index,
        points: q.points,
        response_kind: q.response_kind,
        block_title: q.block_title,
        expected_answer: q.expected_answer,
        seconds_override: q.seconds_override,
      } as any)
      .eq("id", q.id);
    setSavingId(null);
    if (error) toast({ title: "Не сохранилось", description: error.message, variant: "destructive" });
  };

  const deleteQuestion = async (q: Question) => {
    const { error } = await supabase.from("test_questions").delete().eq("id", q.id);
    if (error) return toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    setQs((prev) => prev.filter((x) => x.id !== q.id));
  };

  const addQuestion = async (forKind: "quiz" | "written") => {
    if (!test) return;
    const pos = qs.length;
    const { data, error } = await supabase
      .from("test_questions")
      .insert({
        test_id: testId,
        position: pos,
        question_text: "Новый вопрос",
        options: forKind === "quiz" ? ["", "", "", ""] : [],
        correct_index: null,
        points: 1,
        response_kind: forKind,
      } as any)
      .select("id, position, question_text, options, correct_index, points, response_kind, block_title, expected_answer, seconds_override")
      .single();
    if (error) return toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    setQs((p) => [...p, { ...(data as any), options: (data as any).options ?? [] }]);
  };

  const publish = async () => {
    setBusy(true);
    await Promise.all(qs.map(saveQuestion));
    const { data, error } = await supabase.functions.invoke("publish-test", {
      body: { test_id: testId, action: "publish" },
    });
    setBusy(false);
    const r = data as any;
    if (error || !r?.ok) {
      toast({ title: "Не удалось опубликовать", description: r?.error ?? error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Опубликовано", description: "Тест доступен ученикам" });
    onClose();
  };

  const saveDraft = async () => {
    setBusy(true);
    await Promise.all(qs.map(saveQuestion));
    setBusy(false);
    toast({ title: "Сохранено как черновик" });
    onClose();
  };

  // Группировка по block_title
  const grouped = useMemo(() => {
    const map = new Map<string, Question[]>();
    for (const q of qs) {
      const key = q.block_title || "Без блока";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(q);
    }
    return Array.from(map.entries());
  }, [qs]);

  if (!test) return <p>Загрузка…</p>;

  const kindLabel = test.kind === "hybrid" ? "Смешанный" : test.kind === "quiz" ? "Квиз" : "Самостоятельная";

  const renderQuestion = (q: Question, indexInList: number) => (
    <Card key={q.id} className="bg-muted/30">
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">№{q.position + 1}</Label>
            <Badge variant={q.response_kind === "quiz" ? "default" : "secondary"} className="text-[10px]">
              {q.response_kind === "quiz" ? "Квиз" : "Письм."}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {savingId === q.id && <Loader2 className="h-3 w-3 animate-spin" />}
            <Button size="sm" variant="ghost" onClick={() => deleteQuestion(q)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Textarea
          rows={2}
          value={q.question_text}
          onChange={(e) =>
            setQs((p) => p.map((x) => (x.id === q.id ? { ...x, question_text: e.target.value } : x)))
          }
          onBlur={() => saveQuestion(q)}
        />

        {q.response_kind === "quiz" ? (
          <>
            <RadioGroup
              value={q.correct_index !== null ? String(q.correct_index) : ""}
              onValueChange={(v) => {
                const updated = { ...q, correct_index: Number(v) };
                setQs((p) => p.map((x) => (x.id === q.id ? updated : x)));
                saveQuestion(updated);
              }}
              className="space-y-2"
            >
              {[0, 1, 2, 3].map((oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <RadioGroupItem value={String(oi)} id={`${q.id}-${oi}`} />
                  <span className="text-xs w-4">{["А", "Б", "В", "Г"][oi]})</span>
                  <Input
                    value={q.options[oi] ?? ""}
                    onChange={(e) => {
                      const opts = [...q.options];
                      opts[oi] = e.target.value;
                      while (opts.length < 4) opts.push("");
                      setQs((p) => p.map((x) => (x.id === q.id ? { ...x, options: opts } : x)));
                    }}
                    onBlur={() => saveQuestion(q)}
                  />
                </div>
              ))}
            </RadioGroup>
            {q.correct_index === null && (
              <p className="text-xs text-destructive">⚠ Отметьте правильный вариант</p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Label className="text-xs">Время на этот вопрос (сек):</Label>
              <Input
                type="number"
                min={5}
                max={300}
                className="w-24 h-8"
                placeholder={String(test.time_per_question_sec)}
                value={q.seconds_override ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  setQs((p) => p.map((x) => (x.id === q.id ? { ...x, seconds_override: v } : x)));
                }}
                onBlur={() => saveQuestion(q)}
              />
              <span className="text-xs text-muted-foreground">
                пусто = общее ({test.time_per_question_sec} сек)
              </span>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Баллы:</Label>
              <Input
                type="number"
                min={1}
                max={20}
                className="w-20"
                value={q.points}
                onChange={(e) =>
                  setQs((p) =>
                    p.map((x) => (x.id === q.id ? { ...x, points: Number(e.target.value) || 1 } : x)),
                  )
                }
                onBlur={() => saveQuestion(q)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ожидаемый ответ (виден только учителю)</Label>
              <Textarea
                rows={2}
                value={q.expected_answer ?? ""}
                onChange={(e) =>
                  setQs((p) => p.map((x) => (x.id === q.id ? { ...x, expected_answer: e.target.value } : x)))
                }
                onBlur={() => saveQuestion(q)}
                placeholder="Ключ для проверки…"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            Превью: <span className="text-primary">{test.title}</span>
          </span>
          <span className="text-xs text-muted-foreground">{kindLabel} · {qs.length} вопрос(ов)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
          <Label className="text-sm font-medium">⏱ Время на вопрос квиза по умолчанию (сек):</Label>
          <Input
            type="number"
            min={5}
            max={300}
            className="w-24 h-8"
            value={test.time_per_question_sec}
            onChange={(e) => setTest({ ...test, time_per_question_sec: Number(e.target.value) || 30 })}
            onBlur={() => updateGlobalTime(test.time_per_question_sec)}
          />
          <span className="text-xs text-muted-foreground">5–300; можно переопределить для каждого вопроса</span>
        </div>
        {test.kind === "hybrid" ? (
          grouped.map(([blockTitle, items]) => (
            <div key={blockTitle} className="space-y-2">
              <div className="flex items-center justify-between border-b pb-1">
                <h3 className="text-sm font-semibold">{blockTitle}</h3>
                <span className="text-xs text-muted-foreground">{items.length} вопросов</span>
              </div>
              {items.map((q, i) => renderQuestion(q, i))}
            </div>
          ))
        ) : (
          qs.map((q, i) => renderQuestion(q, i))
        )}

        <div className="flex flex-wrap gap-2">
          {(test.kind === "quiz" || test.kind === "hybrid") && (
            <Button variant="outline" size="sm" onClick={() => addQuestion("quiz")}>
              <Plus className="h-4 w-4 mr-1" /> Добавить квиз-вопрос
            </Button>
          )}
          {(test.kind === "written" || test.kind === "hybrid") && (
            <Button variant="outline" size="sm" onClick={() => addQuestion("written")}>
              <Plus className="h-4 w-4 mr-1" /> Добавить письменную задачу
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <Button onClick={publish} disabled={busy}>
            <CheckCircle2 className="h-4 w-4 mr-2" /> Опубликовать
          </Button>
          <Button variant="outline" onClick={saveDraft} disabled={busy}>
            Сохранить черновик
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

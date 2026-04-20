import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
}

interface TestRow {
  id: string;
  title: string;
  kind: "quiz" | "written";
  status: "draft" | "published";
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
      supabase.from("tests").select("id, title, kind, status").eq("id", testId).maybeSingle(),
      supabase
        .from("test_questions")
        .select("id, position, question_text, options, correct_index, points")
        .eq("test_id", testId)
        .order("position"),
    ]);
    setTest(t as any);
    setQs(((q ?? []) as any).map((x: any) => ({ ...x, options: Array.isArray(x.options) ? x.options : [] })));
  };

  useEffect(() => {
    load();
  }, [testId]);

  const saveQuestion = async (q: Question) => {
    setSavingId(q.id);
    const { error } = await supabase
      .from("test_questions")
      .update({
        question_text: q.question_text,
        options: q.options,
        correct_index: q.correct_index,
        points: q.points,
      })
      .eq("id", q.id);
    setSavingId(null);
    if (error) toast({ title: "Не сохранилось", description: error.message, variant: "destructive" });
  };

  const deleteQuestion = async (q: Question) => {
    const { error } = await supabase.from("test_questions").delete().eq("id", q.id);
    if (error) return toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    setQs((prev) => prev.filter((x) => x.id !== q.id));
  };

  const addQuestion = async () => {
    if (!test) return;
    const pos = qs.length;
    const { data, error } = await supabase
      .from("test_questions")
      .insert({
        test_id: testId,
        position: pos,
        question_text: "Новый вопрос",
        options: test.kind === "quiz" ? ["", "", "", ""] : [],
        correct_index: null,
        points: 1,
      })
      .select("id, position, question_text, options, correct_index, points")
      .single();
    if (error) return toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    setQs((p) => [...p, { ...(data as any), options: (data as any).options ?? [] }]);
  };

  const publish = async () => {
    setBusy(true);
    // сохраняем все правки
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

  if (!test) return <p>Загрузка…</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            Превью: <span className="text-primary">{test.title}</span>
          </span>
          <span className="text-xs text-muted-foreground">
            {test.kind === "quiz" ? "Квиз" : "Самостоятельная"} · {qs.length} вопрос(ов)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {qs.map((q, i) => (
          <Card key={q.id} className="bg-muted/30">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <Label className="text-xs text-muted-foreground">Вопрос {i + 1}</Label>
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

              {test.kind === "quiz" ? (
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
              ) : (
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
              )}

              {test.kind === "quiz" && q.correct_index === null && (
                <p className="text-xs text-destructive">⚠ Отметьте правильный вариант</p>
              )}
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" size="sm" onClick={addQuestion}>
          <Plus className="h-4 w-4 mr-1" /> Добавить вопрос
        </Button>

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

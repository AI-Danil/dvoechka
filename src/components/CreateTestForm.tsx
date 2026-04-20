import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Sparkles } from "lucide-react";
import TestPreview from "@/components/TestPreview";

interface Assignment {
  class_id: string;
  subject_id: string;
  class: { id: string; name: string; year: number } | null;
  subject: { id: string; name: string } | null;
}

interface Props {
  isAdmin?: boolean;
  onCreated?: () => void;
}

export default function CreateTestForm({ isAdmin = false, onCreated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pairs, setPairs] = useState<{ class_id: string; subject_id: string; label: string }[]>([]);
  const [pairKey, setPairKey] = useState<string>("");
  const [kind, setKind] = useState<"quiz" | "written">("quiz");
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [seconds, setSeconds] = useState(30);
  const [busy, setBusy] = useState(false);
  const [createdTestId, setCreatedTestId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      if (isAdmin) {
        const [{ data: classes }, { data: subjects }] = await Promise.all([
          supabase.from("classes").select("id, name, year"),
          supabase.from("subjects").select("id, name"),
        ]);
        const list: typeof pairs = [];
        (classes ?? []).forEach((c) =>
          (subjects ?? []).forEach((s) => {
            list.push({
              class_id: c.id,
              subject_id: s.id,
              label: `${c.name} (${c.year}) — ${s.name}`,
            });
          }),
        );
        setPairs(list);
      } else {
        const { data: t } = await supabase
          .from("teachers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!t) return;
        const { data } = await supabase
          .from("teacher_assignments")
          .select("class_id, subject_id, class:classes(id,name,year), subject:subjects(id,name)")
          .eq("teacher_id", t.id);
        const list = ((data ?? []) as unknown as Assignment[]).map((a) => ({
          class_id: a.class_id,
          subject_id: a.subject_id,
          label: a.class && a.subject ? `${a.class.name} (${a.class.year}) — ${a.subject.name}` : "—",
        }));
        setPairs(list);
      }
    })();
  }, [user, isAdmin]);

  const generate = async () => {
    if (!pairKey) {
      toast({ title: "Выберите класс и предмет", variant: "destructive" });
      return;
    }
    if (rawText.trim().length < 10) {
      toast({ title: "Введите вопросы", variant: "destructive" });
      return;
    }
    const [class_id, subject_id] = pairKey.split("|");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-test", {
        body: {
          raw_text: rawText,
          kind,
          class_id,
          subject_id,
          title: title.trim() || undefined,
          time_per_question_sec: seconds,
        },
      });
      if (error) throw error;
      const r = data as any;
      if (r?.error) throw new Error(r.error);
      toast({ title: "Тест создан", description: `Распознано: ${r.count} вопрос(ов)` });
      setCreatedTestId(r.test_id);
      onCreated?.();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Ошибка генерации",
        description: e?.message ?? "Попробуйте ещё раз",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  if (createdTestId) {
    return (
      <TestPreview
        testId={createdTestId}
        onClose={() => {
          setCreatedTestId(null);
          setRawText("");
          setTitle("");
          onCreated?.();
        }}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" /> Создать тест из текста
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Класс и предмет</Label>
            <select
              className="w-full h-10 border rounded-md px-3 bg-background"
              value={pairKey}
              onChange={(e) => setPairKey(e.target.value)}
            >
              <option value="">— выберите —</option>
              {pairs.map((p) => (
                <option key={`${p.class_id}|${p.subject_id}`} value={`${p.class_id}|${p.subject_id}`}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Тип</Label>
            <RadioGroup value={kind} onValueChange={(v) => setKind(v as any)} className="flex gap-4 pt-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="quiz" id="k-quiz" /> <Label htmlFor="k-quiz">Квиз</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="written" id="k-written" /> <Label htmlFor="k-written">Самостоятельная</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="space-y-1">
          <Label>Название (необязательно — AI придумает сам)</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Контрольная по электричеству" />
        </div>

        {kind === "quiz" && (
          <div className="space-y-1 max-w-xs">
            <Label>Время на вопрос (сек)</Label>
            <Input type="number" min={5} max={300} value={seconds} onChange={(e) => setSeconds(Number(e.target.value) || 30)} />
          </div>
        )}

        <div className="space-y-1">
          <Label>Вставьте вопросы (любой формат, до 20000 символов)</Label>
          <Textarea
            rows={12}
            maxLength={20000}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={
              kind === "quiz"
                ? "1. Что такое сила тока?\nа) ...\nб) ... ✅\nв) ...\nг) ...\n\n2. ..."
                : "Задача 1 (2 балла). Решите...\nЗадача 2 (3 балла). ...\n"
            }
          />
          <p className="text-xs text-muted-foreground">{rawText.length} / 20000</p>
        </div>

        <Button onClick={generate} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Сгенерировать тест
        </Button>
      </CardContent>
    </Card>
  );
}

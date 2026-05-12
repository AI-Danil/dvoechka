import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

/**
 * Generic renderer for legacy test answer payloads (старые "статические" тесты:
 * grade5/6/7/8/9 technology / informatics / physics).
 * Используется как fallback, если в `answers` нет современного `breakdown[]`.
 *
 * Поддерживаемые формы:
 *  - { theory: string[], practice: string[] }                — Grade7Informatics и т.п.
 *  - { answers: string[], quizResults: { perQuestion: [...] } } — Grade5/6 Technology Q4
 *  - { written: string[] } / { practice: string[] }          — частные случаи
 *  - всё остальное → null (вызыватель покажет сырой JSON).
 */

type Section = { title: string; items: { label: string; value: string }[] };
type QuizRow = { idx: number; answer: number | null; correct: number | null; timedOut?: boolean };

export function buildLegacyView(answers: any): {
  sections: Section[];
  quiz: QuizRow[] | null;
} | null {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return null;

  const sections: Section[] = [];
  const pushArray = (title: string, arr: unknown, prefix: string) => {
    if (!Array.isArray(arr) || arr.length === 0) return;
    sections.push({
      title,
      items: arr.map((v, i) => ({
        label: `${prefix} №${i + 1}`,
        value: typeof v === "string" ? v : JSON.stringify(v, null, 2),
      })),
    });
  };

  pushArray("📚 Теоретические вопросы", answers.theory, "Вопрос");
  pushArray("🧮 Практические задачи", answers.practice, "Задача");
  // у некоторых тестов письменные ответы лежат в `answers.answers` или `answers.written`
  if (!answers.theory && !answers.practice) {
    pushArray("✍ Развёрнутые ответы", answers.answers, "Задание");
    pushArray("✍ Развёрнутые ответы", answers.written, "Задание");
  } else {
    // если есть theory/practice — возможно ещё `answers.answers` это что-то отдельное
    pushArray("✍ Дополнительные ответы", answers.written, "Задание");
  }

  let quiz: QuizRow[] | null = null;
  const per = answers?.quizResults?.perQuestion;
  if (Array.isArray(per) && per.length > 0) {
    quiz = per.map((p: any, i: number) => ({
      idx: i + 1,
      answer: typeof p?.answer === "number" ? p.answer : null,
      correct: typeof p?.correct === "number" ? p.correct : null,
      timedOut: !!p?.timedOut,
    }));
  }

  if (sections.length === 0 && !quiz) return null;
  return { sections, quiz };
}

export default function LegacyAnswerView({ answers }: { answers: any }) {
  const view = buildLegacyView(answers);
  if (!view) return null;

  return (
    <div className="space-y-5">
      {view.quiz && (
        <div>
          <p className="font-semibold mb-2">📋 Квиз</p>
          <div className="rounded border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">№</TableHead>
                  <TableHead>Ответ ученика</TableHead>
                  <TableHead>Правильный</TableHead>
                  <TableHead className="w-24">Итог</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {view.quiz.map((q) => {
                  const ok = q.answer != null && q.answer === q.correct;
                  return (
                    <TableRow key={q.idx}>
                      <TableCell>{q.idx}</TableCell>
                      <TableCell>
                        {q.answer == null ? "—" : String.fromCharCode(65 + q.answer)}
                        {q.timedOut && <span className="text-xs text-muted-foreground ml-1">(таймаут)</span>}
                      </TableCell>
                      <TableCell>{q.correct == null ? "—" : String.fromCharCode(65 + q.correct)}</TableCell>
                      <TableCell>
                        {ok ? (
                          <Badge variant="secondary">✓</Badge>
                        ) : (
                          <Badge variant="destructive">✗</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {view.sections.map((sec) => (
        <div key={sec.title}>
          <p className="font-semibold mb-2">{sec.title}</p>
          <div className="space-y-3">
            {sec.items.map((it) => (
              <div key={it.label} className="rounded border p-3 bg-muted/30">
                <p className="font-medium mb-1 text-sm">{it.label}</p>
                <pre className="whitespace-pre-wrap break-words text-sm font-sans">
{it.value || <span className="text-muted-foreground">— пусто —</span>}
                </pre>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

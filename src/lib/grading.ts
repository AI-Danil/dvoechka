/**
 * Чистые функции для подсчёта оценки — переиспользуются и в edge function,
 * и в unit-тестах.
 */

export interface QuizQuestion {
  position: number;
  correct_index: number | null;
  points: number;
}

export interface QuizAnswer {
  position: number;
  selected_index: number | null;
}

export interface GradeBreakdown {
  totalPoints: number;
  maxPoints: number;
  correctCount: number;
  totalCount: number;
  percentage: number;
  mark: 2 | 3 | 4 | 5;
}

/** Стандартная школьная шкала: <50% — 2, 50-69 — 3, 70-89 — 4, ≥90 — 5. */
export function percentageToMark(percentage: number): 2 | 3 | 4 | 5 {
  if (percentage >= 90) return 5;
  if (percentage >= 70) return 4;
  if (percentage >= 50) return 3;
  return 2;
}

/** Подсчитывает баллы за quiz-ответы. */
export function gradeQuiz(questions: QuizQuestion[], answers: QuizAnswer[]): GradeBreakdown {
  const byPos = new Map<number, QuizAnswer>();
  for (const a of answers) byPos.set(a.position, a);

  let totalPoints = 0;
  let maxPoints = 0;
  let correctCount = 0;
  const totalCount = questions.length;

  for (const q of questions) {
    const points = q.points || 1;
    maxPoints += points;
    if (q.correct_index === null || q.correct_index === undefined) continue;
    const ans = byPos.get(q.position);
    if (ans && ans.selected_index === q.correct_index) {
      totalPoints += points;
      correctCount += 1;
    }
  }

  const percentage = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;
  return {
    totalPoints,
    maxPoints,
    correctCount,
    totalCount,
    percentage,
    mark: percentageToMark(percentage),
  };
}

/** Парсит номер класса из строки "7А", "8 класс", "9". */
export function parseClassNumber(name: string | undefined | null): number | null {
  if (!name) return null;
  const m = String(name).match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

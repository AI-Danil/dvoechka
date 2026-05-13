/**
 * Штрафная система оценивания квиза.
 *   correct → +points
 *   skip (-2) → 0
 *   wrong (timeout = -1, любой другой неверный) → -points * penalty
 * Итоговая сумма не может быть меньше 0. Процент = sum / maxPoints.
 */

export interface PenaltyQuestion {
  correct: number; // 0..3
  points?: number; // default 1
}

export interface PenaltyAnswer {
  /** Ответ ученика. -2 = «не знаю», -1 = таймаут, 0..3 = выбранный вариант. */
  answer: number;
}

export interface PenaltyBreakdown {
  totalScore: number; // can be 0..maxPoints (clamped, no negative)
  maxPoints: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  percentage: number;
  mark: 2 | 3 | 4 | 5;
  perQuestion: Array<{
    position: number;
    status: "correct" | "wrong" | "skipped";
    delta: number; // +points / -points*penalty / 0
  }>;
}

export function gradeWithPenalty(
  questions: PenaltyQuestion[],
  answers: PenaltyAnswer[],
  opts: { penalty?: number } = {},
): PenaltyBreakdown {
  const penalty = opts.penalty ?? 0.5;
  let raw = 0;
  let maxPoints = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  const perQuestion: PenaltyBreakdown["perQuestion"] = [];

  questions.forEach((q, i) => {
    const points = q.points ?? 1;
    maxPoints += points;
    const a = answers[i]?.answer ?? -1;
    let status: "correct" | "wrong" | "skipped" = "wrong";
    let delta = 0;
    if (a === -2) {
      status = "skipped";
      delta = 0;
      skippedCount += 1;
    } else if (a === q.correct) {
      status = "correct";
      delta = points;
      correctCount += 1;
    } else {
      status = "wrong";
      delta = -points * penalty;
      wrongCount += 1;
    }
    raw += delta;
    perQuestion.push({ position: i + 1, status, delta });
  });

  const totalScore = Math.max(0, raw);
  const percentage = maxPoints > 0 ? (totalScore / maxPoints) * 100 : 0;
  const mark: 2 | 3 | 4 | 5 =
    percentage >= 90 ? 5 : percentage >= 70 ? 4 : percentage >= 50 ? 3 : 2;

  return {
    totalScore,
    maxPoints,
    correctCount,
    wrongCount,
    skippedCount,
    percentage,
    mark,
    perQuestion,
  };
}

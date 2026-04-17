import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface QuizQuestion {
  q: string;
  options: [string, string, string, string];
  correct: number; // 0..3
}

export interface QuizPerQuestionResult {
  answer: number; // -1 if no answer
  correct: number;
  timeSpent: number; // seconds
  timedOut: boolean;
}

export interface QuizResults {
  answers: number[];
  correct: number;
  total: number;
  perQuestion: QuizPerQuestionResult[];
}

interface QuizProps {
  questions: QuizQuestion[];
  secondsPerQuestion: number;
  onFinish: (results: QuizResults) => void;
}

const Quiz = ({ questions, secondsPerQuestion, onFinish }: QuizProps) => {
  const [idx, setIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(secondsPerQuestion);
  const resultsRef = useRef<QuizPerQuestionResult[]>([]);
  const startedAtRef = useRef<number>(Date.now());
  const finishedRef = useRef(false);

  // Reset timer for each question
  useEffect(() => {
    setSecondsLeft(secondsPerQuestion);
    startedAtRef.current = Date.now();
  }, [idx, secondsPerQuestion]);

  // Tick
  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // time-out → record and advance
          recordAndAdvance(-1, true);
          return secondsPerQuestion;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const recordAndAdvance = (answer: number, timedOut: boolean) => {
    const q = questions[idx];
    if (!q) return;
    const timeSpent = Math.min(
      secondsPerQuestion,
      Math.round((Date.now() - startedAtRef.current) / 1000)
    );
    resultsRef.current.push({
      answer,
      correct: q.correct,
      timeSpent,
      timedOut,
    });

    if (idx + 1 >= questions.length) {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const per = resultsRef.current;
      const correctCount = per.filter((r) => r.answer === r.correct).length;
      onFinish({
        answers: per.map((r) => r.answer),
        correct: correctCount,
        total: questions.length,
        perQuestion: per,
      });
    } else {
      setIdx((i) => i + 1);
    }
  };

  const q = questions[idx];
  if (!q) return null;

  const percent = Math.round((secondsLeft / secondsPerQuestion) * 100);
  const labels = ["А", "Б", "В", "Г"];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Вопрос {idx + 1} из {questions.length}
            </span>
            <span
              className={`font-mono font-bold text-lg ${
                secondsLeft <= 5 ? "text-destructive" : "text-foreground"
              }`}
            >
              ⏱ {secondsLeft} сек
            </span>
          </div>
          <Progress value={percent} className="h-2 mt-2" />
          <CardTitle className="text-xl mt-4" style={{ userSelect: "none" }}>
            {q.q}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {q.options.map((opt, i) => (
            <Button
              key={i}
              variant="outline"
              size="lg"
              className="w-full justify-start text-left h-auto py-3 whitespace-normal"
              style={{ userSelect: "none" }}
              onClick={() => recordAndAdvance(i, false)}
            >
              <span className="font-bold mr-3">{labels[i]})</span>
              <span className="flex-1">{opt}</span>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default Quiz;

interface QuizIntroProps {
  questionsCount: number;
  secondsPerQuestion: number;
  onStart: () => void;
}

export const QuizIntro = ({ questionsCount, secondsPerQuestion, onStart }: QuizIntroProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg text-center">
        <CardHeader>
          <CardTitle className="text-2xl">🎯 Сейчас будет квиз</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {questionsCount} вопросов, по {secondsPerQuestion} секунд на каждый.
            Один правильный вариант ответа.
          </p>
          <p className="text-sm text-muted-foreground">
            ⚠️ Назад вернуться нельзя. Если не ответите за {secondsPerQuestion} секунд —
            вопрос пропускается.
          </p>
          <p className="text-sm text-muted-foreground">
            После квиза начнётся основная контрольная работа (40 минут).
          </p>
          <Button onClick={onStart} size="lg" className="w-full mt-2">
            Начать квиз
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

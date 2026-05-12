/**
 * Главная страница ученика. Обычный (не-live) режим прохождения теста.
 *
 * Поток:
 *   1. Intake-экран: выбор класса → предмета → теста + ввод ФИО (см. strictRules).
 *   2. Тест-экран: квиз (Quiz.tsx) + письменная часть (компонент из quizRegistry).
 *   3. Сабмит: send-test-results edge fn → запись в test_results + Telegram-отчёт.
 *
 * Автосохранение (3 уровня):
 *   - localStorage  — мгновенно, на каждое изменение поля.
 *   - student_drafts (server) — debounce 5 сек, beacon flush на pagehide.
 *   - clear-draft   — при успешной сдаче.
 *
 * Идентификация ученика — композитный ключ (student_name, grade, subject,
 * test_id, attempt). Без Supabase Auth — анонимный поток.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import Grade8Informatics from "@/components/tests/Grade8Informatics";
import Grade7Informatics from "@/components/tests/Grade7Informatics";
import Grade9Informatics from "@/components/tests/Grade9Informatics";
import Grade9Physics from "@/components/tests/Grade9Physics";
import Grade9Technology from "@/components/tests/Grade9Technology";
import Grade7Technology from "@/components/tests/Grade7Technology";
import Grade8Physics from "@/components/tests/Grade8Physics";
import Grade8PhysicsPower from "@/components/tests/Grade8PhysicsPower";
import Grade8PhysicsFinalQ4, { FINAL_Q4_QUIZ_QUESTIONS } from "@/components/tests/Grade8PhysicsFinalQ4";
import Grade6TechnologyFinalQ4, { FINAL_Q4_TECH6_QUIZ_QUESTIONS } from "@/components/tests/Grade6TechnologyFinalQ4";
import Grade5TechnologyFinalQ4V2, { FINAL_Q4_TECH5_V2_QUIZ_QUESTIONS } from "@/components/tests/Grade5TechnologyFinalQ4V2";
import Grade5TechnologyFinalQ4V3, { FINAL_Q4_TECH5_V3_QUIZ_QUESTIONS } from "@/components/tests/Grade5TechnologyFinalQ4V3";
import Grade8TechnologyFinalQ4Theory, { FINAL_Q4_TECH8_THEORY_QUIZ_QUESTIONS } from "@/components/tests/Grade8TechnologyFinalQ4Theory";
import Grade9TechnologyFinalQ4, { FINAL_Q4_TECH9_QUIZ_QUESTIONS } from "@/components/tests/Grade9TechnologyFinalQ4";
import Grade7TechnologyFinalQ4, { FINAL_Q4_TECH7_QUIZ_QUESTIONS } from "@/components/tests/Grade7TechnologyFinalQ4";
import Grade7Physics from "@/components/tests/Grade7Physics";
import Grade7PhysicsWork, { WORK_POWER_QUIZ_QUESTIONS } from "@/components/tests/Grade7PhysicsWork";
import Grade9PhysicsAtom, { ATOM_QUIZ_QUESTIONS } from "@/components/tests/Grade9PhysicsAtom";
import Grade8InformaticsPython, { PYTHON_HERO_QUIZ_QUESTIONS } from "@/components/tests/Grade8InformaticsPython";
import Quiz, { QuizIntro, type QuizQuestion, type QuizResults } from "@/components/Quiz";
import RecordingBadge from "@/components/RecordingBadge";
import { useRrwebRecorder } from "@/hooks/useRrwebRecorder";
import DbTestRunner from "@/components/DbTestRunner";
import { loadPublishedTestsForGradeSubject, type DbTestSummary } from "@/lib/dbTests";
import { safeRandomUUID } from "@/lib/safeRandomUUID";
import { checkRecordingStorage } from "@/lib/checkRecordingStorage";

type Screen = "login" | "test" | "success";
type LoginStep = "grade" | "subject" | "name" | "test-pick";
type QuizPhase = "intro" | "running" | "done";

const TOTAL_TIME = 40 * 60;

const AVAILABLE_TESTS: Record<string, string[]> = {
  "5": ["technology"],
  "6": ["technology"],
  "7": ["informatics", "technology", "physics"],
  "8": ["informatics", "physics", "technology"],
  "9": ["informatics", "physics", "technology"],
};

const SUBJECT_LABELS: Record<string, string> = {
  informatics: "Информатика",
  physics: "Физика",
  technology: "Технология",
};

interface TestEntry {
  id: string;
  title: string;
  date?: string;
}

const TESTS_CATALOG: Record<string, Record<string, TestEntry[]>> = {
  "5": {
    technology: [
      { id: "final-q4-v3", title: "🌟 Итоговая контрольная за 4 четверть (Вариант 3)" },
    ],
  },
  "6": {
    technology: [
      { id: "final-q4", title: "Итоговая контрольная за 4 четверть (с квизом)" },
    ],
  },
  "7": {
    informatics: [{ id: "default", title: "Итоговая контрольная (3 четверть)" }],
    physics: [
      { id: "default", title: "Контрольная №1. Давление, Архимедова сила" },
      { id: "work-power", title: "Контрольная №2. Механическая работа и Мощность" },
    ],
    technology: [
      { id: "final-q4", title: "🌟 Итоговая годовая контрольная за 4 четверть (с квизом)" },
      { id: "default", title: "Итоговая контрольная (3 четверть)" },
    ],
  },
  "8": {
    informatics: [
      { id: "default", title: "Итоговая контрольная (3 четверть)" },
      { id: "python-hero", title: "Самостоятельная №2. Python: Генератор героя", date: "20.04.2026" },
    ],
    physics: [
      { id: "electricity", title: "Контрольная №1. Электричество (3 четверть)" },
      { id: "power-joule", title: "Контрольная №2. Работа и мощность тока. Закон Джоуля—Ленца" },
      { id: "final-q4", title: "Итоговая контрольная за 4 четверть (с квизом)" },
    ],
    technology: [
      { id: "final-q4-theory", title: "🌟 Итоговая контрольная за 4 четверть. Теория: Python и логика ветвлений" },
    ],
  },
  "9": {
    informatics: [{ id: "default", title: "Итоговая контрольная (3 четверть)" }],
    physics: [
      { id: "default", title: "Контрольная №1. Механика, волны, оптика" },
      { id: "atom", title: "Контрольная №2. Атом и атомное ядро (с квизом)" },
    ],
    technology: [
      { id: "final-q4", title: "🌟 Итоговая контрольная за 4 четверть. ИКТ в современном обществе" },
      { id: "default", title: "Итоговая контрольная (3 четверть)" },
    ],
  },
};

interface QuizConfig {
  questions: QuizQuestion[];
  secondsPerQuestion: number;
}

const TESTS_WITH_QUIZ: Record<string, QuizConfig> = {
  "9_physics_atom": { questions: ATOM_QUIZ_QUESTIONS, secondsPerQuestion: 20 },
  "7_physics_work-power": { questions: WORK_POWER_QUIZ_QUESTIONS, secondsPerQuestion: 30 },
  "8_informatics_python-hero": { questions: PYTHON_HERO_QUIZ_QUESTIONS, secondsPerQuestion: 40 },
  "8_physics_final-q4": { questions: FINAL_Q4_QUIZ_QUESTIONS, secondsPerQuestion: 60 },
  "6_technology_final-q4": { questions: FINAL_Q4_TECH6_QUIZ_QUESTIONS, secondsPerQuestion: 60 },
  "7_technology_final-q4": { questions: FINAL_Q4_TECH7_QUIZ_QUESTIONS, secondsPerQuestion: 60 },
  "5_technology_final-q4-v2": { questions: FINAL_Q4_TECH5_V2_QUIZ_QUESTIONS, secondsPerQuestion: 60 },
  "5_technology_final-q4-v3": { questions: FINAL_Q4_TECH5_V3_QUIZ_QUESTIONS, secondsPerQuestion: 60 },
  "8_technology_final-q4-theory": { questions: FINAL_Q4_TECH8_THEORY_QUIZ_QUESTIONS, secondsPerQuestion: 60 },
  "9_technology_final-q4": { questions: FINAL_Q4_TECH9_QUIZ_QUESTIONS, secondsPerQuestion: 60 },
};

const quizKey = (g: string, s: string, t: string) => `${g}_${s}_${t}`;

const RUSSIAN_NAME_REGEX = /^[А-ЯЁа-яё]+\s+[А-ЯЁа-яё]+(?:\s+(\d+))?$/;

function getDraftKey(grade: string, subject: string, attempt: string, testId: string) {
  return `test_draft_${grade}_${subject}_${testId}_${attempt}`;
}

function getQuizDraftKey(grade: string, subject: string, attempt: string, testId: string) {
  return `quiz_draft_${grade}_${subject}_${testId}_${attempt}`;
}

function getSubmittedKey(grade: string, subject: string, name: string, attempt: string, testId: string) {
  return `test_submitted_${grade}_${subject}_${testId}_${name.trim().toLowerCase()}_${attempt}`;
}

const Index = () => {
  const [screen, setScreen] = useState<Screen>("login");
  const [resultId, setResultId] = useState<string | null>(null);
  const { finalize: finalizeRecording } = useRrwebRecorder({
    resultId,
    enabled: screen === "test",
    // 40 минут таймера + 5 минут буфер = 2700 сек жёсткого потолка записи.
    maxDurationSec: 40 * 60 + 5 * 60,
  });
  const [loginStep, setLoginStep] = useState<LoginStep>("grade");
  const [studentName, setStudentName] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [testId, setTestId] = useState("default");
  const [attempt, setAttempt] = useState("1");
  const [cleanName, setCleanName] = useState("");
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [warned5min, setWarned5min] = useState(false);
  const { toast } = useToast();

  // Grade 8 answers
  const [blitz8, setBlitz8] = useState<string[]>(Array(7).fill(""));
  const [tasks8, setTasks8] = useState<Record<string, string>>({
    t1: "", t2: "", t3: "", t4: "", t5: "", t6: "",
  });
  const [attachments8, setAttachments8] = useState<Record<string, File | null>>({});

  // Grade 8 informatics PYTHON answers (1 task)
  const [answers8infoPy, setAnswers8infoPy] = useState<string[]>(Array(1).fill(""));
  const [attachments8infoPy, setAttachments8infoPy] = useState<Record<number, File | null>>({});

  // Grade 7 answers
  const [theory7, setTheory7] = useState<string[]>(Array(7).fill(""));
  const [practice7, setPractice7] = useState<string[]>(Array(6).fill(""));
  const [attachments7, setAttachments7] = useState<Record<number, File | null>>({});

  // Grade 9 answers
  const [answers9, setAnswers9] = useState<string[]>(Array(11).fill(""));
  const [attachments9, setAttachments9] = useState<Record<number, File | null>>({});

  // Grade 9 physics answers
  const [answers9phys, setAnswers9phys] = useState<string[]>(Array(14).fill(""));
  const [attachments9phys, setAttachments9phys] = useState<Record<number, File | null>>({});

  // Grade 9 technology answers
  const [answers9tech, setAnswers9tech] = useState<string[]>(Array(11).fill(""));
  const [attachments9tech, setAttachments9tech] = useState<Record<number, File | null>>({});

  // Grade 7 technology answers
  const [theory7tech, setTheory7tech] = useState<string[]>(Array(7).fill(""));
  const [practice7tech, setPractice7tech] = useState<string[]>(Array(6).fill(""));
  const [attachments7tech, setAttachments7tech] = useState<Record<number, File | null>>({});

  // Grade 8 physics answers
  const [answers8phys, setAnswers8phys] = useState<string[]>(Array(13).fill(""));
  const [attachments8phys, setAttachments8phys] = useState<Record<number, File | null>>({});

  // Grade 8 physics POWER answers (6 tasks)
  const [answers8physPower, setAnswers8physPower] = useState<string[]>(Array(6).fill(""));
  const [attachments8physPower, setAttachments8physPower] = useState<Record<number, File | null>>({});

  // Grade 8 physics FINAL Q4 answers (6 tasks; 15-question quiz lives separately)
  const [answers8physFinalQ4, setAnswers8physFinalQ4] = useState<string[]>(Array(6).fill(""));
  const [attachments8physFinalQ4, setAttachments8physFinalQ4] = useState<Record<number, File | null>>({});

  // Grade 6 technology FINAL Q4 answers (6 tasks; 15-question quiz lives separately)
  const [answers6techFinalQ4, setAnswers6techFinalQ4] = useState<string[]>(Array(6).fill(""));
  const [attachments6techFinalQ4, setAttachments6techFinalQ4] = useState<Record<number, File | null>>({});

  // Grade 5 technology FINAL Q4 V2 answers (4 tasks; 15-question quiz lives separately)
  const [answers5techFinalQ4V2, setAnswers5techFinalQ4V2] = useState<string[]>(Array(4).fill(""));
  const [attachments5techFinalQ4V2, setAttachments5techFinalQ4V2] = useState<Record<number, File | null>>({});

  // Grade 5 technology FINAL Q4 V3 answers (4 tasks; 15-question quiz lives separately)
  const [answers5techFinalQ4V3, setAnswers5techFinalQ4V3] = useState<string[]>(Array(4).fill(""));
  const [attachments5techFinalQ4V3, setAttachments5techFinalQ4V3] = useState<Record<number, File | null>>({});

  // Grade 8 technology FINAL Q4 THEORY answers (6 written tasks; 15-question quiz lives separately)
  const [answers8techFinalQ4Theory, setAnswers8techFinalQ4Theory] = useState<string[]>(Array(6).fill(""));
  const [attachments8techFinalQ4Theory, setAttachments8techFinalQ4Theory] = useState<Record<number, File | null>>({});

  // Grade 9 technology FINAL Q4 answers (6 written tasks; 15-question quiz lives separately)
  const [answers9techFinalQ4, setAnswers9techFinalQ4] = useState<string[]>(Array(6).fill(""));
  const [attachments9techFinalQ4, setAttachments9techFinalQ4] = useState<Record<number, File | null>>({});

  // Grade 7 technology FINAL Q4 answers (4 practice + 8 theory = 12; 15-question quiz lives separately)
  const [answers7techFinalQ4, setAnswers7techFinalQ4] = useState<string[]>(Array(12).fill(""));
  const [attachments7techFinalQ4, setAttachments7techFinalQ4] = useState<Record<number, File | null>>({});

  // Grade 7 physics answers
  const [answers7phys, setAnswers7phys] = useState<string[]>(Array(10).fill(""));
  const [attachments7phys, setAttachments7phys] = useState<Record<number, File | null>>({});

  // Grade 7 physics WORK & POWER answers (6 tasks; theory is in quiz)
  const [answers7physWork, setAnswers7physWork] = useState<string[]>(Array(6).fill(""));
  const [attachments7physWork, setAttachments7physWork] = useState<Record<number, File | null>>({});

  // Grade 9 physics ATOM answers (6 tasks)
  const [answers9physAtom, setAnswers9physAtom] = useState<string[]>(Array(6).fill(""));
  const [attachments9physAtom, setAttachments9physAtom] = useState<Record<number, File | null>>({});

  // Quiz state
  const [quizPhase, setQuizPhase] = useState<QuizPhase | null>(null);
  const [quizResults, setQuizResults] = useState<QuizResults | null>(null);
  const quizResultsRef = useRef<QuizResults | null>(null);

  // DB-backed tests (created by teachers)
  const [dbTests, setDbTests] = useState<DbTestSummary[]>([]);
  const [activeDbTest, setActiveDbTest] = useState<DbTestSummary | null>(null);

  useEffect(() => {
    if (!grade || !subject) {
      setDbTests([]);
      return;
    }
    if (grade === "5") {
      setDbTests([]);
      return;
    }
    if (grade === "8" && subject === "technology") {
      setDbTests([]);
      return;
    }
    loadPublishedTestsForGradeSubject(grade, subject).then(setDbTests).catch(() => setDbTests([]));
  }, [grade, subject]);

  // Live refs
  const blitz8Ref = useRef(blitz8);
  const tasks8Ref = useRef(tasks8);
  const attachments8Ref = useRef(attachments8);
  const answers8infoPyRef = useRef(answers8infoPy);
  const attachments8infoPyRef = useRef(attachments8infoPy);
  const theory7Ref = useRef(theory7);
  const practice7Ref = useRef(practice7);
  const attachments7Ref = useRef(attachments7);
  const answers9Ref = useRef(answers9);
  const attachments9Ref = useRef(attachments9);
  const answers9physRef = useRef(answers9phys);
  const attachments9physRef = useRef(attachments9phys);
  const answers9techRef = useRef(answers9tech);
  const attachments9techRef = useRef(attachments9tech);
  const theory7techRef = useRef(theory7tech);
  const practice7techRef = useRef(practice7tech);
  const attachments7techRef = useRef(attachments7tech);
  const answers8physRef = useRef(answers8phys);
  const attachments8physRef = useRef(attachments8phys);
  const answers8physPowerRef = useRef(answers8physPower);
  const attachments8physPowerRef = useRef(attachments8physPower);
  const answers8physFinalQ4Ref = useRef(answers8physFinalQ4);
  const attachments8physFinalQ4Ref = useRef(attachments8physFinalQ4);
  const answers6techFinalQ4Ref = useRef(answers6techFinalQ4);
  const attachments6techFinalQ4Ref = useRef(attachments6techFinalQ4);
  const answers5techFinalQ4V2Ref = useRef(answers5techFinalQ4V2);
  const attachments5techFinalQ4V2Ref = useRef(attachments5techFinalQ4V2);
  const answers5techFinalQ4V3Ref = useRef(answers5techFinalQ4V3);
  const attachments5techFinalQ4V3Ref = useRef(attachments5techFinalQ4V3);
  const answers8techFinalQ4TheoryRef = useRef(answers8techFinalQ4Theory);
  const attachments8techFinalQ4TheoryRef = useRef(attachments8techFinalQ4Theory);
  const answers9techFinalQ4Ref = useRef(answers9techFinalQ4);
  const attachments9techFinalQ4Ref = useRef(attachments9techFinalQ4);
  const answers7techFinalQ4Ref = useRef(answers7techFinalQ4);
  const attachments7techFinalQ4Ref = useRef(attachments7techFinalQ4);
  const answers7physRef = useRef(answers7phys);
  const attachments7physRef = useRef(attachments7phys);
  const answers7physWorkRef = useRef(answers7physWork);
  const attachments7physWorkRef = useRef(attachments7physWork);
  const answers9physAtomRef = useRef(answers9physAtom);
  const attachments9physAtomRef = useRef(attachments9physAtom);
  const gradeRef = useRef(grade);
  const subjectRef = useRef(subject);
  const testIdRef = useRef(testId);
  const attemptRef = useRef(attempt);
  const cleanNameRef = useRef(cleanName);
  const timeLeftRef = useRef(timeLeft);

  useEffect(() => { blitz8Ref.current = blitz8; }, [blitz8]);
  useEffect(() => { tasks8Ref.current = tasks8; }, [tasks8]);
  useEffect(() => { attachments8Ref.current = attachments8; }, [attachments8]);
  useEffect(() => { answers8infoPyRef.current = answers8infoPy; }, [answers8infoPy]);
  useEffect(() => { attachments8infoPyRef.current = attachments8infoPy; }, [attachments8infoPy]);
  useEffect(() => { theory7Ref.current = theory7; }, [theory7]);
  useEffect(() => { practice7Ref.current = practice7; }, [practice7]);
  useEffect(() => { attachments7Ref.current = attachments7; }, [attachments7]);
  useEffect(() => { answers9Ref.current = answers9; }, [answers9]);
  useEffect(() => { attachments9Ref.current = attachments9; }, [attachments9]);
  useEffect(() => { answers9physRef.current = answers9phys; }, [answers9phys]);
  useEffect(() => { attachments9physRef.current = attachments9phys; }, [attachments9phys]);
  useEffect(() => { answers9techRef.current = answers9tech; }, [answers9tech]);
  useEffect(() => { attachments9techRef.current = attachments9tech; }, [attachments9tech]);
  useEffect(() => { theory7techRef.current = theory7tech; }, [theory7tech]);
  useEffect(() => { practice7techRef.current = practice7tech; }, [practice7tech]);
  useEffect(() => { attachments7techRef.current = attachments7tech; }, [attachments7tech]);
  useEffect(() => { answers8physRef.current = answers8phys; }, [answers8phys]);
  useEffect(() => { attachments8physRef.current = attachments8phys; }, [attachments8phys]);
  useEffect(() => { answers8physPowerRef.current = answers8physPower; }, [answers8physPower]);
  useEffect(() => { attachments8physPowerRef.current = attachments8physPower; }, [attachments8physPower]);
  useEffect(() => { answers8physFinalQ4Ref.current = answers8physFinalQ4; }, [answers8physFinalQ4]);
  useEffect(() => { attachments8physFinalQ4Ref.current = attachments8physFinalQ4; }, [attachments8physFinalQ4]);
  useEffect(() => { answers6techFinalQ4Ref.current = answers6techFinalQ4; }, [answers6techFinalQ4]);
  useEffect(() => { attachments6techFinalQ4Ref.current = attachments6techFinalQ4; }, [attachments6techFinalQ4]);
  useEffect(() => { answers5techFinalQ4V2Ref.current = answers5techFinalQ4V2; }, [answers5techFinalQ4V2]);
  useEffect(() => { attachments5techFinalQ4V2Ref.current = attachments5techFinalQ4V2; }, [attachments5techFinalQ4V2]);
  useEffect(() => { answers5techFinalQ4V3Ref.current = answers5techFinalQ4V3; }, [answers5techFinalQ4V3]);
  useEffect(() => { attachments5techFinalQ4V3Ref.current = attachments5techFinalQ4V3; }, [attachments5techFinalQ4V3]);
  useEffect(() => { answers8techFinalQ4TheoryRef.current = answers8techFinalQ4Theory; }, [answers8techFinalQ4Theory]);
  useEffect(() => { attachments8techFinalQ4TheoryRef.current = attachments8techFinalQ4Theory; }, [attachments8techFinalQ4Theory]);
  useEffect(() => { answers9techFinalQ4Ref.current = answers9techFinalQ4; }, [answers9techFinalQ4]);
  useEffect(() => { attachments9techFinalQ4Ref.current = attachments9techFinalQ4; }, [attachments9techFinalQ4]);
  useEffect(() => { answers7techFinalQ4Ref.current = answers7techFinalQ4; }, [answers7techFinalQ4]);
  useEffect(() => { attachments7techFinalQ4Ref.current = attachments7techFinalQ4; }, [attachments7techFinalQ4]);
  useEffect(() => { answers7physRef.current = answers7phys; }, [answers7phys]);
  useEffect(() => { attachments7physRef.current = attachments7phys; }, [attachments7phys]);
  useEffect(() => { answers7physWorkRef.current = answers7physWork; }, [answers7physWork]);
  useEffect(() => { attachments7physWorkRef.current = attachments7physWork; }, [attachments7physWork]);
  useEffect(() => { answers9physAtomRef.current = answers9physAtom; }, [answers9physAtom]);
  useEffect(() => { attachments9physAtomRef.current = attachments9physAtom; }, [attachments9physAtom]);
  useEffect(() => { quizResultsRef.current = quizResults; }, [quizResults]);
  useEffect(() => { gradeRef.current = grade; }, [grade]);
  useEffect(() => { subjectRef.current = subject; }, [subject]);
  useEffect(() => { testIdRef.current = testId; }, [testId]);
  useEffect(() => { attemptRef.current = attempt; }, [attempt]);
  useEffect(() => { cleanNameRef.current = cleanName; }, [cleanName]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  // Anticheat
  const cheatLogRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittingRef = useRef(false);
  const testActiveRef = useRef(false);
  const [autoSubmitTriggered, setAutoSubmitTriggered] = useState(false);

  // Гард: persist не должен писать, пока restore для текущего ключа не завершён.
  // Иначе пустые initial-стейты затрут восстановленный черновик.
  const restoredKeyRef = useRef<string | null>(null);

  // --- Autosave: restore draft on test start ---
  useEffect(() => {
    if (screen !== "test" || !grade || !subject) {
      restoredKeyRef.current = null;
      return;
    }
    const key = getDraftKey(grade, subject, attempt, testId);
    if (restoredKeyRef.current === key) return;
    const saved = localStorage.getItem(key);
    let restoredSomething = false;
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        const mark = (v: unknown) => { if (v) restoredSomething = true; };
        if (grade === "8" && subject === "informatics" && testId === "python-hero") {
          if (draft.answers8infoPy) { setAnswers8infoPy(draft.answers8infoPy); mark(draft.answers8infoPy); }
        } else if (grade === "8" && subject === "informatics") {
          if (draft.blitz8) { setBlitz8(draft.blitz8); mark(draft.blitz8); }
          if (draft.tasks8) { setTasks8(draft.tasks8); mark(draft.tasks8); }
        } else if (grade === "8" && subject === "physics" && testId === "power-joule") {
          if (draft.answers8physPower) { setAnswers8physPower(draft.answers8physPower); mark(draft.answers8physPower); }
        } else if (grade === "8" && subject === "physics" && testId === "final-q4") {
          if (draft.answers8physFinalQ4) { setAnswers8physFinalQ4(draft.answers8physFinalQ4); mark(draft.answers8physFinalQ4); }
        } else if (grade === "6" && subject === "technology" && testId === "final-q4") {
          if (draft.answers6techFinalQ4) { setAnswers6techFinalQ4(draft.answers6techFinalQ4); mark(draft.answers6techFinalQ4); }
        } else if (grade === "5" && subject === "technology" && testId === "final-q4-v2") {
          if (draft.answers5techFinalQ4V2) {
            const restored = (draft.answers5techFinalQ4V2 as string[]).slice(0, 4);
            while (restored.length < 4) restored.push("");
            setAnswers5techFinalQ4V2(restored);
            mark(draft.answers5techFinalQ4V2);
          }
        } else if (grade === "5" && subject === "technology" && testId === "final-q4-v3") {
          if (draft.answers5techFinalQ4V3) {
            const restored = (draft.answers5techFinalQ4V3 as string[]).slice(0, 4);
            while (restored.length < 4) restored.push("");
            setAnswers5techFinalQ4V3(restored);
            mark(draft.answers5techFinalQ4V3);
          }
        } else if (grade === "8" && subject === "technology" && testId === "final-q4-theory") {
          if (draft.answers8techFinalQ4Theory) {
            const restored = (draft.answers8techFinalQ4Theory as string[]).slice(0, 6);
            while (restored.length < 6) restored.push("");
            setAnswers8techFinalQ4Theory(restored);
            mark(draft.answers8techFinalQ4Theory);
          }
        } else if (grade === "7" && subject === "technology" && testId === "final-q4") {
          if (draft.answers7techFinalQ4) {
            const restored = (draft.answers7techFinalQ4 as string[]).slice(0, 12);
            while (restored.length < 12) restored.push("");
            setAnswers7techFinalQ4(restored);
            mark(draft.answers7techFinalQ4);
          }
        } else if (grade === "8" && subject === "physics") {
          if (draft.answers8phys) { setAnswers8phys(draft.answers8phys); mark(draft.answers8phys); }
        } else if (grade === "9" && subject === "physics" && testId === "atom") {
          if (draft.answers9physAtom) { setAnswers9physAtom(draft.answers9physAtom); mark(draft.answers9physAtom); }
        } else if (grade === "9" && subject === "physics") {
          if (draft.answers9phys) { setAnswers9phys(draft.answers9phys); mark(draft.answers9phys); }
        } else if (grade === "9" && subject === "technology" && testId === "final-q4") {
          if (draft.answers9techFinalQ4) {
            const restored = (draft.answers9techFinalQ4 as string[]).slice(0, 6);
            while (restored.length < 6) restored.push("");
            setAnswers9techFinalQ4(restored);
            mark(draft.answers9techFinalQ4);
          }
        } else if (grade === "9" && subject === "technology") {
          if (draft.answers9tech) { setAnswers9tech(draft.answers9tech); mark(draft.answers9tech); }
        } else if (grade === "9") {
          if (draft.answers9) { setAnswers9(draft.answers9); mark(draft.answers9); }
        } else if (grade === "7" && subject === "physics" && testId === "work-power") {
          if (draft.answers7physWork) {
            const restored = (draft.answers7physWork as string[]).slice(0, 6);
            while (restored.length < 6) restored.push("");
            setAnswers7physWork(restored);
            mark(draft.answers7physWork);
          }
        } else if (grade === "7" && subject === "physics") {
          if (draft.answers7phys) { setAnswers7phys(draft.answers7phys); mark(draft.answers7phys); }
        } else if (grade === "7" && subject === "technology") {
          if (draft.theory7tech) { setTheory7tech(draft.theory7tech); mark(draft.theory7tech); }
          if (draft.practice7tech) { setPractice7tech(draft.practice7tech); mark(draft.practice7tech); }
        } else if (grade === "7") {
          if (draft.theory7) { setTheory7(draft.theory7); mark(draft.theory7); }
          if (draft.practice7) { setPractice7(draft.practice7); mark(draft.practice7); }
        }
      } catch {
        // ignore
      }
    }
    // ВАЖНО: помечаем ключ как восстановленный ВСЕГДА (даже если черновика не было),
    // чтобы persist-эффект разблокировался для этого теста.
    restoredKeyRef.current = key;
    if (restoredSomething) {
      toast({
        title: "✅ Черновик восстановлен",
        description: "Мы вернули ваши предыдущие ответы. Продолжайте с того же места.",
      });
    }
  }, [screen, grade, subject, testId, attempt, toast]);

  // --- Серверный restore: если локально ничего нет, тянем черновик с сервера ---
  const serverRestoredKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (screen !== "test" || !grade || !subject || !cleanName) return;
    const key = getDraftKey(grade, subject, attempt, testId);
    if (serverRestoredKeyRef.current === key) return;
    const localHas = !!localStorage.getItem(key);
    const localQuizHas = !!localStorage.getItem(getQuizDraftKey(grade, subject, attempt, testId));
    if (localHas && localQuizHas) {
      // локальные данные актуальнее — пропускаем серверный restore
      serverRestoredKeyRef.current = key;
      return;
    }
    serverRestoredKeyRef.current = key;
    (async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/load-draft`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ""}`,
          },
          body: JSON.stringify({
            student_name: cleanName,
            grade, subject, test_id: testId, attempt,
          }),
        });
        if (!res.ok) return;
        const json = await res.json();
        const draft = json?.draft;
        if (!draft) return;
        let restored = false;
        const w = draft.written ?? {};
        if (!localHas) {
          if (grade === "8" && subject === "informatics" && testId === "python-hero" && w.answers8infoPy) { setAnswers8infoPy(w.answers8infoPy); restored = true; }
          else if (grade === "8" && subject === "informatics") {
            if (w.blitz8) { setBlitz8(w.blitz8); restored = true; }
            if (w.tasks8) { setTasks8(w.tasks8); restored = true; }
          }
          else if (grade === "8" && subject === "physics" && testId === "power-joule" && w.answers8physPower) { setAnswers8physPower(w.answers8physPower); restored = true; }
          else if (grade === "8" && subject === "physics" && testId === "final-q4" && w.answers8physFinalQ4) { setAnswers8physFinalQ4(w.answers8physFinalQ4); restored = true; }
          else if (grade === "6" && subject === "technology" && testId === "final-q4" && w.answers6techFinalQ4) { setAnswers6techFinalQ4(w.answers6techFinalQ4); restored = true; }
          else if (grade === "5" && subject === "technology" && testId === "final-q4-v2" && w.answers5techFinalQ4V2) {
            const arr = (w.answers5techFinalQ4V2 as string[]).slice(0, 4);
            while (arr.length < 4) arr.push("");
            setAnswers5techFinalQ4V2(arr); restored = true;
          }
          else if (grade === "5" && subject === "technology" && testId === "final-q4-v3" && w.answers5techFinalQ4V3) {
            const arr = (w.answers5techFinalQ4V3 as string[]).slice(0, 4);
            while (arr.length < 4) arr.push("");
            setAnswers5techFinalQ4V3(arr); restored = true;
          }
          else if (grade === "8" && subject === "technology" && testId === "final-q4-theory" && w.answers8techFinalQ4Theory) {
            const arr = (w.answers8techFinalQ4Theory as string[]).slice(0, 6);
            while (arr.length < 6) arr.push("");
            setAnswers8techFinalQ4Theory(arr); restored = true;
          }
          else if (grade === "7" && subject === "technology" && testId === "final-q4" && w.answers7techFinalQ4) {
            const arr = (w.answers7techFinalQ4 as string[]).slice(0, 12);
            while (arr.length < 12) arr.push("");
            setAnswers7techFinalQ4(arr); restored = true;
          }
          else if (grade === "8" && subject === "physics" && w.answers8phys) { setAnswers8phys(w.answers8phys); restored = true; }
          else if (grade === "9" && subject === "physics" && testId === "atom" && w.answers9physAtom) { setAnswers9physAtom(w.answers9physAtom); restored = true; }
          else if (grade === "9" && subject === "physics" && w.answers9phys) { setAnswers9phys(w.answers9phys); restored = true; }
          else if (grade === "9" && subject === "technology" && testId === "final-q4" && w.answers9techFinalQ4) {
            const arr = (w.answers9techFinalQ4 as string[]).slice(0, 6);
            while (arr.length < 6) arr.push("");
            setAnswers9techFinalQ4(arr); restored = true;
          }
          else if (grade === "9" && subject === "technology" && w.answers9tech) { setAnswers9tech(w.answers9tech); restored = true; }
          else if (grade === "9" && w.answers9) { setAnswers9(w.answers9); restored = true; }
          else if (grade === "7" && subject === "physics" && testId === "work-power" && w.answers7physWork) {
            const arr = (w.answers7physWork as string[]).slice(0, 6);
            while (arr.length < 6) arr.push("");
            setAnswers7physWork(arr); restored = true;
          }
          else if (grade === "7" && subject === "physics" && w.answers7phys) { setAnswers7phys(w.answers7phys); restored = true; }
          else if (grade === "7" && subject === "technology") {
            if (w.theory7tech) { setTheory7tech(w.theory7tech); restored = true; }
            if (w.practice7tech) { setPractice7tech(w.practice7tech); restored = true; }
          }
          else if (grade === "7") {
            if (w.theory7) { setTheory7(w.theory7); restored = true; }
            if (w.practice7) { setPractice7(w.practice7); restored = true; }
          }
        }
        if (!localQuizHas && draft.quiz) {
          try {
            localStorage.setItem(getQuizDraftKey(grade, subject, attempt, testId), JSON.stringify(draft.quiz));
            restored = true;
          } catch { /* ignore */ }
        }
        if (restored) {
          toast({
            title: "☁️ Черновик восстановлен с сервера",
            description: "Мы нашли ваши предыдущие ответы и вернули их.",
          });
        }
      } catch {
        // молча игнорируем — нет сети, не критично
      }
    })();
  }, [screen, grade, subject, testId, attempt, cleanName, toast]);

  // --- Autosave: persist ---
  useEffect(() => {
    if (screen !== "test" || !grade || !subject) return;
    const key = getDraftKey(grade, subject, attempt, testId);
    // Не пишем, пока restore для этого ключа не завершён —
    // иначе пустые initial-стейты затрут сохранённый черновик.
    if (restoredKeyRef.current !== key) return;
    let data: Record<string, unknown> = {};
    if (grade === "8" && subject === "informatics" && testId === "python-hero") {
      data = { answers8infoPy };
    } else if (grade === "8" && subject === "informatics") {
      data = { blitz8, tasks8 };
    } else if (grade === "8" && subject === "physics" && testId === "power-joule") {
      data = { answers8physPower };
    } else if (grade === "8" && subject === "physics" && testId === "final-q4") {
      data = { answers8physFinalQ4 };
    } else if (grade === "6" && subject === "technology" && testId === "final-q4") {
      data = { answers6techFinalQ4 };
    } else if (grade === "5" && subject === "technology" && testId === "final-q4-v2") {
      data = { answers5techFinalQ4V2 };
    } else if (grade === "5" && subject === "technology" && testId === "final-q4-v3") {
      data = { answers5techFinalQ4V3 };
    } else if (grade === "8" && subject === "technology" && testId === "final-q4-theory") {
      data = { answers8techFinalQ4Theory };
    } else if (grade === "8" && subject === "physics") {
      data = { answers8phys };
    } else if (grade === "9" && subject === "physics" && testId === "atom") {
      data = { answers9physAtom };
    } else if (grade === "9" && subject === "physics") {
      data = { answers9phys };
    } else if (grade === "9" && subject === "technology" && testId === "final-q4") {
      data = { answers9techFinalQ4 };
    } else if (grade === "9" && subject === "technology") {
      data = { answers9tech };
    } else if (grade === "9") {
      data = { answers9 };
    } else if (grade === "7" && subject === "physics" && testId === "work-power") {
      data = { answers7physWork };
    } else if (grade === "7" && subject === "physics") {
      data = { answers7phys };
    } else if (grade === "7" && subject === "technology" && testId === "final-q4") {
      data = { answers7techFinalQ4 };
    } else if (grade === "7" && subject === "technology") {
      data = { theory7tech, practice7tech };
    } else if (grade === "7") {
      data = { theory7, practice7 };
    }
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // quota / private mode — игнор
    }
  }, [screen, grade, subject, testId, attempt, blitz8, tasks8, answers8infoPy, answers8phys, answers8physPower, answers8physFinalQ4, answers6techFinalQ4, answers5techFinalQ4V2, answers5techFinalQ4V3, answers8techFinalQ4Theory, answers7techFinalQ4, answers7phys, answers7physWork, answers9, answers9phys, answers9physAtom, answers9tech, answers9techFinalQ4, theory7, practice7, theory7tech, practice7tech]);

  // --- Autosave: страховочный flush на закрытие/сворачивание вкладки ---
  useEffect(() => {
    if (screen !== "test" || !grade || !subject) return;
    const flush = () => {
      const key = getDraftKey(grade, subject, attempt, testId);
      if (restoredKeyRef.current !== key) return;
      const data: Record<string, unknown> = {
        blitz8: blitz8Ref.current,
        tasks8: tasks8Ref.current,
        answers8infoPy: answers8infoPyRef.current,
        answers8phys: answers8physRef.current,
        answers8physPower: answers8physPowerRef.current,
        answers8physFinalQ4: answers8physFinalQ4Ref.current,
        answers6techFinalQ4: answers6techFinalQ4Ref.current,
        answers5techFinalQ4V2: answers5techFinalQ4V2Ref.current,
        answers5techFinalQ4V3: answers5techFinalQ4V3Ref.current,
        answers8techFinalQ4Theory: answers8techFinalQ4TheoryRef.current,
        answers7techFinalQ4: answers7techFinalQ4Ref.current,
        answers9: answers9Ref.current,
        answers9phys: answers9physRef.current,
        answers9physAtom: answers9physAtomRef.current,
        answers9tech: answers9techRef.current,
        answers9techFinalQ4: answers9techFinalQ4Ref.current,
        answers7phys: answers7physRef.current,
        answers7physWork: answers7physWorkRef.current,
        theory7: theory7Ref.current,
        practice7: practice7Ref.current,
        theory7tech: theory7techRef.current,
        practice7tech: practice7techRef.current,
      };
      try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore */ }
    };
    const onVis = () => { if (document.hidden) flush(); };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [screen, grade, subject, testId, attempt]);

  // --- Серверный автосейв: дублирует localStorage в student_drafts (на случай смены устройства) ---
  // Дебаунс 5с после последнего изменения; flush через sendBeacon на закрытие вкладки.
  const serverSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastServerPayloadRef = useRef<string>("");
  const lastQuizPushRef = useRef<number>(0);
  const quizPushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildServerPayload = useCallback(() => {
    const g = gradeRef.current;
    const s = subjectRef.current;
    const tid = testIdRef.current;
    const a = attemptRef.current;
    const name = cleanNameRef.current;
    if (!g || !s || !name) return null;
    const written: Record<string, unknown> = {
      blitz8: blitz8Ref.current,
      tasks8: tasks8Ref.current,
      answers8infoPy: answers8infoPyRef.current,
      answers8phys: answers8physRef.current,
      answers8physPower: answers8physPowerRef.current,
      answers8physFinalQ4: answers8physFinalQ4Ref.current,
      answers6techFinalQ4: answers6techFinalQ4Ref.current,
      answers5techFinalQ4V2: answers5techFinalQ4V2Ref.current,
      answers5techFinalQ4V3: answers5techFinalQ4V3Ref.current,
      answers8techFinalQ4Theory: answers8techFinalQ4TheoryRef.current,
      answers7techFinalQ4: answers7techFinalQ4Ref.current,
      answers9: answers9Ref.current,
      answers9phys: answers9physRef.current,
      answers9physAtom: answers9physAtomRef.current,
      answers9tech: answers9techRef.current,
      answers9techFinalQ4: answers9techFinalQ4Ref.current,
      answers7phys: answers7physRef.current,
      answers7physWork: answers7physWorkRef.current,
      theory7: theory7Ref.current,
      practice7: practice7Ref.current,
      theory7tech: theory7techRef.current,
      practice7tech: practice7techRef.current,
    };
    let quiz: unknown = undefined;
    try {
      const raw = localStorage.getItem(getQuizDraftKey(g, s, a, tid));
      if (raw) quiz = JSON.parse(raw);
    } catch { /* ignore */ }
    return {
      student_name: name,
      grade: g,
      subject: s,
      test_id: tid,
      attempt: a,
      written,
      quiz,
    };
  }, []);

  const sendServerSave = useCallback(async (useBeacon = false) => {
    const payload = buildServerPayload();
    if (!payload) return;
    const body = JSON.stringify(payload);
    // дедупликация: не шлём, если ничего не поменялось
    if (body === lastServerPayloadRef.current) return;
    lastServerPayloadRef.current = body;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-draft`;
    try {
      if (useBeacon && navigator.sendBeacon) {
        // Beacon без Authorization-заголовка — функция всё равно работает (verify_jwt=false по умолчанию).
        navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
        return;
      }
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ""}`,
        },
        body,
        keepalive: true,
      });
    } catch {
      // молча игнорируем — локальный сейв уже отработал
    }
  }, [buildServerPayload]);

  // Дебаунсер: триггерится теми же зависимостями, что и локальный persist
  useEffect(() => {
    if (screen !== "test" || !grade || !subject || !cleanName) return;
    if (restoredKeyRef.current !== getDraftKey(grade, subject, attempt, testId)) return;
    if (serverSaveTimerRef.current) clearTimeout(serverSaveTimerRef.current);
    serverSaveTimerRef.current = setTimeout(() => sendServerSave(false), 1500);
    return () => {
      if (serverSaveTimerRef.current) clearTimeout(serverSaveTimerRef.current);
    };
  }, [screen, grade, subject, testId, attempt, cleanName, sendServerSave,
      blitz8, tasks8, answers8infoPy, answers8phys, answers8physPower, answers8physFinalQ4,
      answers6techFinalQ4, answers7techFinalQ4, answers8techFinalQ4Theory, answers9, answers9phys, answers9physAtom,
      answers9tech, answers9techFinalQ4, theory7, practice7, theory7tech, practice7tech, answers7phys, answers7physWork,
      quizPhase, quizResults]);

  // Flush через beacon на закрытие/сворачивание
  useEffect(() => {
    if (screen !== "test" || !grade || !subject || !cleanName) return;
    const flush = () => sendServerSave(true);
    const onVis = () => { if (document.hidden) flush(); };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [screen, grade, subject, cleanName, sendServerSave]);

  // --- Progress ---
  const { answered, total } = useMemo(() => {
    if (grade === "8" && subject === "informatics" && testId === "python-hero") {
      return { answered: answers8infoPy.filter(Boolean).length, total: 1 };
    } else if (grade === "8" && subject === "informatics") {
      const blitzFilled = blitz8.filter(Boolean).length;
      const tasksFilled = Object.values(tasks8).filter(Boolean).length;
      return { answered: blitzFilled + tasksFilled, total: 7 + 6 };
    } else if (grade === "8" && subject === "physics" && testId === "power-joule") {
      return { answered: answers8physPower.filter(Boolean).length, total: 6 };
    } else if (grade === "8" && subject === "physics" && testId === "final-q4") {
      return { answered: answers8physFinalQ4.filter(Boolean).length, total: 6 };
    } else if (grade === "6" && subject === "technology" && testId === "final-q4") {
      return { answered: answers6techFinalQ4.filter(Boolean).length, total: 6 };
    } else if (grade === "5" && subject === "technology" && testId === "final-q4-v2") {
      return { answered: answers5techFinalQ4V2.filter(Boolean).length, total: 4 };
    } else if (grade === "5" && subject === "technology" && testId === "final-q4-v3") {
      return { answered: answers5techFinalQ4V3.filter(Boolean).length, total: 4 };
    } else if (grade === "7" && subject === "technology" && testId === "final-q4") {
      return { answered: answers7techFinalQ4.filter(Boolean).length, total: 12 };
    } else if (grade === "8" && subject === "technology" && testId === "final-q4-theory") {
      return { answered: answers8techFinalQ4Theory.filter(Boolean).length, total: 6 };
    } else if (grade === "8" && subject === "physics") {
      return { answered: answers8phys.filter(Boolean).length, total: 13 };
    } else if (grade === "9" && subject === "physics" && testId === "atom") {
      return { answered: answers9physAtom.filter(Boolean).length, total: 6 };
    } else if (grade === "9" && subject === "physics") {
      return { answered: answers9phys.filter(Boolean).length, total: 14 };
    } else if (grade === "9" && subject === "technology" && testId === "final-q4") {
      return { answered: answers9techFinalQ4.filter(Boolean).length, total: 6 };
    } else if (grade === "9" && subject === "technology") {
      return { answered: answers9tech.filter(Boolean).length, total: 11 };
    } else if (grade === "9") {
      return { answered: answers9.filter(Boolean).length, total: 11 };
    } else if (grade === "7" && subject === "physics" && testId === "work-power") {
      return { answered: answers7physWork.filter(Boolean).length, total: 6 };
    } else if (grade === "7" && subject === "physics") {
      return { answered: answers7phys.filter(Boolean).length, total: 10 };
    } else if (grade === "7" && subject === "technology" && testId !== "final-q4") {
      const tFilled = theory7tech.filter(Boolean).length;
      const pFilled = practice7tech.filter(Boolean).length;
      return { answered: tFilled + pFilled, total: 7 + 6 };
    } else if (grade === "7") {
      const tFilled = theory7.filter(Boolean).length;
      const pFilled = practice7.filter(Boolean).length;
      return { answered: tFilled + pFilled, total: 7 + 6 };
    }
    return { answered: 0, total: 1 };
  }, [grade, subject, testId, blitz8, tasks8, answers8infoPy, answers8phys, answers8physPower, answers8physFinalQ4, answers6techFinalQ4, answers5techFinalQ4V2, answers5techFinalQ4V3, answers8techFinalQ4Theory, answers7techFinalQ4, answers7phys, answers7physWork, answers9, answers9phys, answers9physAtom, answers9tech, answers9techFinalQ4, theory7, practice7, theory7tech, practice7tech]);

  const progressPercent = total > 0 ? Math.round((answered / total) * 100) : 0;

  const getTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  };

  const logCheat = useCallback((event: string) => {
    if (testActiveRef.current) {
      cheatLogRef.current.push(`[${getTime()}] ${event}`);
    }
  }, []);

  // Дебаунс уведомлений: не больше 1 алерта в Telegram за 10 секунд.
  // В перерыве копим попытки и шлём суммарный счётчик.
  const lastNotifyAtRef = useRef<number>(0);
  const pendingNotifyCountRef = useRef<number>(0);
  const NOTIFY_COOLDOWN_MS = 10_000;

  const notifyCopyAttempt = useCallback(async (event: string) => {
    pendingNotifyCountRef.current += 1;
    const now = Date.now();
    if (now - lastNotifyAtRef.current < NOTIFY_COOLDOWN_MS) {
      return; // тихо копим, не флудим Telegram
    }
    const count = pendingNotifyCountRef.current;
    lastNotifyAtRef.current = now;
    pendingNotifyCountRef.current = 0;
    const eventWithCount =
      count > 1 ? `${event} (всего попыток за период: ${count})` : event;
    try {
      await supabase.functions.invoke("notify-copy-attempt", {
        body: {
          studentName: cleanNameRef.current,
          grade: gradeRef.current,
          subject: subjectRef.current,
          event: eventWithCount,
        },
      });
    } catch (e) {
      console.error("Failed to notify copy attempt:", e);
    }
  }, []);

  useEffect(() => {
    if (screen !== "test") return;
    testActiveRef.current = true;

    const onBlur = () => logCheat("Переключился на другое окно (blur)");
    const onVisibility = () => {
      if (document.hidden) logCheat("Свернул вкладку/браузер (visibilitychange)");
    };
    const onCopy = (e: Event) => {
      e.preventDefault();
      logCheat("Попытка копирования (copy) — ЗАБЛОКИРОВАНО");
      notifyCopyAttempt("Копирование текста (Ctrl+C / ПКМ → Копировать)");
      toast({ title: "⛔ Копирование запрещено", description: "Попытка копирования зафиксирована и отправлена преподавателю.", variant: "destructive" });
    };
    const onCut = (e: Event) => {
      e.preventDefault();
      logCheat("Попытка вырезания (cut) — ЗАБЛОКИРОВАНО");
      notifyCopyAttempt("Вырезание текста (Ctrl+X)");
      toast({ title: "⛔ Вырезание запрещено", description: "Попытка зафиксирована.", variant: "destructive" });
    };
    const onPaste = () => logCheat("Вставил текст (paste)");
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C" || e.key === "с" || e.key === "С")) {
        e.preventDefault();
        logCheat("Попытка Ctrl+C — ЗАБЛОКИРОВАНО");
        notifyCopyAttempt("Комбинация клавиш Ctrl+C");
        toast({ title: "⛔ Копирование запрещено", description: "Попытка зафиксирована.", variant: "destructive" });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A" || e.key === "ф" || e.key === "Ф")) {
        e.preventDefault();
        logCheat("Попытка Ctrl+A — ЗАБЛОКИРОВАНО");
        notifyCopyAttempt("Комбинация клавиш Ctrl+A (выделить всё)");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "u" || e.key === "U" || e.key === "г" || e.key === "Г")) {
        e.preventDefault();
        logCheat("Попытка Ctrl+U — ЗАБЛОКИРОВАНО");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S" || e.key === "ы" || e.key === "Ы") && !e.shiftKey) {
        e.preventDefault();
        logCheat("Попытка Ctrl+S — ЗАБЛОКИРОВАНО");
        notifyCopyAttempt("Попытка сохранить страницу (Ctrl+S)");
        toast({ title: "⛔ Действие заблокировано", description: "Сохранение страницы запрещено.", variant: "destructive" });
        return;
      }
      // F12 — DevTools
      if (e.key === "F12") {
        e.preventDefault();
        logCheat("Попытка открыть DevTools (F12) — ЗАБЛОКИРОВАНО");
        notifyCopyAttempt("Попытка открыть DevTools (F12)");
        toast({ title: "⛔ Инструменты разработчика запрещены", description: "Попытка зафиксирована.", variant: "destructive" });
        return;
      }
      // Ctrl+Shift+I / J / C — DevTools
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        const k = e.key.toLowerCase();
        if (k === "i" || k === "j" || k === "c" || k === "ш" || k === "о" || k === "с") {
          e.preventDefault();
          logCheat(`Попытка открыть DevTools (Ctrl+Shift+${k.toUpperCase()}) — ЗАБЛОКИРОВАНО`);
          notifyCopyAttempt(`Попытка открыть DevTools (Ctrl+Shift+${k.toUpperCase()})`);
          toast({ title: "⛔ Инструменты разработчика запрещены", description: "Попытка зафиксирована.", variant: "destructive" });
          return;
        }
      }
      if (e.key === "PrintScreen") {
        logCheat("Нажал PrintScreen (скриншот)");
      } else if (e.metaKey && e.shiftKey && (e.key === "s" || e.key === "S")) {
        logCheat("Нажал Win+Shift+S (Snipping Tool)");
      } else if (e.ctrlKey && e.shiftKey && (e.key === "s" || e.key === "S")) {
        logCheat("Нажал Ctrl+Shift+S (скриншот)");
      } else if (e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "5")) {
        logCheat(`Нажал Cmd+Shift+${e.key} (скриншот macOS)`);
      } else if (e.key === "Meta") {
        logCheat("Нажал Meta (Win/Cmd)");
      }
    };
    const onContext = (e: Event) => {
      e.preventDefault();
      logCheat("Открыл контекстное меню (ПКМ) — ЗАБЛОКИРОВАНО");
    };
    const onSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      e.preventDefault();
    };

    // --- Детектор подозрительной скорости печати и массовых вставок ---
    // Скользящее окно 5 секунд по символам; срабатывание не чаще 1 раза в 30 сек на поле.
    const TYPING_WINDOW_MS = 5000;
    const TYPING_MAX_CHARS_PER_SEC = 17; // ~1000 знаков/мин — быстрее топ-машинистки
    const TYPING_NOTIFY_COOLDOWN_MS = 30_000;
    const PASTE_DELTA_THRESHOLD = 30; // символов за один input event
    const typingBuffers = new WeakMap<HTMLElement, { times: number[]; lastNotifyAt: number }>();
    const lengthSnapshot = new WeakMap<HTMLElement, number>();

    const fieldLabel = (el: HTMLElement) => {
      const name = el.getAttribute("name") || el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.getAttribute("id") || el.tagName.toLowerCase();
      return name.slice(0, 40);
    };

    const onInput = (e: Event) => {
      const el = e.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!el) return;
      const tag = el.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA") return;
      const value = (el as HTMLInputElement).value ?? "";
      const prevLen = lengthSnapshot.get(el) ?? 0;
      const delta = value.length - prevLen;
      lengthSnapshot.set(el, value.length);

      // Большая дельта за один input → массовая вставка
      const inputType = (e as InputEvent).inputType || "";
      if (delta >= PASTE_DELTA_THRESHOLD || inputType === "insertFromPaste" || inputType === "insertFromDrop") {
        const reason = inputType === "insertFromPaste" ? "вставка" : inputType === "insertFromDrop" ? "drag-n-drop" : "массовый ввод";
        const msg = `📋 Подозрительная ${reason}: +${delta} симв. в поле «${fieldLabel(el)}»`;
        logCheat(msg);
        notifyCopyAttempt(msg);
      }

      if (delta <= 0) return;
      const now = Date.now();
      const buf = typingBuffers.get(el) ?? { times: [], lastNotifyAt: 0 };
      for (let i = 0; i < delta; i++) buf.times.push(now);
      // Чистим окно
      const cutoff = now - TYPING_WINDOW_MS;
      while (buf.times.length && buf.times[0] < cutoff) buf.times.shift();
      typingBuffers.set(el, buf);

      const charsInWindow = buf.times.length;
      const cps = charsInWindow / (TYPING_WINDOW_MS / 1000);
      if (cps > TYPING_MAX_CHARS_PER_SEC && now - buf.lastNotifyAt > TYPING_NOTIFY_COOLDOWN_MS) {
        buf.lastNotifyAt = now;
        const msg = `🚀 Подозрительно быстрый набор: ${cps.toFixed(1)} симв/сек в поле «${fieldLabel(el)}»`;
        logCheat(msg);
        notifyCopyAttempt(msg);
      }
    };

    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("selectstart", onSelectStart);
    document.addEventListener("input", onInput, true);

    return () => {
      testActiveRef.current = false;
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("selectstart", onSelectStart);
      document.removeEventListener("input", onInput, true);
    };
  }, [screen, logCheat, notifyCopyAttempt, toast]);

  // Timer only starts when test is active AND any quiz is finished
  const timerActive = screen === "test" && (quizPhase === null || quizPhase === "done");

  useEffect(() => {
    if (!timerActive) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  // doSubmit ещё не объявлен в этой точке — кладём его в ref ниже и зовём через ref,
  // чтобы избежать stale closure в эффекте автосабмита по таймеру.
  const doSubmitRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (screen === "test" && timeLeft === 0 && !autoSubmitTriggered) {
      setAutoSubmitTriggered(true);
      setTimeout(() => {
        if (!submittingRef.current) {
          doSubmitRef.current?.();
        }
      }, 50);
    }
  }, [timeLeft, screen, autoSubmitTriggered]);

  useEffect(() => {
    if (screen === "test" && timeLeft === 300 && !warned5min) {
      setWarned5min(true);
      toast({
        title: "⚠️ Осталось 5 минут!",
        description: "Скоро тест будет автоматически завершён. Проверьте свои ответы.",
        variant: "destructive",
      });
    }
  }, [timeLeft, screen, warned5min, toast]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // === Step navigation ===
  const goToSubjectStep = (g: string) => {
    setGrade(g);
    setSubject("");
    setTestId("default");
    setLoginStep("subject");
  };

  const goToNameStep = (s: string) => {
    setSubject(s);
    setTestId("default");
    setLoginStep("name");
  };

  const goToTestPickStep = () => {
    const trimmedName = studentName.trim();
    const match = RUSSIAN_NAME_REGEX.exec(trimmedName);
    if (!match) {
      toast({
        title: "Ошибка",
        description: "Введите Имя и Фамилию на русском языке (два слова, без цифр и спецсимволов)",
        variant: "destructive",
      });
      return;
    }
    const parsedAttempt = match[1] || "1";
    const nameParts = trimmedName.split(/\s+/);
    const pureName = `${nameParts[0]} ${nameParts[1]}`;
    setAttempt(parsedAttempt);
    setCleanName(pureName);
    setLoginStep("test-pick");
  };

  const [checkingStorage, setCheckingStorage] = useState(false);

  const startTest = async (chosenTestId: string) => {
    const submittedKey = getSubmittedKey(grade, subject, cleanName, attempt, chosenTestId);
    if (localStorage.getItem(submittedKey)) {
      toast({
        title: "Повторная сдача",
        description: "Вы уже прошли эту работу. Повторная сдача невозможна.",
        variant: "destructive",
      });
      return;
    }

    // Preflight: проверяем, что запись экрана реально работает
    const newResultId = safeRandomUUID();
    setCheckingStorage(true);
    let check: { ok: true } | { ok: false; reason: string };
    try {
      check = await checkRecordingStorage(newResultId);
    } finally {
      setCheckingStorage(false);
    }
    if (!check.ok) {
      toast({
        title: "Запись экрана не работает",
        description:
          "На этом устройстве не получается включить запись. Обновите страницу, попробуйте Chrome или подойдите к учителю. Без записи тест начать нельзя.",
        variant: "destructive",
      });
      // Алерт учителю в Telegram, fire-and-forget
      try {
        void supabase.functions.invoke("notify-copy-attempt", {
          body: {
            studentName: cleanName || studentName || "(неизвестно)",
            grade,
            subject,
            event: `⚠️ Не смог запустить тест: запись экрана недоступна. reason="${(check as { ok: false; reason: string }).reason}". UA=${navigator.userAgent.slice(0, 120)}`,
          },
        });
      } catch (e) {
        console.error("Failed to send preflight failure alert:", e);
      }
      return;
    }

    setTestId(chosenTestId);
    setResultId(newResultId);
    const hasQuiz = !!TESTS_WITH_QUIZ[quizKey(grade, subject, chosenTestId)];
    if (hasQuiz) {
      setQuizPhase("intro");
      setQuizResults(null);
    } else {
      setQuizPhase(null);
    }
    setScreen("test");
  };


  const handleQuizFinish = (results: QuizResults) => {
    setQuizResults(results);
    setQuizPhase("done");
  };

  const uploadAttachments = async (files: Record<string | number, File | null>): Promise<Record<string, string>> => {
    const urls: Record<string, string> = {};
    const timestamp = Date.now();

    for (const [key, file] of Object.entries(files)) {
      if (!file) continue;
      const ext = file.name.split(".").pop() || "bin";
      const safeName = `student_${timestamp}`;
      const path = `${safeName}_${grade}/${key}.${ext}`;

      const { error } = await supabase.storage
        .from("test-attachments")
        .upload(path, file, {
          contentType: file.type,
          upsert: true,
        });

      if (error) {
        console.error(`Upload failed for ${key}:`, error);
        toast({ title: "Ошибка загрузки", description: `Не удалось загрузить файл "${file.name}": ${error.message}`, variant: "destructive" });
      } else {
        const { data } = supabase.storage
          .from("test-attachments")
          .getPublicUrl(path);
        urls[String(key)] = data.publicUrl;
      }
    }
    return urls;
  };

  const lastSubmitAtRef = useRef<number>(0);

  const doSubmit = async () => {
    if (submittingRef.current) return;
    const now = Date.now();
    if (now - lastSubmitAtRef.current < 30_000) {
      toast({
        title: "Подожди немного",
        description: "Повторная отправка возможна через 30 секунд.",
        variant: "destructive",
      });
      return;
    }
    lastSubmitAtRef.current = now;
    submittingRef.current = true;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const g = gradeRef.current;
    const s = subjectRef.current;
    const tid = testIdRef.current;
    const a = attemptRef.current;
    const name = cleanNameRef.current;

    let answers: Record<string, unknown>;
    let fileUrls: Record<string, string> = {};

    if (g === "8" && s === "informatics" && tid === "python-hero") {
      fileUrls = await uploadAttachments(attachments8infoPyRef.current);
      answers = {
        type: "grade8informaticsPython",
        answers: answers8infoPyRef.current,
        quizResults: quizResultsRef.current,
      };
    } else if (g === "8" && s === "informatics") {
      fileUrls = await uploadAttachments(attachments8Ref.current);
      answers = { type: "grade8", blitz: blitz8Ref.current, tasks: tasks8Ref.current };
    } else if (g === "8" && s === "physics" && tid === "power-joule") {
      fileUrls = await uploadAttachments(attachments8physPowerRef.current);
      answers = { type: "grade8physicsPower", answers: answers8physPowerRef.current };
    } else if (g === "8" && s === "physics" && tid === "final-q4") {
      fileUrls = await uploadAttachments(attachments8physFinalQ4Ref.current);
      answers = {
        type: "grade8physicsFinalQ4",
        answers: answers8physFinalQ4Ref.current,
        quizResults: quizResultsRef.current,
      };
    } else if (g === "6" && s === "technology" && tid === "final-q4") {
      fileUrls = await uploadAttachments(attachments6techFinalQ4Ref.current);
      answers = {
        type: "grade6technologyFinalQ4",
        answers: answers6techFinalQ4Ref.current,
        quizResults: quizResultsRef.current,
      };
    } else if (g === "5" && s === "technology" && tid === "final-q4-v2") {
      fileUrls = await uploadAttachments(attachments5techFinalQ4V2Ref.current);
      answers = {
        type: "grade5technologyFinalQ4V2",
        answers: answers5techFinalQ4V2Ref.current,
        quizResults: quizResultsRef.current,
      };
    } else if (g === "5" && s === "technology" && tid === "final-q4-v3") {
      fileUrls = await uploadAttachments(attachments5techFinalQ4V3Ref.current);
      answers = {
        type: "grade5technologyFinalQ4V3",
        answers: answers5techFinalQ4V3Ref.current,
        quizResults: quizResultsRef.current,
      };
    } else if (g === "8" && s === "technology" && tid === "final-q4-theory") {
      fileUrls = await uploadAttachments(attachments8techFinalQ4TheoryRef.current);
      answers = {
        type: "grade8technologyFinalQ4Theory",
        answers: answers8techFinalQ4TheoryRef.current,
        quizResults: quizResultsRef.current,
      };
    } else if (g === "8" && s === "physics") {
      fileUrls = await uploadAttachments(attachments8physRef.current);
      answers = { type: "grade8physics", answers: answers8physRef.current };
    } else if (g === "9" && s === "physics" && tid === "atom") {
      fileUrls = await uploadAttachments(attachments9physAtomRef.current);
      answers = {
        type: "grade9physicsAtom",
        answers: answers9physAtomRef.current,
        quizResults: quizResultsRef.current,
      };
    } else if (g === "9" && s === "physics") {
      fileUrls = await uploadAttachments(attachments9physRef.current);
      answers = { type: "grade9physics", answers: answers9physRef.current };
    } else if (g === "9" && s === "technology" && tid === "final-q4") {
      fileUrls = await uploadAttachments(attachments9techFinalQ4Ref.current);
      answers = {
        type: "grade9technologyFinalQ4",
        answers: answers9techFinalQ4Ref.current,
        quizResults: quizResultsRef.current,
      };
    } else if (g === "9" && s === "technology") {
      fileUrls = await uploadAttachments(attachments9techRef.current);
      answers = { type: "grade9technology", answers: answers9techRef.current };
    } else if (g === "9") {
      fileUrls = await uploadAttachments(attachments9Ref.current);
      answers = { type: "grade9", answers: answers9Ref.current };
    } else if (g === "7" && s === "physics" && tid === "work-power") {
      fileUrls = await uploadAttachments(attachments7physWorkRef.current);
      answers = {
        type: "grade7physicsWork",
        answers: answers7physWorkRef.current,
        quizResults: quizResultsRef.current,
      };
    } else if (g === "7" && s === "physics") {
      fileUrls = await uploadAttachments(attachments7physRef.current);
      answers = { type: "grade7physics", answers: answers7physRef.current };
    } else if (g === "7" && s === "technology" && tid === "final-q4") {
      fileUrls = await uploadAttachments(attachments7techFinalQ4Ref.current);
      answers = {
        type: "grade7technologyFinalQ4",
        answers: answers7techFinalQ4Ref.current,
        quizResults: quizResultsRef.current,
      };
    } else if (g === "7" && s === "technology") {
      fileUrls = await uploadAttachments(attachments7techRef.current);
      answers = { type: "grade7technology", theory: theory7techRef.current, practice: practice7techRef.current };
    } else {
      fileUrls = await uploadAttachments(attachments7Ref.current);
      answers = { type: "grade7", theory: theory7Ref.current, practice: practice7Ref.current };
    }

    const testTitle = TESTS_CATALOG[g]?.[s]?.find((t) => t.id === tid)?.title || "";

    const elapsedSec = TOTAL_TIME - timeLeftRef.current;

    // Оценка темпа прохождения: считаем количество заполненных ответов
    const countFilled = (val: unknown): number => {
      if (Array.isArray(val)) return val.filter((x) => x !== "" && x !== null && x !== undefined).length;
      if (val && typeof val === "object") return Object.values(val).filter((x) => x !== "" && x !== null && x !== undefined).length;
      return 0;
    };
    let answeredCount = 0;
    for (const v of Object.values(answers as Record<string, unknown>)) {
      if (typeof v === "string" || typeof v === "number") {
        if (v !== "") answeredCount += 1;
      } else {
        answeredCount += countFilled(v);
      }
    }
    if (answeredCount >= 3 && elapsedSec > 0) {
      const avgPerAnswer = elapsedSec / answeredCount;
      if (elapsedSec < 60 || avgPerAnswer < 5) {
        const msg = `⚡ Подозрительно быстрое прохождение: тест за ${elapsedSec} сек, ${answeredCount} ответов (≈ ${avgPerAnswer.toFixed(1)} сек/ответ)`;
        cheatLogRef.current.push(`[${getTime()}] ${msg}`);
        try {
          await supabase.functions.invoke("notify-copy-attempt", {
            body: {
              studentName: name,
              grade: g,
              subject: s,
              event: msg,
            },
          });
        } catch (e) {
          console.error("Failed to notify fast pace:", e);
        }
      }
    }

    const payload = {
      studentName: name,
      grade: g,
      subject: s,
      attempt: a,
      testId: tid,
      testTitle,
      resultId,
      ...answers,
      attachments: fileUrls,
      cheatLog: cheatLogRef.current,
      timeSpent: elapsedSec,
    };

    try {
      const { error } = await supabase.functions.invoke("send-test-results", { body: payload });
      if (error) throw error;
    } catch (e) {
      console.error("Failed to send results:", e);
    }

    // Финализируем запись экрана: дофлашить буфер и проставить replay_url
    try {
      await finalizeRecording();
    } catch (e) {
      console.error("Failed to finalize recording:", e);
    }

    const submittedKey = getSubmittedKey(g, s, name, a, tid);
    localStorage.setItem(submittedKey, "1");
    localStorage.removeItem(getDraftKey(g, s, a, tid));
    localStorage.removeItem(getQuizDraftKey(g, s, a, tid));

    // Серверная чистка черновика — fire-and-forget
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clear-draft`;
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ""}`,
        },
        body: JSON.stringify({ student_name: name, grade: g, subject: s, test_id: tid, attempt: a }),
        keepalive: true,
      }).catch(() => {});
    } catch { /* ignore */ }

    setScreen("success");
    setSubmitting(false);
    submittingRef.current = false;
  };

  // Держим актуальную ссылку на doSubmit, чтобы эффект автосабмита (выше)
  // вызывал свежую версию без stale closure.
  useEffect(() => {
    doSubmitRef.current = doSubmit;
  });

  const handleSubmit = () => doSubmit();

  // ============ DB-backed test (created by teacher) ============
  if (activeDbTest) {
    return (
      <DbTestRunner
        test={activeDbTest}
        onBack={() => setActiveDbTest(null)}
        onSubmitted={() => {
          setActiveDbTest(null);
        }}
      />
    );
  }

  // ============ LOGIN SCREEN (multi-step) ============
  if (screen === "login") {
    const cardWrap = (children: React.ReactNode, title: string, subtitle?: string, back?: () => void) => (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center relative">
            {back && (
              <button
                onClick={back}
                className="absolute left-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Назад"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <CardTitle className="text-2xl">{title}</CardTitle>
            {subtitle && <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>}
          </CardHeader>
          <CardContent className="space-y-4">{children}</CardContent>
        </Card>
      </div>
    );

    if (loginStep === "grade") {
      return cardWrap(
        <div className="grid grid-cols-1 gap-3">
          {Object.keys(AVAILABLE_TESTS).map((g) => (
            <Button
              key={g}
              variant="outline"
              size="lg"
              className="h-14 text-lg"
              onClick={() => goToSubjectStep(g)}
            >
              {g} класс
            </Button>
          ))}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">или</span>
            </div>
          </div>
          <a href={`${import.meta.env.BASE_URL}live`} className="block">
            <Button variant="default" size="lg" className="h-14 text-lg w-full">
              🎟 Войти по коду класса
            </Button>
          </a>
        </div>,
        "Шаг 1. Выберите класс",
        "Итоговая аттестация за 4-ю четверть",
      );
    }

    if (loginStep === "subject") {
      const subjects = AVAILABLE_TESTS[grade] || [];
      return cardWrap(
        <div className="grid grid-cols-1 gap-3">
          {subjects.map((s) => (
            <Button
              key={s}
              variant="outline"
              size="lg"
              className="h-14 text-lg"
              onClick={() => goToNameStep(s)}
            >
              {SUBJECT_LABELS[s]}
            </Button>
          ))}
        </div>,
        "Шаг 2. Выберите предмет",
        `${grade} класс`,
        () => setLoginStep("grade"),
      );
    }

    if (loginStep === "name") {
      return cardWrap(
        <>
          <div>
            <Label htmlFor="student-name">Ваше Имя и Фамилия:</Label>
            <Input
              id="student-name"
              placeholder="Например: Иван Иванов"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="mt-1"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">Два слова на русском, без цифр и символов</p>
          </div>
          <Button onClick={goToTestPickStep} className="w-full mt-2" size="lg">
            Далее
          </Button>
        </>,
        "Шаг 3. Имя и Фамилия",
        `${grade} класс — ${SUBJECT_LABELS[subject]}`,
        () => setLoginStep("subject"),
      );
    }

    // test-pick
    const rawTests = TESTS_CATALOG[grade]?.[subject] || [];
    // Подсветка актуальной итоговой работы (неоновая кнопка)
    const featuredId =
      grade === "7" && subject === "technology" ? "final-q4" :
      grade === "8" && subject === "technology" ? "final-q4-theory" :
      grade === "9" && subject === "technology" ? "final-q4" :
      null;
    const tests = featuredId
      ? [...rawTests].sort((a, b) =>
          a.id === featuredId ? -1 : b.id === featuredId ? 1 : 0,
        )
      : rawTests;
    const totalCount = tests.length + dbTests.length;
    return cardWrap(
      <div className="grid grid-cols-1 gap-3">
        {totalCount === 0 ? (
          <p className="text-sm text-muted-foreground text-center">Работы пока не добавлены.</p>
        ) : (
          <>
            {tests.map((t) => {
              const isFeatured = featuredId && t.id === featuredId;
              const isDimmed = featuredId && t.id !== featuredId;
              return (
                <Button
                  key={t.id}
                  variant={isFeatured ? "default" : "outline"}
                  size="lg"
                  className={`h-auto min-h-14 py-3 text-base text-left whitespace-normal justify-start ${
                    isFeatured
                      ? "ring-2 ring-primary shadow-[0_0_24px_hsl(var(--primary)/0.55)] hover:shadow-[0_0_32px_hsl(var(--primary)/0.75)] scale-[1.02]"
                      : isDimmed
                        ? "opacity-50 hover:opacity-80 grayscale"
                        : ""
                  }`}
                  onClick={() => { void startTest(t.id); }}
                  disabled={checkingStorage}
                >
                  <span className="flex flex-col items-start gap-1 w-full">
                    <span>{t.title}</span>
                    {isFeatured && (
                      <span className="text-xs font-bold text-primary-foreground bg-primary-foreground/20 px-2 py-0.5 rounded">
                        🔥 Актуальная работа
                      </span>
                    )}
                    {t.date && (
                      <span className="text-xs font-bold text-accent bg-accent/15 px-2 py-0.5 rounded">
                        📅 {t.date}
                      </span>
                    )}
                  </span>
                </Button>
              );
            })}
            {dbTests.map((t) => (
              <Button
                key={t.id}
                variant="outline"
                size="lg"
                className="h-auto min-h-14 py-3 text-base text-left whitespace-normal justify-start"
                onClick={() => setActiveDbTest(t)}
              >
                <span className="flex flex-col items-start gap-1 w-full">
                  <span>{t.title}</span>
                  <span className="text-xs font-bold text-primary bg-primary/15 px-2 py-0.5 rounded">
                    {t.kind === "quiz" ? "🎯 Квиз от учителя" : t.kind === "hybrid" ? "🧩 Смешанный тест от учителя" : "📝 Самостоятельная от учителя"}
                  </span>
                </span>
              </Button>
            ))}
          </>
        )}
      </div>,
      "Шаг 4. Выберите работу",
      `${cleanName} • ${grade} класс • ${SUBJECT_LABELS[subject]}`,
      () => setLoginStep("name"),
    );
  }

  // SUCCESS
  if (screen === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg text-center">
          <CardContent className="py-12 space-y-4">
            <h1 className="text-4xl">✅</h1>
            <h2 className="text-2xl font-bold">Тест успешно завершен!</h2>
            <p className="text-muted-foreground">
              Ответы отправлены преподавателю. Можете закрыть эту вкладку.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // QUIZ PHASE — полностью блокируем основной тестовый экран,
  // пока ученик не закончил/не пропустил квиз.
  if (screen === "test" && (quizPhase === "intro" || quizPhase === "running")) {
    const cfg = TESTS_WITH_QUIZ[quizKey(grade, subject, testId)];
    if (!cfg) {
      // Рассинхрон ключей TESTS_WITH_QUIZ ↔ (grade/subject/testId).
      // Логируем и авто-чиним, чтобы тест не залип.
      console.error(
        "[quiz] cfg not found for",
        quizKey(grade, subject, testId),
        "but quizPhase=",
        quizPhase,
      );
      setQuizPhase("done");
      return null;
    }
    return (
      <>
        <RecordingBadge />
        {quizPhase === "intro" ? (
          <QuizIntro
            questionsCount={cfg.questions.length}
            secondsPerQuestion={cfg.secondsPerQuestion}
            onStart={() => setQuizPhase("running")}
          />
        ) : (
          <Quiz
            questions={cfg.questions}
            secondsPerQuestion={cfg.secondsPerQuestion}
            onFinish={handleQuizFinish}
            storageKey={getQuizDraftKey(grade, subject, attempt, testId)}
            onResumed={(fromIdx) => {
              toast({
                title: "Прогресс восстановлен",
                description: `Продолжаем квиз с вопроса ${fromIdx + 1}`,
              });
            }}
          />
        )}
      </>
    );
  }

  // TEST SCREEN
  const subjectLabel = subject === "informatics" ? "Информатика" : subject === "physics" ? "Физика" : "Технология";

  return (
    <div className="min-h-screen pb-8">
      {screen === "test" && <RecordingBadge />}
      <div className="sticky top-0 z-50 bg-card border-b shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-muted-foreground">
            Ученик: {cleanName} — {grade} класс, {subjectLabel}
          </span>
          <span className={`font-mono text-lg font-bold ${timeLeft < 300 ? "text-destructive" : "text-foreground"}`}>
            Осталось: {formatTime(timeLeft)}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <Progress value={progressPercent} className="flex-1 h-2" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {answered}/{total} ({progressPercent}%)
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">💾 Ответы сохраняются автоматически</p>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6 space-y-8">
        {grade === "8" && subject === "informatics" && testId === "python-hero" && (
          <Grade8InformaticsPython
            studentName={cleanName}
            answers={answers8infoPy}
            attachments={attachments8infoPy}
            onAnswerChange={(i, v) => {
              setAnswers8infoPy((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments8infoPy((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        {grade === "8" && subject === "informatics" && testId !== "python-hero" && (
          <Grade8Informatics
            blitz={blitz8}
            tasks={tasks8}
            attachments={attachments8}
            onBlitzChange={(i, v) => {
              setBlitz8((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onTaskChange={(key, v) => setTasks8((prev) => ({ ...prev, [key]: v }))}
            onAttachmentChange={(key, file) => setAttachments8((prev) => ({ ...prev, [key]: file }))}
          />
        )}

        {grade === "8" && subject === "physics" && testId === "power-joule" && (
          <Grade8PhysicsPower
            answers={answers8physPower}
            attachments={attachments8physPower}
            onAnswerChange={(i, v) => {
              setAnswers8physPower((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments8physPower((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        {grade === "8" && subject === "physics" && testId === "final-q4" && (
          <Grade8PhysicsFinalQ4
            answers={answers8physFinalQ4}
            attachments={attachments8physFinalQ4}
            onAnswerChange={(i, v) => {
              setAnswers8physFinalQ4((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments8physFinalQ4((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        {grade === "6" && subject === "technology" && testId === "final-q4" && (
          <Grade6TechnologyFinalQ4
            answers={answers6techFinalQ4}
            attachments={attachments6techFinalQ4}
            onAnswerChange={(i, v) => {
              setAnswers6techFinalQ4((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments6techFinalQ4((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        {grade === "5" && subject === "technology" && testId === "final-q4-v2" && (
          <Grade5TechnologyFinalQ4V2
            answers={answers5techFinalQ4V2}
            attachments={attachments5techFinalQ4V2}
            onAnswerChange={(i, v) => {
              setAnswers5techFinalQ4V2((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments5techFinalQ4V2((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        {grade === "5" && subject === "technology" && testId === "final-q4-v3" && (
          <Grade5TechnologyFinalQ4V3
            answers={answers5techFinalQ4V3}
            attachments={attachments5techFinalQ4V3}
            onAnswerChange={(i, v) => {
              setAnswers5techFinalQ4V3((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments5techFinalQ4V3((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        {grade === "8" && subject === "technology" && testId === "final-q4-theory" && (
          <Grade8TechnologyFinalQ4Theory
            answers={answers8techFinalQ4Theory}
            attachments={attachments8techFinalQ4Theory}
            onAnswerChange={(i, v) => {
              setAnswers8techFinalQ4Theory((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments8techFinalQ4Theory((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        {grade === "8" && subject === "physics" && testId !== "power-joule" && testId !== "final-q4" && (
          <Grade8Physics
            answers={answers8phys}
            attachments={attachments8phys}
            onAnswerChange={(i, v) => {
              setAnswers8phys((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments8phys((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        {grade === "7" && subject === "technology" && testId === "final-q4" && (
          <Grade7TechnologyFinalQ4
            answers={answers7techFinalQ4}
            attachments={attachments7techFinalQ4}
            onAnswerChange={(i, v) => {
              setAnswers7techFinalQ4((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments7techFinalQ4((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        {grade === "7" && subject === "technology" && testId !== "final-q4" && (
          <Grade7Technology
            theory={theory7tech}
            practice={practice7tech}
            attachments={attachments7tech}
            onTheoryChange={(i, v) => {
              setTheory7tech((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onPracticeChange={(i, v) => {
              setPractice7tech((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments7tech((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        {grade === "7" && subject === "physics" && testId === "work-power" && (
          <Grade7PhysicsWork
            answers={answers7physWork}
            attachments={attachments7physWork}
            onAnswerChange={(i, v) => {
              setAnswers7physWork((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments7physWork((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        {grade === "7" && subject === "physics" && testId !== "work-power" && (
          <Grade7Physics
            answers={answers7phys}
            attachments={attachments7phys}
            onAnswerChange={(i, v) => {
              setAnswers7phys((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments7phys((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        {grade === "7" && subject === "informatics" && (
          <Grade7Informatics
            theory={theory7}
            practice={practice7}
            attachments={attachments7}
            onTheoryChange={(i, v) => {
              setTheory7((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onPracticeChange={(i, v) => {
              setPractice7((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments7((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        {grade === "9" && subject === "informatics" && (
          <Grade9Informatics
            answers={answers9}
            attachments={attachments9}
            onAnswerChange={(i, v) => {
              setAnswers9((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments9((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        {grade === "9" && subject === "physics" && testId === "atom" && (
          <Grade9PhysicsAtom
            answers={answers9physAtom}
            attachments={attachments9physAtom}
            onAnswerChange={(i, v) => {
              setAnswers9physAtom((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments9physAtom((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        {grade === "9" && subject === "physics" && testId !== "atom" && (
          <Grade9Physics
            answers={answers9phys}
            attachments={attachments9phys}
            onAnswerChange={(i, v) => {
              setAnswers9phys((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments9phys((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        {grade === "9" && subject === "technology" && testId === "final-q4" && (
          <Grade9TechnologyFinalQ4
            answers={answers9techFinalQ4}
            attachments={attachments9techFinalQ4}
            onAnswerChange={(i, v) => {
              setAnswers9techFinalQ4((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments9techFinalQ4((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        {grade === "9" && subject === "technology" && testId !== "final-q4" && (
          <Grade9Technology
            answers={answers9tech}
            attachments={attachments9tech}
            onAnswerChange={(i, v) => {
              setAnswers9tech((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments9tech((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        <div className="text-center pt-4 pb-8">
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={submitting}
            size="lg"
            className="bg-accent text-accent-foreground hover:bg-accent/90 px-10 py-6 text-lg"
          >
            {submitting ? "Отправка..." : "Завершить и отправить ответы"}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. После отправки вернуться к тесту будет невозможно.
              Заполнено {answered} из {total} вопросов.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>Отправить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;

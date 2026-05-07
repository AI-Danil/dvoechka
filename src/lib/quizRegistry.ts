import type { QuizQuestion } from "@/components/Quiz";
import { ATOM_QUIZ_QUESTIONS } from "@/components/tests/Grade9PhysicsAtom";
import { WORK_POWER_QUIZ_QUESTIONS } from "@/components/tests/Grade7PhysicsWork";
import { PYTHON_HERO_QUIZ_QUESTIONS } from "@/components/tests/Grade8InformaticsPython";
import { FINAL_Q4_QUIZ_QUESTIONS } from "@/components/tests/Grade8PhysicsFinalQ4";
import { FINAL_Q4_TECH5_V2_QUIZ_QUESTIONS } from "@/components/tests/Grade5TechnologyFinalQ4V2";

// test_type строки, которые сохраняются в БД при сабмите квизов.
// Сопоставляем их с массивом вопросов.
const REGISTRY: Record<string, QuizQuestion[]> = {
  grade9physicsAtom: ATOM_QUIZ_QUESTIONS,
  grade7physicsWorkPower: WORK_POWER_QUIZ_QUESTIONS,
  grade8informaticsPython: PYTHON_HERO_QUIZ_QUESTIONS,
  grade8physicsFinalQ4: FINAL_Q4_QUIZ_QUESTIONS,
  grade5technologyFinalQ4V2: FINAL_Q4_TECH5_V2_QUIZ_QUESTIONS,
};

export function getQuizQuestionsForTestType(testType?: string | null): QuizQuestion[] | null {
  if (!testType) return null;
  return REGISTRY[testType] ?? null;
}

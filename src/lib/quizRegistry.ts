import type { QuizQuestion } from "@/components/Quiz";
import { ATOM_QUIZ_QUESTIONS } from "@/components/tests/Grade9PhysicsAtom";
import { WORK_POWER_QUIZ_QUESTIONS } from "@/components/tests/Grade7PhysicsWork";
import { PYTHON_HERO_QUIZ_QUESTIONS } from "@/components/tests/Grade8InformaticsPython";
import { FINAL_Q4_QUIZ_QUESTIONS } from "@/components/tests/Grade8PhysicsFinalQ4";
import { FINAL_Q4_TECH5_V2_QUIZ_QUESTIONS } from "@/components/tests/Grade5TechnologyFinalQ4V2";
import { FINAL_Q4_TECH5_V3_QUIZ_QUESTIONS } from "@/components/tests/Grade5TechnologyFinalQ4V3";
import { FINAL_Q4_TECH6_QUIZ_QUESTIONS } from "@/components/tests/Grade6TechnologyFinalQ4";
import { FINAL_Q4_TECH7_QUIZ_QUESTIONS } from "@/components/tests/Grade7TechnologyFinalQ4";
import { FINAL_Q4_TECH8_THEORY_QUIZ_QUESTIONS } from "@/components/tests/Grade8TechnologyFinalQ4Theory";
import { FINAL_Q4_TECH9_QUIZ_QUESTIONS } from "@/components/tests/Grade9TechnologyFinalQ4";
import { FINAL_Q4_INF7_QUIZ_QUESTIONS } from "@/components/tests/Grade7InformaticsFinalQ4Quiz";
import { FINAL_Q4_INF6_QUIZ_QUESTIONS } from "@/components/tests/Grade6TechnologyFinalQ4Quiz";
import { FINAL_Q4_PHYS9_QUIZ_QUESTIONS } from "@/components/tests/Grade9PhysicsFinalQ4Quiz";

// test_type строки, которые сохраняются в БД при сабмите квизов.
// Сопоставляем их с массивом вопросов.
// ВАЖНО: при добавлении нового хардкод-теста ОБЯЗАТЕЛЬНО регистрируй его здесь,
// иначе на странице результата вместо вопроса будет «[вопрос недоступен]».
// Покрыто тестом src/lib/quizRegistry.test.ts.
export const QUIZ_REGISTRY: Record<string, QuizQuestion[]> = {
  grade9physicsAtom: ATOM_QUIZ_QUESTIONS,
  grade7physicsWorkPower: WORK_POWER_QUIZ_QUESTIONS,
  grade8informaticsPython: PYTHON_HERO_QUIZ_QUESTIONS,
  grade8physicsFinalQ4: FINAL_Q4_QUIZ_QUESTIONS,
  grade5technologyFinalQ4V2: FINAL_Q4_TECH5_V2_QUIZ_QUESTIONS,
  grade5technologyFinalQ4V3: FINAL_Q4_TECH5_V3_QUIZ_QUESTIONS,
  grade6technologyFinalQ4: FINAL_Q4_TECH6_QUIZ_QUESTIONS,
  grade7technologyFinalQ4: FINAL_Q4_TECH7_QUIZ_QUESTIONS,
  grade8technologyFinalQ4Theory: FINAL_Q4_TECH8_THEORY_QUIZ_QUESTIONS,
  grade9technologyFinalQ4: FINAL_Q4_TECH9_QUIZ_QUESTIONS,
  grade7informaticsFinalQ4Quiz: FINAL_Q4_INF7_QUIZ_QUESTIONS,
  grade6technologyFinalQ4Quiz: FINAL_Q4_INF6_QUIZ_QUESTIONS,
};

export function getQuizQuestionsForTestType(testType?: string | null): QuizQuestion[] | null {
  if (!testType) return null;
  return QUIZ_REGISTRY[testType] ?? null;
}

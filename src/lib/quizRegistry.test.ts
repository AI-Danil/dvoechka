import { describe, it, expect } from "vitest";
import { QUIZ_REGISTRY, getQuizQuestionsForTestType } from "./quizRegistry";

// Известные test_type строки, которые когда-либо сохранялись в БД
// для хардкод-квизов. Если добавляешь новый — допиши сюда И в реестр.
const KNOWN_HARDCODED_TEST_TYPES = [
  "grade9physicsAtom",
  "grade7physicsWorkPower",
  "grade8informaticsPython",
  "grade8physicsFinalQ4",
  "grade5technologyFinalQ4V2",
  "grade6technologyFinalQ4",
  "grade7technologyFinalQ4",
  "grade8technologyFinalQ4Theory",
];

describe("quizRegistry", () => {
  it.each(KNOWN_HARDCODED_TEST_TYPES)(
    "registers questions for %s",
    (testType) => {
      const qs = getQuizQuestionsForTestType(testType);
      expect(qs, `missing registry entry for ${testType}`).toBeTruthy();
      expect(qs!.length).toBeGreaterThan(0);
    }
  );

  it("returns null for unknown / db: test types", () => {
    expect(getQuizQuestionsForTestType(null)).toBeNull();
    expect(getQuizQuestionsForTestType(undefined)).toBeNull();
    expect(getQuizQuestionsForTestType("db:abc-123")).toBeNull();
    expect(getQuizQuestionsForTestType("nonexistent")).toBeNull();
  });

  it("every registry entry has well-formed questions", () => {
    for (const [type, qs] of Object.entries(QUIZ_REGISTRY)) {
      expect(qs.length, `${type} has 0 questions`).toBeGreaterThan(0);
      for (const q of qs) {
        expect(typeof q.q).toBe("string");
        expect(Array.isArray(q.options)).toBe(true);
        expect(q.options.length).toBe(4);
        expect(q.correct).toBeGreaterThanOrEqual(0);
        expect(q.correct).toBeLessThan(4);
      }
    }
  });
});

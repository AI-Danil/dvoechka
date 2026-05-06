import { describe, it, expect } from "vitest";
import { gradeQuiz, percentageToMark, parseClassNumber } from "./grading";

describe("percentageToMark", () => {
  it.each([
    [100, 5], [90, 5], [89, 4], [70, 4], [69, 3], [50, 3], [49, 2], [0, 2],
  ])("%i%% → %i", (p, mark) => {
    expect(percentageToMark(p)).toBe(mark);
  });
});

describe("gradeQuiz", () => {
  const qs = [
    { position: 0, correct_index: 1, points: 1 },
    { position: 1, correct_index: 2, points: 2 },
    { position: 2, correct_index: 0, points: 1 },
  ];
  it("counts correct answers and points", () => {
    const r = gradeQuiz(qs, [
      { position: 0, selected_index: 1 },
      { position: 1, selected_index: 2 },
      { position: 2, selected_index: 1 },
    ]);
    expect(r.totalPoints).toBe(3);
    expect(r.maxPoints).toBe(4);
    expect(r.correctCount).toBe(2);
    expect(r.mark).toBe(4);
  });
  it("handles all wrong → mark 2", () => {
    const r = gradeQuiz(qs, [{ position: 0, selected_index: 0 }]);
    expect(r.mark).toBe(2);
  });
  it("handles empty questions safely", () => {
    const r = gradeQuiz([], []);
    expect(r.percentage).toBe(0);
    expect(r.mark).toBe(2);
  });
});

describe("parseClassNumber", () => {
  it.each([
    ["7А", 7], ["8 класс", 8], ["9", 9], ["", null], [null, null], ["абв", null],
  ])("%s → %s", (input, expected) => {
    expect(parseClassNumber(input as string)).toBe(expected);
  });
});

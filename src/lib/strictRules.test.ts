import { describe, it, expect } from "vitest";
import { requiresStrictRules } from "./strictRules";

describe("requiresStrictRules", () => {
  it("matches 'Итоговая контрольная …'", () => {
    expect(requiresStrictRules({ title: "Итоговая контрольная по физике" })).toBe(true);
  });
  it("matches 'Контрольная работа …'", () => {
    expect(requiresStrictRules({ title: "Контрольная работа №3" })).toBe(true);
  });
  it("does not match obычный тест", () => {
    expect(requiresStrictRules({ title: "Самостоятельная" })).toBe(false);
  });
  it("handles empty title", () => {
    expect(requiresStrictRules({ title: "" })).toBe(false);
  });
});

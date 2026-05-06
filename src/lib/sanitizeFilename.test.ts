import { describe, it, expect } from "vitest";
import { sanitizeFilename } from "./sanitizeFilename";

describe("sanitizeFilename", () => {
  it("transliterates Cyrillic", () => {
    expect(sanitizeFilename("Привет.txt")).toBe("Privet.txt");
  });
  it("preserves ASCII basic name", () => {
    expect(sanitizeFilename("photo_01.jpg")).toBe("photo_01.jpg");
  });
  it("replaces spaces and special chars", () => {
    expect(sanitizeFilename("моя работа №1.pdf")).toBe("moya_rabota_No1.pdf");
  });
  it("handles empty string", () => {
    expect(sanitizeFilename("")).toBe("file");
  });
  it("strips leading/trailing underscores", () => {
    expect(sanitizeFilename("___test___")).toBe("test");
  });
  it("handles ё, щ, ъ, ь", () => {
    expect(sanitizeFilename("ёжик_щука_объять.txt")).toBe("yozhik_schuka_obyat.txt");
  });
});

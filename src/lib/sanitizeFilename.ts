/**
 * Транслитерация Cyrillic → ASCII и санитизация имени файла для Supabase Storage.
 * Storage не принимает не-ASCII символы в ключах, поэтому имена с кириллицей
 * нужно конвертировать перед загрузкой.
 */
const CYR_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function translitChar(ch: string): string {
  const lower = ch.toLowerCase();
  const mapped = CYR_MAP[lower];
  if (mapped === undefined) return ch;
  if (ch === lower) return mapped;
  return mapped.charAt(0).toUpperCase() + mapped.slice(1);
}

/**
 * Конвертирует имя файла в безопасную ASCII-строку.
 * - Транслитерирует кириллицу
 * - Заменяет всё кроме [A-Za-z0-9._-] на _
 * - Убирает повторяющиеся подчёркивания
 * - Гарантирует не-пустой результат
 */
export function sanitizeFilename(name: string): string {
  if (!name) return "file";
  const transliterated = Array.from(name).map(translitChar).join("");
  const cleaned = transliterated
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "file";
}

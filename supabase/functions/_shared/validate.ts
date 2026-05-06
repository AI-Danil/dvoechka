// Хелпер для парсинга и валидации JSON-тела запросов через zod.
// Возвращает либо распарсенные данные, либо готовый Response с 400.
import { z } from "https://esm.sh/zod@3.23.8";
import { errorResponse } from "./cors.ts";

export async function parseJson<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: errorResponse("invalid_json", "Body is not valid JSON") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: errorResponse(
        "validation",
        "Validation failed",
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

export { z };

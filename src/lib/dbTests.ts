import { supabase } from "@/integrations/supabase/client";

export interface DbTestSummary {
  id: string;
  title: string;
  kind: "quiz" | "written" | "hybrid";
  time_per_question_sec: number;
  class_id: string;
  subject_id: string;
}

export interface DbTestQuestion {
  id: string;
  position: number;
  question_text: string;
  options: string[];
  points: number;
  response_kind: "quiz" | "written";
  block_title: string | null;
  seconds_override: number | null;
}

const SUBJECT_NAME_BY_KEY: Record<string, string> = {
  informatics: "Информатика",
  physics: "Физика",
  technology: "Технология",
};

export async function loadPublishedTestsForGradeSubject(
  grade: string,
  subjectKey: string,
): Promise<DbTestSummary[]> {
  const subjectName = SUBJECT_NAME_BY_KEY[subjectKey];
  if (!subjectName) return [];

  const { data, error } = await supabase
    .from("public_tests" as any)
    .select("id, title, kind, time_per_question_sec, class_id, subject_id, class_name, class_year, subject_name")
    .eq("class_year", 2025)
    .eq("subject_name", subjectName)
    .like("class_name", `${grade}%`);
  if (error) {
    console.error("loadPublishedTests error", error);
    return [];
  }
  return ((data ?? []) as unknown) as DbTestSummary[];
}

export async function loadTestQuestions(testId: string): Promise<DbTestQuestion[]> {
  const { data, error } = await supabase
    .from("public_test_questions" as any)
    .select("id, position, question_text, options, points, response_kind, block_title, seconds_override")
    .eq("test_id", testId)
    .order("position");
  if (error) {
    console.error("loadTestQuestions error", error);
    return [];
  }
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    position: r.position,
    question_text: r.question_text,
    options: Array.isArray(r.options) ? r.options : [],
    points: r.points ?? 1,
    response_kind: (r.response_kind as "quiz" | "written") ?? "quiz",
    block_title: r.block_title ?? null,
    seconds_override: r.seconds_override ?? null,
  }));
}

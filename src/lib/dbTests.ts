import { supabase } from "@/integrations/supabase/client";

export interface DbTestSummary {
  id: string;
  title: string;
  kind: "quiz" | "written";
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

  // Найти класс по году/имени (year=2025, name начинается с цифры)
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, year")
    .eq("year", 2025);
  const classRow = classes?.find((c) => c.name.startsWith(grade));
  if (!classRow) return [];

  const { data: subj } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("name", subjectName)
    .maybeSingle();
  if (!subj) return [];

  const { data, error } = await supabase
    .from("public_tests" as any)
    .select("id, title, kind, time_per_question_sec, class_id, subject_id")
    .eq("class_id", classRow.id)
    .eq("subject_id", subj.id);
  if (error) {
    console.error("loadPublishedTests error", error);
    return [];
  }
  return (data ?? []) as DbTestSummary[];
}

export async function loadTestQuestions(testId: string): Promise<DbTestQuestion[]> {
  const { data, error } = await supabase
    .from("public_test_questions" as any)
    .select("id, position, question_text, options, points")
    .eq("test_id", testId)
    .order("position");
  if (error) {
    console.error("loadTestQuestions error", error);
    return [];
  }
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    options: Array.isArray(r.options) ? r.options : [],
  }));
}

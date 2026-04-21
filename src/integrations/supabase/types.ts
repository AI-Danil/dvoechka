export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      classes: {
        Row: {
          created_at: string
          id: string
          name: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          year?: number
        }
        Relationships: []
      }
      students: {
        Row: {
          class_id: string | null
          created_at: string
          full_name: string
          id: string
          user_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          user_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      teacher_assignments: {
        Row: {
          class_id: string
          created_at: string
          id: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      test_attempts: {
        Row: {
          attempt_no: number
          cheat_log: Json
          created_at: string
          current_phase: string
          current_question: number
          draft_answers: Json
          finished_at: string | null
          id: string
          last_activity_at: string
          result_id: string | null
          started_at: string
          status: string
          student_fingerprint: string | null
          student_name: string
          test_id: string
        }
        Insert: {
          attempt_no?: number
          cheat_log?: Json
          created_at?: string
          current_phase?: string
          current_question?: number
          draft_answers?: Json
          finished_at?: string | null
          id?: string
          last_activity_at?: string
          result_id?: string | null
          started_at?: string
          status?: string
          student_fingerprint?: string | null
          student_name: string
          test_id: string
        }
        Update: {
          attempt_no?: number
          cheat_log?: Json
          created_at?: string
          current_phase?: string
          current_question?: number
          draft_answers?: Json
          finished_at?: string | null
          id?: string
          last_activity_at?: string
          result_id?: string | null
          started_at?: string
          status?: string
          student_fingerprint?: string | null
          student_name?: string
          test_id?: string
        }
        Relationships: []
      }
      test_questions: {
        Row: {
          block_title: string | null
          correct_index: number | null
          created_at: string
          expected_answer: string | null
          id: string
          options: Json
          points: number
          position: number
          question_text: string
          response_kind: string
          seconds_override: number | null
          test_id: string
        }
        Insert: {
          block_title?: string | null
          correct_index?: number | null
          created_at?: string
          expected_answer?: string | null
          id?: string
          options?: Json
          points?: number
          position: number
          question_text: string
          response_kind?: string
          seconds_override?: number | null
          test_id: string
        }
        Update: {
          block_title?: string | null
          correct_index?: number | null
          created_at?: string
          expected_answer?: string | null
          id?: string
          options?: Json
          points?: number
          position?: number
          question_text?: string
          response_kind?: string
          seconds_override?: number | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "public_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          answers: Json
          attachments: Json | null
          attempt: number | null
          cheat_log: Json | null
          created_at: string | null
          grade: number
          id: string
          replay_url: string | null
          student_name: string
          subject: string
          test_type: string | null
          time_spent: number | null
        }
        Insert: {
          answers: Json
          attachments?: Json | null
          attempt?: number | null
          cheat_log?: Json | null
          created_at?: string | null
          grade: number
          id?: string
          replay_url?: string | null
          student_name: string
          subject: string
          test_type?: string | null
          time_spent?: number | null
        }
        Update: {
          answers?: Json
          attachments?: Json | null
          attempt?: number | null
          cheat_log?: Json | null
          created_at?: string | null
          grade?: number
          id?: string
          replay_url?: string | null
          student_name?: string
          subject?: string
          test_type?: string | null
          time_spent?: number | null
        }
        Relationships: []
      }
      tests: {
        Row: {
          author_user_id: string
          class_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["test_kind"]
          status: Database["public"]["Enums"]["test_status"]
          subject_id: string
          teacher_id: string | null
          time_per_question_sec: number
          title: string
          updated_at: string
        }
        Insert: {
          author_user_id: string
          class_id: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["test_kind"]
          status?: Database["public"]["Enums"]["test_status"]
          subject_id: string
          teacher_id?: string | null
          time_per_question_sec?: number
          title: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          class_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["test_kind"]
          status?: Database["public"]["Enums"]["test_status"]
          subject_id?: string
          teacher_id?: string | null
          time_per_question_sec?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_test_questions: {
        Row: {
          block_title: string | null
          id: string | null
          options: Json | null
          points: number | null
          position: number | null
          question_text: string | null
          response_kind: string | null
          seconds_override: number | null
          test_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "public_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      public_tests: {
        Row: {
          class_id: string | null
          class_name: string | null
          class_year: number | null
          created_at: string | null
          id: string | null
          kind: Database["public"]["Enums"]["test_kind"] | null
          subject_id: string | null
          subject_name: string | null
          time_per_question_sec: number | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
      test_kind: "quiz" | "written" | "hybrid"
      test_status: "draft" | "published"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "teacher", "student"],
      test_kind: ["quiz", "written", "hybrid"],
      test_status: ["draft", "published"],
    },
  },
} as const

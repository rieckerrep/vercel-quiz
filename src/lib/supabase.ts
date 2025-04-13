export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      answered_cases_subquestions: {
        Row: {
          id: number
          is_correct: boolean | null
          subquestion_id: number
          user_id: string
        }
        Insert: {
          id?: never
          is_correct?: boolean | null
          subquestion_id: number
          user_id: string
        }
        Update: {
          id?: never
          is_correct?: boolean | null
          subquestion_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answered_cases_subquestions_subquestion_id_fkey"
            columns: ["subquestion_id"]
            isOneToOne: false
            referencedRelation: "cases_subquestions"
            referencedColumns: ["id"]
          },
        ]
      }
      answered_questions: {
        Row: {
          id: number
          question_id: number | null
          user_id: string
          is_correct: boolean | null
          answered_at: string | null
          chapter_id: number | null
        }
        Insert: {
          id?: number
          question_id?: number | null
          user_id?: string
          is_correct?: boolean | null
          answered_at?: string | null
          chapter_id?: number | null
        }
        Update: {
          id?: number
          question_id?: number | null
          user_id?: string
          is_correct?: boolean | null
          answered_at?: string | null
          chapter_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "answered_questions_question_id_fkey"
            columns: ["question_id"]
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answered_questions_chapter_id_fkey"
            columns: ["chapter_id"]
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          }
        ]
      }
      cases_subquestions: {
        Row: {
          correct_answer: string
          explanation: string | null
          id: number
          question_id: number
          statement_text: string
        }
        Insert: {
          correct_answer: string
          explanation?: string | null
          id?: never
          question_id: number
          statement_text: string
        }
        Update: {
          correct_answer?: string
          explanation?: string | null
          id?: never
          question_id?: number
          statement_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_subquestions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          course_id: number
          id: number
          name: string | null
        }
        Insert: {
          course_id: number
          id?: number
          name?: string | null
        }
        Update: {
          course_id?: number
          id?: number
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          id: number
          name: string | null
          subject_id: number
        }
        Insert: {
          id?: number
          name?: string | null
          subject_id: number
        }
        Update: {
          id?: number
          name?: string | null
          subject_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "courses_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      dragdrop_groups: {
        Row: {
          group_name: string | null
          id: number
          question_id: number
        }
        Insert: {
          group_name?: string | null
          id?: number
          question_id: number
        }
        Update: {
          group_name?: string | null
          id?: number
          question_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "dragdrop_groups_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      dragdrop_pairs: {
        Row: {
          correct_match: string | null
          drag_text: string | null
          group_id: number
          id: number
        }
        Insert: {
          correct_match?: string | null
          drag_text?: string | null
          group_id: number
          id?: number
        }
        Update: {
          correct_match?: string | null
          drag_text?: string | null
          group_id?: number
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "dragdrop_pairs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "dragdrop_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      league_positions: {
        Row: {
          league_name: string
          points: number | null
          ranking: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          league_name: string
          points?: number | null
          ranking?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          league_name?: string
          points?: number | null
          ranking?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          id: number
          league_img: string | null
          name: string
        }
        Insert: {
          id?: number
          league_img?: string | null
          name: string
        }
        Update: {
          id?: number
          league_img?: string | null
          name?: string
        }
        Relationships: []
      }
      levels: {
        Row: {
          id: number
          level_image: string | null
          level_number: number
          level_title: string | null
          xp_required: number
        }
        Insert: {
          id?: number
          level_image?: string | null
          level_number: number
          level_title?: string | null
          xp_required: number
        }
        Update: {
          id?: number
          level_image?: string | null
          level_number?: number
          level_title?: string | null
          xp_required?: number
        }
        Relationships: []
      }
      monthly_uni_scores: {
        Row: {
          id: number
          month_end: string
          month_start: string
          university_id: number | null
          xp_this_month: number
        }
        Insert: {
          id?: number
          month_end: string
          month_start: string
          university_id?: number | null
          xp_this_month?: number
        }
        Update: {
          id?: number
          month_end?: string
          month_start?: string
          university_id?: number | null
          xp_this_month?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_uni_scores_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      multiple_choice_options: {
        Row: {
          id: number
          is_correct: boolean
          option_text: string
          question_id: number
        }
        Insert: {
          id?: never
          is_correct: boolean
          option_text: string
          question_id: number
        }
        Update: {
          id?: never
          is_correct?: boolean
          option_text?: string
          question_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "multiple_choice_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          university: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          university?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          university?: string | null
          username?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          id: number
          "Frage": string | null
          "Antwort A": string | null
          "Antwort B": string | null
          "Antwort C": string | null
          "Antwort D": string | null
          "Richtige Antwort": string | null
          "Begruendung": string | null
          type: string | null
          chapter_id: number
          course_id: number | null
          subquestions_count: number | null
        }
        Insert: {
          id?: number
          "Frage"?: string | null
          "Antwort A"?: string | null
          "Antwort B"?: string | null
          "Antwort C"?: string | null
          "Antwort D"?: string | null
          "Richtige Antwort"?: string | null
          "Begruendung"?: string | null
          type?: string | null
          chapter_id: number
          course_id?: number | null
          subquestions_count?: number | null
        }
        Update: {
          id?: number
          "Frage"?: string | null
          "Antwort A"?: string | null
          "Antwort B"?: string | null
          "Antwort C"?: string | null
          "Antwort D"?: string | null
          "Richtige Antwort"?: string | null
          "Begruendung"?: string | null
          type?: string | null
          chapter_id?: number
          course_id?: number | null
          subquestions_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_chapter_id_fkey"
            columns: ["chapter_id"]
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_course_id_fkey"
            columns: ["course_id"]
            referencedRelation: "courses"
            referencedColumns: ["id"]
          }
        ]
      }
      quiz_progress: {
        Row: {
          id: number
          user_id: string
          chapter_id: number
          progress: number
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          chapter_id: number
          progress: number
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          chapter_id?: number
          progress?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_progress_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      sequence_items: {
        Row: {
          correct_position: number | null
          id: number
          level: string | null
          question_id: number | null
          text: string | null
        }
        Insert: {
          correct_position?: number | null
          id?: number
          level?: string | null
          question_id?: number | null
          text?: string | null
        }
        Update: {
          correct_position?: number | null
          id?: number
          level?: string | null
          question_id?: number | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequence_items_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_avatars: {
        Row: {
          active: boolean | null
          category: string | null
          id: number
          image_url: string
          price: number
          title: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          id?: number
          image_url: string
          price: number
          title?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          id?: number
          image_url?: string
          price?: number
          title?: string | null
        }
        Relationships: []
      }
      subjects: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      universities: {
        Row: {
          created_at: string | null
          id: number
          name: string
          xp_total: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          xp_total?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          xp_total?: number | null
        }
        Relationships: []
      }
      user_avatars: {
        Row: {
          avatar_id: number
          created_at: string | null
          user_id: string
        }
        Insert: {
          avatar_id: number
          created_at?: string | null
          user_id: string
        }
        Update: {
          avatar_id?: number
          created_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_avatars_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "shop_avatars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_avatars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          avatar_url: string | null
          bronze_medals: number | null
          correct_answers: number | null
          created_at: string | null
          current_league: string | null
          gold_medals: number | null
          id: string
          last_played: string | null
          league_group: string | null
          level: number | null
          questions_answered: number | null
          silver_medals: number | null
          streak: number | null
          title: string | null
          total_coins: number | null
          total_xp: number | null
          updated_at: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bronze_medals?: number | null
          correct_answers?: number | null
          created_at?: string | null
          current_league?: string | null
          gold_medals?: number | null
          id?: string
          last_played?: string | null
          league_group?: string | null
          level?: number | null
          questions_answered?: number | null
          silver_medals?: number | null
          streak?: number | null
          title?: string | null
          total_coins?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bronze_medals?: number | null
          correct_answers?: number | null
          created_at?: string | null
          current_league?: string | null
          gold_medals?: number | null
          id?: string
          last_played?: string | null
          league_group?: string | null
          level?: number | null
          questions_answered?: number | null
          silver_medals?: number | null
          streak?: number | null
          title?: string | null
          total_coins?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_league_leaderboard: {
        Args: { league_name: string }
        Returns: {
          username: string
          xp: number
        }[]
      }
      get_player_leaderboard: {
        Args: Record<PropertyKey, never>
        Returns: {
          username: string
          xp: number
        }[]
      }
      get_subject_breakdown_for_user: {
        Args: { _user_id: string }
        Returns: {
          subject_name: string
          correct_count: number
          wrong_count: number
          total: number
          correct_percent: number
        }[]
      }
      get_university_contributors: {
        Args: { uni_name: string }
        Returns: {
          username: string
          total_xp: number
          user_id: string
        }[]
      }
      get_university_leaderboard: {
        Args: Record<PropertyKey, never>
        Returns: {
          university: string
          xp_sum: number
        }[]
      }
      reset_leagues: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      reset_uni_leaderboard: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_league_groups: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

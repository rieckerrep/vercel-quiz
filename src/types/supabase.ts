export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          answered_at: string | null
          id: number
          is_correct: boolean | null
          question_id: number | null
          user_id: string
        }
        Insert: {
          answered_at?: string | null
          id?: number
          is_correct?: boolean | null
          question_id?: number | null
          user_id?: string
        }
        Update: {
          answered_at?: string | null
          id?: number
          is_correct?: boolean | null
          question_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answered_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
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
          "Antwort A": string | null
          "Antwort B": string | null
          "Antwort C": string | null
          "Antwort D": string | null
          Begründung: string | null
          chapter_id: number
          course_id: number | null
          Frage: string | null
          id: number
          "Richtige Antwort": string | null
          subquestions_count: number | null
          type: string | null
        }
        Insert: {
          "Antwort A"?: string | null
          "Antwort B"?: string | null
          "Antwort C"?: string | null
          "Antwort D"?: string | null
          Begründung?: string | null
          chapter_id: number
          course_id?: number | null
          Frage?: string | null
          id?: number
          "Richtige Antwort"?: string | null
          subquestions_count?: number | null
          type?: string | null
        }
        Update: {
          "Antwort A"?: string | null
          "Antwort B"?: string | null
          "Antwort C"?: string | null
          "Antwort D"?: string | null
          Begründung?: string | null
          chapter_id?: number
          course_id?: number | null
          Frage?: string | null
          id?: number
          "Richtige Antwort"?: string | null
          subquestions_count?: number | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
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
          created_at: string | null
          current_league: string | null
          gold_medals: number | null
          id: string
          last_played: string | null
          league_group: string | null
          level: number | null
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
          created_at?: string | null
          current_league?: string | null
          gold_medals?: number | null
          id?: string
          last_played?: string | null
          league_group?: string | null
          level?: number | null
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
          created_at?: string | null
          current_league?: string | null
          gold_medals?: number | null
          id?: string
          last_played?: string | null
          league_group?: string | null
          level?: number | null
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
        Args: {
          league_name: string
        }
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
        Args: {
          _user_id: string
        }
        Returns: {
          subject_name: string
          correct_count: number
          wrong_count: number
          total: number
          correct_percent: number
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

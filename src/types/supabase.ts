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
      versions: {
        Row: {
          id: number
          table_name: string
          data: Json
          created_at: string
        }
        Insert: {
          id?: number
          table_name: string
          data: Json
          created_at?: string
        }
        Update: {
          id?: number
          table_name?: string
          data?: Json
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          avatar_url: string | null
          level: number
          xp: number
          coins: number
          created_at: string
          updated_at: string
          university: string | null
        }
        Insert: {
          id: string
          username?: string | null
          avatar_url?: string | null
          level?: number
          xp?: number
          coins?: number
          created_at?: string
          updated_at?: string
          university?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          avatar_url?: string | null
          level?: number
          xp?: number
          coins?: number
          created_at?: string
          updated_at?: string
          university?: string | null
        }
      }
      questions: {
        Row: {
          id: number
          Frage: string | null
          "Antwort A": string | null
          "Antwort B": string | null
          "Antwort C": string | null
          "Antwort D": string | null
          "Richtige Antwort": string | null
          Begruendung: string | null
          type: string | null
          chapter_id: number
          course_id: number | null
          subquestions_count: number | null
        }
        Insert: {
          id?: number
          Frage?: string | null
          "Antwort A"?: string | null
          "Antwort B"?: string | null
          "Antwort C"?: string | null
          "Antwort D"?: string | null
          "Richtige Antwort"?: string | null
          Begruendung?: string | null
          type?: string | null
          chapter_id: number
          course_id?: number | null
          subquestions_count?: number | null
        }
        Update: {
          id?: number
          Frage?: string | null
          "Antwort A"?: string | null
          "Antwort B"?: string | null
          "Antwort C"?: string | null
          "Antwort D"?: string | null
          "Richtige Antwort"?: string | null
          Begruendung?: string | null
          type?: string | null
          chapter_id?: number
          course_id?: number | null
          subquestions_count?: number | null
        }
      }
      user_stats: {
        Row: {
          id: string
          user_id: string
          avatar_url: string | null
          username: string | null
          gold_medals: number | null
          silver_medals: number | null
          bronze_medals: number | null
          total_xp: number | null
          level: number | null
          current_league: string | null
          league_group: string | null
          total_coins: number | null
          questions_answered: number | null
          correct_answers: number | null
          streak: number | null
          title: string | null
          last_played: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          avatar_url?: string | null
          username?: string | null
          gold_medals?: number | null
          silver_medals?: number | null
          bronze_medals?: number | null
          total_xp?: number | null
          level?: number | null
          current_league?: string | null
          league_group?: string | null
          total_coins?: number | null
          questions_answered?: number | null
          correct_answers?: number | null
          streak?: number | null
          title?: string | null
          last_played?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          avatar_url?: string | null
          username?: string | null
          gold_medals?: number | null
          silver_medals?: number | null
          bronze_medals?: number | null
          total_xp?: number | null
          level?: number | null
          current_league?: string | null
          league_group?: string | null
          total_coins?: number | null
          questions_answered?: number | null
          correct_answers?: number | null
          streak?: number | null
          title?: string | null
          last_played?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      answered_questions: {
        Row: {
          id: number
          user_id: string
          question_id: number
          is_correct: boolean
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          question_id: number
          is_correct: boolean
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          question_id?: number
          is_correct?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_league_leaderboard: {
        Args: Record<PropertyKey, never>
        Returns: Array<{
          username: string
          xp: number
        }>
      }
      get_player_leaderboard: {
        Args: Record<PropertyKey, never>
        Returns: Array<{
          username: string
          total_xp: number
          user_id: string
        }>
      }
      get_subject_breakdown_for_user: {
        Args: { p_user_id: string }
        Returns: Array<{
          subject_name: string
          correct_count: number
          wrong_count: number
          total: number
          correct_percent: number
        }>
      }
      get_university_contributors: {
        Args: Record<PropertyKey, never>
        Returns: Array<{
          university: string
          contributor_count: number
        }>
      }
      get_university_leaderboard: {
        Args: Record<PropertyKey, never>
        Returns: Array<{
          university: string
          total_xp: number
        }>
      }
      reset_leagues: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
      reset_uni_leaderboard: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
      update_league_groups: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
      calculate_and_award_xp: {
        Args: {
          p_user_id: string
          p_correct_answers: number
          p_question_ids: string[]
        }
        Returns: number
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

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

export type DatabaseQuestion = Tables<'questions'>
export type Version = Tables<'versions'>

export interface FormattedQuestion {
  id: number;
  question_text: string | null;
  answers: {
    A: string | null;
    B: string | null;
    C: string | null;
    D: string | null;
  };
  correct_answer: string | null;
  explanation: string | null;
  type: string | null;
  chapter_id: number;
  course_id: number | null;
  subquestions_count: number | null;
}

export const adaptDatabaseQuestion = (dbQuestion: DatabaseQuestion): FormattedQuestion => {
  return {
    id: dbQuestion.id,
    question_text: dbQuestion.Frage,
    answers: {
      A: dbQuestion["Antwort A"],
      B: dbQuestion["Antwort B"],
      C: dbQuestion["Antwort C"],
      D: dbQuestion["Antwort D"]
    },
    correct_answer: dbQuestion["Richtige Antwort"],
    explanation: dbQuestion.Begruendung,
    type: dbQuestion.type,
    chapter_id: dbQuestion.chapter_id,
    course_id: dbQuestion.course_id,
    subquestions_count: dbQuestion.subquestions_count
  };
};

export type Profile = Tables<'profiles'>
export type UserStats = Tables<'user_stats'>
export type AnsweredQuestion = Tables<'answered_questions'> 
import { Database } from '@/lib/supabase';

export type Question = Database['public']['Tables']['questions']['Row'];
export type SubQuestion = Database['public']['Tables']['cases_subquestions']['Row'];
export type Answer = Database['public']['Tables']['answered_questions']['Row'];
export type QuizAnswer = Omit<Answer, 'id'>;
export type QuizAnswerInsert = {
  question_id: number;
  user_id: string;
  is_correct: boolean;
  answered_at: string;
  chapter_id: number;
};
export type SubAnswer = Database['public']['Tables']['answered_cases_subquestions']['Row'];
export type QuizProgress = Database['public']['Tables']['user_stats']['Row'];
export type QuizReward = Database['public']['Tables']['shop_avatars']['Row'];
export type QuizRewardHistory = Database['public']['Tables']['user_avatars']['Row'];
export type QuizRewardSettings = Database['public']['Tables']['levels']['Row'];
export type QuizRewardType = Database['public']['Tables']['leagues']['Row'];
export type QuizRewardCategory = Database['public']['Tables']['subjects']['Row'];
export type QuizRewardLevel = Database['public']['Tables']['levels']['Row'];
export type QuizRewardStatus = Database['public']['Tables']['user_stats']['Row'];
export type QuizRewardAction = Database['public']['Tables']['user_stats']['Row'];
export type QuizRewardTrigger = Database['public']['Tables']['user_stats']['Row'];
export type QuizRewardCondition = Database['public']['Tables']['user_stats']['Row'];
export type QuizRewardRule = Database['public']['Tables']['user_stats']['Row'];
export type QuizRewardRuleType = Database['public']['Tables']['user_stats']['Row'];
export type QuizRewardRuleAction = Database['public']['Tables']['user_stats']['Row'];
export type QuizRewardRuleCondition = Database['public']['Tables']['user_stats']['Row'];
export type QuizRewardRuleTrigger = Database['public']['Tables']['user_stats']['Row'];
export type QuizRewardRuleStatus = Database['public']['Tables']['user_stats']['Row'];
export type QuizRewardRuleCategory = Database['public']['Tables']['user_stats']['Row'];
export type QuizRewardRuleLevel = Database['public']['Tables']['user_stats']['Row'];

export type AnsweredQuestion = Question & {
  answer?: Answer;
  subQuestions?: AnsweredSubQuestion[];
};

export type AnsweredSubQuestion = SubQuestion & {
  answer?: SubAnswer;
}; 
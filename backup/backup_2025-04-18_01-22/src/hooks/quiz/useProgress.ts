import { useQuery } from '@tanstack/react-query';
import { progressService } from '../../api/progressService';
import { queryKeys } from './queryKeys';

interface Progress {
  question_id: number;
  is_answered: boolean;
  is_correct: boolean;
}

export const useProgress = (userId: string, chapterId: number) => {
  return useQuery<Progress[]>({
    queryKey: queryKeys.progress(userId, chapterId),
    queryFn: () => progressService.getUserProgress(userId, chapterId),
    enabled: !!userId && !!chapterId,
    staleTime: 1000 * 60 * 5, // 5 Minuten
  });
}; 
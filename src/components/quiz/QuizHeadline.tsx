interface QuizHeadlineProps {
  user: any;
  profile: {
    avatar_url: string | null;
    created_at: string;
    id: string;
    university: string | null;
    username: string | null;
  };
  onOpenProfile: () => void;
  onOpenShop: () => void;
  onOpenSettings: () => void;
  onOpenLeaderboard: () => void;
  roundXp: number;
  roundCoins: number;
} 
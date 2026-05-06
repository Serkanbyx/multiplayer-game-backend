/** Herkese açık kullanıcı profili */
export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  stats: UserStats;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
}

/** Kullanıcının kendi profil bilgileri (email dahil) */
export interface OwnUser extends PublicUser {
  email: string;
  role: "user" | "admin";
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  profileVisibility: "public" | "private";
}

export interface UserStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

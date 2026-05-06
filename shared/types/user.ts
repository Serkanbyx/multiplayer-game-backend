export interface GameStats {
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
}

export interface NotificationPreferences {
  matchInvite: boolean;
  rematch: boolean;
}

export interface PrivacyPreferences {
  showStats: boolean;
  showOnLeaderboard: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  animations: boolean;
  sounds: boolean;
  language: string;
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
}

/** Mongoose-bağımsız kullanıcı arayüzü — client tarafında yeniden kullanılır */
export interface IUserBase {
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  role: 'player' | 'admin';
  isGuest: boolean;
  bio: string;
  stats: GameStats;
  statsByGame: Record<string, GameStats>;
  preferences: UserPreferences;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Herkese açık kullanıcı profili */
export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  stats: GameStats;
  bio: string;
  createdAt: string;
}

/** Kullanıcının kendi profil bilgileri (email dahil) */
export interface OwnUser extends PublicUser {
  email: string;
  role: 'player' | 'admin';
  isGuest: boolean;
  preferences: UserPreferences;
  statsByGame: Record<string, GameStats>;
  lastLoginAt?: string;
  updatedAt: string;
}

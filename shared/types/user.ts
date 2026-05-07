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
  soundVolume: number;
  language: string;
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
}

/** Backend-agnostic user shape — consumed by client and `shared/types`. */
export interface IUserBase {
  id: string;
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

/** Public profile — when `privacy.showStats` is `false`, stats fields are omitted by the API. */
export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  role: 'player' | 'admin';
  createdAt: string;
  stats?: GameStats;
  statsByGame?: Record<string, GameStats>;
}

/** Authenticated user's own profile (includes email + preferences). */
export interface OwnUser extends PublicUser {
  email: string;
  isGuest: boolean;
  preferences: UserPreferences;
  statsByGame: Record<string, GameStats>;
  lastLoginAt?: string;
  updatedAt: string;
}

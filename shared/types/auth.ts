export type RegisteredJwtPayload = {
  id: string;
  role: 'player' | 'admin';
  isGuest: false;
};

export type GuestJwtPayload = {
  id: string;
  role: 'player';
  isGuest: true;
  displayName: string;
};

export type JwtPayload = RegisteredJwtPayload | GuestJwtPayload;

export type AuthUser = {
  _id: string;
  displayName: string;
  role: 'player' | 'admin';
  isGuest: boolean;
  avatarUrl?: string;
};

/** JWT payload: guest kullanıcılar sadece displayName taşır, kayıtlı kullanıcılar userId içerir */
export type JwtPayload =
  | { type: "guest"; guestId: string; displayName: string }
  | { type: "registered"; userId: string; role: "user" | "admin" };

/** Socket/request üzerinde taşınan kullanıcı bilgisi */
export interface AuthUser {
  id: string;
  displayName: string;
  role: "guest" | "user" | "admin";
  isGuest: boolean;
}

import { v4 as uuidv4 } from "uuid";

/**
 * UUID'den türetilen 8 karakterlik hex room kodu.
 * Örnek çıktı: "a3f1b2c4"
 */
export const generateRoomCode = (): string => {
  return uuidv4().replace(/-/g, "").slice(0, 8);
};

import type {PublicUser} from "@/shared";

const TOKEN_KEY = "hush.jwt";
const USER_KEY = "hush.user";
export const SESSION_EVENT = "hush:session";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): PublicUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: PublicUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifySession();
}

/** Persist profile without a JWT (preview after wallet lookup). */
export function setStoredUser(user: PublicUser | null) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
  notifySession();
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notifySession();
}

/** Drop JWT but keep cached profile (needs re-sign). */
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  notifySession();
}

export function notifySession() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function walletsMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

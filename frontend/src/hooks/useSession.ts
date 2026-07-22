"use client";

import {useEffect, useState} from "react";
import {SESSION_EVENT, getStoredUser, getToken} from "@/lib/session";
import type {PublicUser} from "@/shared";

/** Reactive session: signed-in JWT + profile from localStorage / AuthSync. */
export function useSession() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setUser(getStoredUser());
      setToken(getToken());
      setReady(true);
    };
    refresh();
    window.addEventListener(SESSION_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(SESSION_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return {
    user,
    token,
    ready,
    /** Has JWT for protected APIs. */
    isSignedIn: !!token && !!user,
    /** Profile known from DB even before signing for JWT. */
    hasProfile: !!user,
  };
}

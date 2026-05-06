/**
 * Хук для legacy-аутентификации учителя через HMAC-токен.
 * См. docs/AUTH_AND_ROLES.md → "Механизм 2".
 *
 * Токен живёт в sessionStorage (не localStorage — чтобы не перетекал между
 * вкладками и сбрасывался при закрытии браузера).
 */
import { useCallback, useEffect, useState } from "react";

const TOKEN_KEY = "teacherToken";
const EXP_KEY = "teacherTokenExp";

export function useTeacherAuth() {
  const [token, setToken] = useState<string | null>(() => {
    try {
      const t = sessionStorage.getItem(TOKEN_KEY);
      const exp = Number(sessionStorage.getItem(EXP_KEY) || "0");
      if (!t || !exp) return null;
      if (Date.now() / 1000 > exp) {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(EXP_KEY);
        return null;
      }
      return t;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const onAuthChange = () => {
      const t = sessionStorage.getItem(TOKEN_KEY);
      const exp = Number(sessionStorage.getItem(EXP_KEY) || "0");
      if (!t || !exp || Date.now() / 1000 > exp) {
        setToken(null);
      } else {
        setToken(t);
      }
    };
    window.addEventListener("teacher-auth-change", onAuthChange);
    window.addEventListener("storage", onAuthChange);
    return () => {
      window.removeEventListener("teacher-auth-change", onAuthChange);
      window.removeEventListener("storage", onAuthChange);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    const exp = Number(sessionStorage.getItem(EXP_KEY) || "0");
    if (!exp) return;
    const ms = exp * 1000 - Date.now();
    if (ms <= 0) {
      setToken(null);
      return;
    }
    const id = setTimeout(() => setToken(null), ms);
    return () => clearTimeout(id);
  }, [token]);

  const login = useCallback((newToken: string, expiresAt: number) => {
    sessionStorage.setItem(TOKEN_KEY, newToken);
    sessionStorage.setItem(EXP_KEY, String(expiresAt));
    setToken(newToken);
    window.dispatchEvent(new Event("teacher-auth-change"));
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EXP_KEY);
    setToken(null);
    window.dispatchEvent(new Event("teacher-auth-change"));
  }, []);

  return { token, login, logout };
}

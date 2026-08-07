import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { login as apiLogin, logout as apiLogout } from "./api";
import { getToken } from "./session";

type AuthState = {
  isLoggedIn: boolean;
  loading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getToken().then((token) => {
      setIsLoggedIn(!!token);
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (password: string) => {
    await apiLogin(password);
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setIsLoggedIn(false);
  }, []);

  return <AuthContext.Provider value={{ isLoggedIn, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé sous AuthProvider.");
  return ctx;
}

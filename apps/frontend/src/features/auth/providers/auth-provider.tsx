"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
} from "react";
import { AuthApi } from "../services/auth.api";
import type { User, AuthState } from "../types/auth.types";

interface AuthContextType extends AuthState {
  login: () => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    isAuthenticated: false,
    error: null,
  });

  const checkAuth = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const user = await AuthApi.getCurrentUser();
      setState({
        user,
        loading: false,
        isAuthenticated: true,
        error: null,
      });
    } catch (err: any) {
      setState({
        user: null,
        loading: false,
        isAuthenticated: false,
        error: err?.message || "Authentication failed",
      });
    }
  }, []);

  const login = useCallback(() => {
    const loginUrl = AuthApi.getGithubLoginUrl();
    window.location.href = loginUrl;
  }, []);

  const logout = useCallback(async () => {
    try {
      await AuthApi.logout();
      setState({
        user: null,
        loading: false,
        isAuthenticated: false,
        error: null,
      });
    } catch (err: any) {
      console.error("Logout failed:", err);
    }
  }, []);

  const refresh = useCallback(async () => {
    await checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

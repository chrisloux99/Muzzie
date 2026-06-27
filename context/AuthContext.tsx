import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setupUser: (username: string) => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'muzzie_token';
const USER_KEY = 'muzzie_user';

function generateId(): string {
  return 'u_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function AuthProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  // Auto-login from localStorage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(USER_KEY);
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      }
    } catch {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setupUser = useCallback(async (username: string): Promise<void> => {
    const localUser: User = {
      id: generateId(),
      username,
    };
    const localToken = 'local_' + generateId();
    setUser(localUser);
    setToken(localToken);
    localStorage.setItem(USER_KEY, JSON.stringify(localUser));
    localStorage.setItem(TOKEN_KEY, localToken);
  }, []);

  const updateUsername = useCallback(async (username: string): Promise<void> => {
    if (!user) return;
    const updated = { ...user, username };
    setUser(updated);
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
  }, [user]);

  const logout = useCallback((): void => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    // no-op for local auth
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    setupUser,
    updateUsername,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

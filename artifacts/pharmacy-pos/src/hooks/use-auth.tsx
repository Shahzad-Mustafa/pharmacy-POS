import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { setAuthTokenGetter, UserProfile } from "@workspace/api-client-react";

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedToken = localStorage.getItem("access_token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
      }
    }
  }, []);

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("access_token"));
  }, []);

  const login = (newToken: string, newUser: UserProfile) => {
    localStorage.setItem("access_token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setLocation("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setAuthTokenGetter(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

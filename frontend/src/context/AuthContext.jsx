import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

const emptyAuth = { user: null, token: null };

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem("auth");
    if (!saved) return emptyAuth;
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        return { user: parsed.user ?? null, token: parsed.token ?? null };
      }
    } catch {
      // If stored data is corrupted, clear it so the app can recover gracefully.
      localStorage.removeItem("auth");
    }
    return emptyAuth;
  });

  const login = ({ user, token }) => {
    const next = { user, token };
    setAuth(next);
    localStorage.setItem("auth", JSON.stringify(next));
  };

  const logout = () => {
    setAuth(emptyAuth);
    localStorage.removeItem("auth");
  };

  return (
    <AuthContext.Provider value={{ user: auth.user, token: auth.token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

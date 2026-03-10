import { createContext, useContext, useState, useEffect } from "react";
import API from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("fabchat_user");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
    }
    setLoading(false);
  }, []);

  const login = async (employeeId, password) => {
    const { data } = await API.post("/auth/login", { employeeId, password });
    localStorage.setItem("fabchat_user", JSON.stringify(data));
    setUser(data);
    return data;
  };

  const logout = async () => {
    try {
      await API.post("/auth/logout");
    } catch (e) {
      // ignore errors on logout
    }
    localStorage.removeItem("fabchat_user");
    setUser(null);
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    localStorage.setItem("fabchat_user", JSON.stringify(updated));
    setUser(updated);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" style={{ width: 40, height: 40 }}></div>
        <p style={{ color: "var(--text-secondary)" }}>Loading FabChat...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

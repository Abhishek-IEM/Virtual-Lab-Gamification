import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const oauthToken = urlParams.get("token");

      // If OAuth callback provides token, trust backend and hydrate profile.
      if (oauthToken) {
        try {
          const res = await axios.get("/auth/profile", {
            headers: { Authorization: `Bearer ${oauthToken}` },
          });

          localStorage.setItem("token", oauthToken);
          localStorage.setItem("user", JSON.stringify(res.data.user));
          setUser(res.data.user);

          urlParams.delete("token");
          const cleanSearch = urlParams.toString();
          const cleanUrl = `${window.location.pathname}${cleanSearch ? `?${cleanSearch}` : ""}`;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch (_err) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        } finally {
          setLoading(false);
        }
        return;
      }

      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");
      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    };

    bootstrapAuth();
  }, []);

  const login = (userData, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    localStorage.setItem("user", JSON.stringify(newUser));
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

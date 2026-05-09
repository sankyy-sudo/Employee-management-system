import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import api from "../lib/api";
import { clearCredentials, setCredentials } from "../store/authSlice";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  const persistAuth = useCallback((nextUser, nextToken, nextRefreshToken) => {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem("user", JSON.stringify(nextUser));
    localStorage.setItem("token", nextToken);
    if (nextRefreshToken) {
      localStorage.setItem("refreshToken", nextRefreshToken);
    }
    dispatch(setCredentials({ user: nextUser, token: nextToken, refreshToken: nextRefreshToken }));
  }, [dispatch]);

  const clearAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    dispatch(clearCredentials());
  }, [dispatch]);

  const updateUser = useCallback((nextUser) => {
    setUser(nextUser);
    localStorage.setItem("user", JSON.stringify(nextUser));
    dispatch(setCredentials({ user: nextUser, token: localStorage.getItem("token"), refreshToken: localStorage.getItem("refreshToken") }));
  }, [dispatch]);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        persistAuth(data, token);
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [clearAuth, persistAuth, token]);

  const login = useCallback(async (payload) => {
    const { data } = await api.post("/auth/login", payload);
    persistAuth(data.user, data.token, data.refreshToken);
    return data.user;
  }, [persistAuth]);

  const register = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    persistAuth(data.user, data.token, data.refreshToken);
    return data.user;
  }, [persistAuth]);

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    login,
    register,
    logout,
    setUser: updateUser
  }), [loading, login, logout, register, token, updateUser, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

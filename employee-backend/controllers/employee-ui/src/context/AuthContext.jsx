import { createContext, useContext, useEffect, useState } from "react";
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
  }, [token]);

  const persistAuth = (nextUser, nextToken, nextRefreshToken) => {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem("user", JSON.stringify(nextUser));
    localStorage.setItem("token", nextToken);
    if (nextRefreshToken) {
      localStorage.setItem("refreshToken", nextRefreshToken);
    }
    dispatch(setCredentials({ user: nextUser, token: nextToken, refreshToken: nextRefreshToken }));
  };

  const clearAuth = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    dispatch(clearCredentials());
  };

  const updateUser = (nextUser) => {
    setUser(nextUser);
    localStorage.setItem("user", JSON.stringify(nextUser));
  };

  const login = async (payload) => {
    const { data } = await api.post("/auth/login", payload);
    persistAuth(data.user, data.token, data.refreshToken);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    persistAuth(data.user, data.token, data.refreshToken);
    return data.user;
  };

  const logout = () => {
    clearAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        setUser: updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
  id: number;
  username: string;
  role: "admin" | "user";
}

interface Shop {
  id: number;
  name: string;
  description: string | null;
  icon: string;
  iconColor: string;
  status: string;
  ownerId: number;
  username?: string;
}

interface AuthContextType {
  user: User | null;
  shop: Shop | null;
  role: "admin" | "user" | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const API_URL = import.meta.env.VITE_API_URL;

  const [user, setUser] = useState<User | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"admin" | "user" | null>(null);

  // ดึงข้อมูล shop ตาม session ปัจจุบัน
  const fetchShop = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/shops/me`, {
        credentials: "include",
      });
      if (res.ok) {
        const data: Shop = await res.json();
        setShop(data);
      } else {
        setShop(null);
      }
    } catch (err) {
      setShop(null);
      console.error("Error checking auth status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // mount: fetch shop ตาม session ปัจจุบัน
  useEffect(() => {
    const init = async () => {
      const role = await fetchAuth();
      if (role !== "admin") {
        await fetchShop();
      } else {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = async (
    username: string,
    password: string,
  ): Promise<string | null> => {
    setError(null);
    setIsLoading(true);
    setShop(null); // reset ก่อน กัน state ค้าง
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
        return null;
      }
      setUser(payload.user);
      setRole(payload.user.role);
      if (payload.user.role !== "admin") {
        await fetchShop();
      }
      return payload.user.id;
    } catch (err) {
      console.error("Login error:", err);
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuth = async (): Promise<"admin" | "user" | null> => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setRole(data.role);
        return data.role;
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      setUser(null);
      setShop(null);
      setRole(null);
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  const value: AuthContextType = {
    user,
    shop,
    isAuthenticated: !!user,
    isLoading,
    role,
    login,
    logout,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

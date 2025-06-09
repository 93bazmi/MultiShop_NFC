import React, { createContext, useContext, useEffect, useState } from "react";

interface Shop {
  id: number;
  name: string;
  description: string | null;
  icon: string;
  iconColor: string;
  status: string;
  ownerId: number;
}

interface AuthContextType {
  shop: Shop | null;
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
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ดึงข้อมูล shop ตาม session ปัจจุบัน
  const fetchShop = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/shops/me", { credentials: "include" });
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
    fetchShop();
  }, []);

  const login = async (
    username: string,
    password: string,
  ): Promise<string | null> => {
    setError(null);
    setIsLoading(true);
    setShop(null); // reset ก่อน กัน state ค้าง
    try {
      const res = await fetch("/api/auth/login", {
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
      // *** สำคัญ ***: ใช้ user object ที่ login response กลับมาทันที
      setShop(payload.user);
      return payload.user.id;
    } catch (err) {
      console.error("Login error:", err);
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setShop(null); // clear state ทันที
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  const value: AuthContextType = {
    shop,
    isAuthenticated: !!shop,
    isLoading,
    login,
    logout,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

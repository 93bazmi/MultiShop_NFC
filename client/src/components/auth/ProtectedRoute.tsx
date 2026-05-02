import React from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/components/auth/AuthProvider";

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: "admin" | "user"; // ✅ เพิ่ม
}

export default function ProtectedRoute({
  children,
  role,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role: userRole } = useAuth();

  if (isLoading) {
    return <div>Loading…</div>;
  }

  // ❌ ยังไม่ login
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // ❌ role ไม่ตรง
  if (role && userRole !== role) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

// src/components/auth/ProtectedRoute.tsx
import React from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/components/auth/AuthProvider";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading…</div>;
  }

  return isAuthenticated ? <>{children}</> : <Redirect to="/login" />;
}

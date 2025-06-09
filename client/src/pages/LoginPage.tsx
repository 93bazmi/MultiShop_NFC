import LoginButton from "@/components/auth/LoginButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/components/auth/AuthProvider";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-gray-50 pt-8">
      <Card className="w-full max-w-md " >
        <CardHeader className="text-center mt-2 pb-2 ">
          <CardTitle className="text-2xl font-semibold">
            NFC Payment System
          </CardTitle>
        </CardHeader>
        <CardContent className="mb-4">
          <LoginButton />
        </CardContent>
      </Card>
    </div>
  );
}

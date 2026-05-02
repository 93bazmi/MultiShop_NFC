import LoginButton from "@/components/auth/LoginButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/AuthProvider";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function LoginPage() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && role) {
      if (role === "admin") {
        setLocation("/topup");
      } else {
        setLocation("/shop/me");
      }
    }
  }, [isAuthenticated, role, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 px-4">
      <Card className="w-full max-w-md shadow-xl border-0 rounded-2xl">
        {/* Header */}
        <CardHeader className="text-center space-y-2 pt-8">
          <div className="text-3xl font-bold text-gray-800">NFC Payment</div>
          <p className="text-sm text-gray-500">
            ระบบชำระเงินด้วย NFC สำหรับร้านค้า
          </p>
        </CardHeader>

        {/* Content */}
        <CardContent className="pb-8 pt-4 space-y-6">
          {/* Login Button */}
          <LoginButton />

          {/* Divider */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="flex-1 h-px bg-gray-200" />
            <span>Secure Login</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Footer text */}
          <p className="text-center text-xs text-gray-400">
            © {new Date().getFullYear()} NFC Payment System
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

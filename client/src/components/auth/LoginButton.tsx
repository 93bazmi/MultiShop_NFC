// src/components/auth/LoginButton.tsx
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function LoginButton() {
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [, setLocation] = useLocation();
  const { login, isLoading: authLoading, error: authError } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const shopId = await login(loginForm.username, loginForm.password);
    if (shopId) {
      setLocation(`/shop/me`);
    }
  };

  return (
    <Tabs defaultValue="login" className="w-full">
      {authError && (
        <Alert className="mt-4 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {authError}
          </AlertDescription>
        </Alert>
      )}

      <TabsContent value="login" className="space-y-4">
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-username">Username</Label>
            <Input
              id="login-username"
              type="text"
              placeholder="Enter your username"
              value={loginForm.username}
              onChange={(e) =>
                setLoginForm({ ...loginForm, username: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2 pb-2">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm({ ...loginForm, password: e.target.value })
              }
              required
            />
          </div>
          <Button type="submit" className="w-full " disabled={authLoading}>
            {authLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}

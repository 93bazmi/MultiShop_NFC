// src/App.tsx
import React, { useEffect } from "react";
import { Router, Route, Switch, useLocation } from "wouter";
import ShopsPage from "@/pages/ShopsPage";
import ShopDetailPage from "@/pages/ShopDetailPage";
import ProductsPage from "@/pages/ProductsPage";
import POSPage from "@/pages/POSPage";
import NFCTestPage from "@/pages/NFCTestPage";
import NFCRegisterPage from "@/pages/NFCRegisterPage";
import TopupPage from "@/pages/TopupPage";
import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/not-found";
import PaymentHistoryPage from "@/pages/PaymentHistoryPage";

import MainLayout from "@/components/layouts/MainLayout";
import UserLayout from "@/components/layouts/UserLayout";
import AdminLayout from "@/components/layouts/AdminLayout";

import { AuthProvider } from "@/components/auth/AuthProvider";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";

function HomeRedirect() {
  const [, setLocation] = useLocation();
  const { role, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && role) {
      if (role === "admin") {
        setLocation("/topup");
      } else {
        setLocation("/shop/me");
      }
    }
  }, [isLoading, role, setLocation]);

  return null;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Switch>
          {/* Public layout */}
          <Route path="/topup">
            <ProtectedRoute role="admin">
              <AdminLayout>
                <TopupPage />
              </AdminLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/nfc-test">
            <AdminLayout>
              <NFCTestPage />
            </AdminLayout>
          </Route>
          <Route path="/nfc-register">
            <AdminLayout>
              <NFCRegisterPage />
            </AdminLayout>
          </Route>

          {/* Main layout + protected */}
          <Route path="/login">
            <LoginPage />
          </Route>
          <ProtectedRoute>
            <Route path="/">
              <MainLayout>
                <HomeRedirect />
              </MainLayout>
            </Route>
            <Route path="/shop/me">
              <ProtectedRoute role="user">
                <UserLayout>
                  <ShopDetailPage />
                </UserLayout>
              </ProtectedRoute>
            </Route>
            <Route path="/products">
              <UserLayout>
                <ProductsPage />
              </UserLayout>
            </Route>
            <Route path="/pos">
              <UserLayout>
                <POSPage />
              </UserLayout>
            </Route>

            <Route path="/history">
              <UserLayout>
                <PaymentHistoryPage />
              </UserLayout>
            </Route>
          </ProtectedRoute>

          {/* Fallback */}
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </AuthProvider>
    </Router>
  );
}

export default App;

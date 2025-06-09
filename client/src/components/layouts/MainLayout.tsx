import * as React from "react";
import { useLocation, Link } from "wouter";
import { Store, PlusCircle, Wifi, LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [location] = useLocation();
  const { shop, isAuthenticated, logout } = useAuth();

  const navigation = [
    // { name: "เติมเงิน", href: "/topup", icon: PlusCircle },
    // { name: "ทดสอบ NFC", href: "/nfc-test", icon: Wifi },
    // { name: "history", href: "/history", icon: Wifi },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="mx-auto max-w-5xl py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          {/* Navigation */}
          <nav className="flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900",
                  location === item.href
                    ? "border-b-2 border-primary"
                    : "hover:border-b-2 hover:border-gray-300",
                )}
              >
                <item.icon className="mr-2 h-5 w-5" aria-hidden="true" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="flex-1" /> {/* <-- ตัวนี้ช่วยดันขวา */}
          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && shop ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {shop.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56" forceMount>
                  <div className="p-2">
                    <p className="font-medium">{shop.name}</p>
                    <p className="text-sm text-muted-foreground">
                      @{shop.username}
                    </p>
                  </div>
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button size="sm">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-5xl py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            Payment System &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;

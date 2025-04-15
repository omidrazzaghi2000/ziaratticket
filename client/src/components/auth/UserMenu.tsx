import { useState } from "react";
import { useAuth } from "./AuthProvider";
import AuthModal from "./AuthModal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, UserCircle, List, Package, UserIcon } from "lucide-react";
import { useLocation } from "wouter";

export default function UserMenu() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [, navigate] = useLocation();

  // اگر در حال بارگذاری است، اسکلتون نمایش می‌دهیم
  if (isLoading) {
    return (
      <div className="h-10 w-24 bg-gray-200 animate-pulse rounded-full"></div>
    );
  }

  // اگر کاربر وارد شده است، منوی کاربر را نمایش می‌دهیم
  if (isAuthenticated && user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-white">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : <UserIcon className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[100px] truncate">
              {user.fullName || "کاربر"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="p-2">
            <p className="font-medium">{user.fullName || "کاربر"}</p>
            <p className="text-xs text-gray-500 truncate">{user.phone}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => navigate("/profile")}
          >
            <UserCircle className="mr-2 h-4 w-4" />
            <span>پروفایل</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => navigate("/bookings")}
          >
            <List className="mr-2 h-4 w-4" />
            <span>رزروهای من</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-red-500 focus:text-red-500"
            onClick={() => logout()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>خروج</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // اگر کاربر وارد نشده است، دکمه ورود را نمایش می‌دهیم
  return (
    <>
      <Button onClick={() => setAuthModalOpen(true)}>
        ورود / ثبت‌نام
      </Button>
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />
    </>
  );
}
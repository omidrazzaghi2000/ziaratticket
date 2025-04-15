import { useState, useEffect } from "react";
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
import { LogOut, UserCircle, List, Package, UserIcon, LogIn } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

export default function UserMenu() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [, navigate] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuAnimation, setMenuAnimation] = useState("");

  // افکت برای انیمیشن باز شدن منو
  useEffect(() => {
    if (isMenuOpen) {
      setMenuAnimation("animate-slide-down");
    }
  }, [isMenuOpen]);

  // اگر در حال بارگذاری است، اسکلتون نمایش می‌دهیم
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
        <div className="h-4 w-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // اگر کاربر وارد شده است، منوی کاربر را نمایش می‌دهیم
  if (isAuthenticated && user) {
    return (
      <DropdownMenu onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 px-3 py-2 rounded-full border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 bg-white"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-primary-600 to-primary text-white">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : <UserIcon className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[100px] truncate font-medium">
              {user.fullName || "کاربر"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={cn("w-60 shadow-lg border-0 overflow-hidden", menuAnimation)}>
          <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                <AvatarFallback className="bg-gradient-to-br from-primary-600 to-primary text-white text-lg">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : <UserIcon className="h-6 w-6" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold font-heading text-gray-800">{user.fullName || "کاربر"}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">{user.phone}</p>
              </div>
            </div>
          </div>
          
          <div className="p-2">
            <DropdownMenuItem 
              className="cursor-pointer px-3 py-2.5 rounded-md hover:bg-primary/5 hover:text-primary focus:bg-primary/5 focus:text-primary transition-all"
              onClick={() => navigate("/profile")}
            >
              <UserCircle className="mr-2 h-5 w-5" />
              <span>پروفایل کاربری</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              className="cursor-pointer px-3 py-2.5 rounded-md hover:bg-primary/5 hover:text-primary focus:bg-primary/5 focus:text-primary transition-all"
              onClick={() => navigate("/bookings")}
            >
              <List className="mr-2 h-5 w-5" />
              <span>رزروهای من</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="my-2" />
            
            <DropdownMenuItem
              className="cursor-pointer px-3 py-2.5 rounded-md hover:bg-red-50 text-red-500 hover:text-red-600 focus:bg-red-50 focus:text-red-600 transition-all"
              onClick={() => logout()}
            >
              <LogOut className="mr-2 h-5 w-5" />
              <span>خروج از حساب کاربری</span>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // اگر کاربر وارد نشده است، دکمه ورود را نمایش می‌دهیم
  return (
    <>
      <Button 
        onClick={() => setAuthModalOpen(true)}
        variant="outline"
        size="sm"
        className="flex items-center gap-1.5 border border-primary/30 hover:border-primary text-primary hover:bg-primary/5 transition-all duration-200"
      >
        <LogIn className="h-4 w-4" />
        ورود / ثبت‌نام
      </Button>
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        title="ورود به سامانه رزرو کاروان"
        description="برای رزرو کاروان و استفاده از امکانات سامانه، لطفا وارد حساب کاربری خود شوید."
      />
    </>
  );
}
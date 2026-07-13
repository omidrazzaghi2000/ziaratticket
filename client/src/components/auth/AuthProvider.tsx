import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { djangoURL } from "@/App";

interface User {
  id: number;
  phone: string;
  fullName: string | null;
  role?: string;
  is_leader_approved?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // بررسی وضعیت احراز هویت کاربر
  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      // بررسی وضعیت احراز هویت
      
      const statusResponse = await fetch(djangoURL+"/api/auth/status", {method:"GET",headers:{
        Authorization: localStorage.getItem("AUTH_TOKEN_KEY")
      }});
      const statusData = await statusResponse.json();
      console.log(JSON.stringify(statusData));
      if (statusData.isAuthenticated) {
        // دریافت اطلاعات کاربر
        const userResponse = await fetch(djangoURL+"/api/user", {method:"GET",headers:{
          Authorization: localStorage.getItem("AUTH_TOKEN_KEY")
        }});
        const userData = await userResponse.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // خروج کاربر
  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      localStorage.removeItem("AUTH_TOKEN_KEY");
      localStorage.removeItem("AUTH_REFRESH_KEY");
      setUser(null);
    }
  };

  // به‌روزرسانی اطلاعات کاربر
  const refreshUser = async () => {
    await checkAuthStatus();
  };

  // بررسی وضعیت احراز هویت هنگام بارگذاری کامپوننت
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value = {
    user,
    isAuthenticated: user!=null,
    isLoading,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
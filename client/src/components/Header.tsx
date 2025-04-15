import { Link, useLocation } from "wouter";
import { UserMenu } from "@/components/auth";
import { MapPin } from "lucide-react";

export default function Header() {
  const [, navigate] = useLocation();
  
  const goToHome = () => {
    navigate("/");
  };
  
  return (
    <header className="bg-white shadow sticky top-0 z-40">
      <div className="container mx-auto py-4 px-4 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="flex items-center cursor-pointer" onClick={goToHome}>
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                <MapPin className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <div className="mr-3">
                <h1 className="text-xl font-bold text-primary">سامانه رزرو کاروان کربلا</h1>
                <p className="text-sm text-gray-500">زیارت با آرامش و اطمینان</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center">
            <nav className="flex flex-wrap items-center justify-center gap-4 md:gap-6 ml-4">
              <span 
                className="text-gray-600 hover:text-primary font-medium cursor-pointer"
                onClick={goToHome}
              >
                صفحه اصلی
              </span>
              <a href="#caravans" className="text-gray-600 hover:text-primary font-medium">کاروان‌ها</a>
              <a href="#guide" className="text-gray-600 hover:text-primary font-medium">راهنمای زائرین</a>
              <a href="#faq" className="text-gray-600 hover:text-primary font-medium">سوالات متداول</a>
              <a href="#contact" className="text-gray-600 hover:text-primary font-medium">تماس با ما</a>
            </nav>
            
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}

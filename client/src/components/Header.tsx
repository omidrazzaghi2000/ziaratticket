import { Link, useLocation } from "wouter";
import { UserMenu } from "@/components/auth";
import { MapPin, Home, Search, HelpCircle, Phone, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function Header() {
  const [, navigate] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // ایجاد افکت اسکرول برای هدر
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrolled]);
  
  const goToHome = () => {
    navigate("/");
    setMobileMenuOpen(false);
  };
  
  const goToSection = (sectionId: string) => {
    if (window.location.pathname !== "/") {
      navigate("/");
      // منتظر بمان تا هدایت انجام شود، سپس به بخش مورد نظر اسکرول کن
      setTimeout(() => {
        const section = document.getElementById(sectionId);
        if (section) section.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      const section = document.getElementById(sectionId);
      if (section) section.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };
  
  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300", 
        {
          "bg-white/80 backdrop-blur-md shadow-md py-2": scrolled,
          "bg-transparent py-4": !scrolled && window.location.pathname === "/",
          "bg-white shadow py-3": !scrolled && window.location.pathname !== "/"
        }
      )}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex justify-between items-center">
          {/* لوگو */}
          <div className="flex items-center animate-fade-in">
            <div className="flex items-center cursor-pointer group" onClick={goToHome}>
              <div className={cn(
                "h-12 w-12 rounded-lg flex items-center justify-center transition-all duration-300", 
                scrolled ? "bg-primary text-white" : "bg-primary/10 text-primary"
              )}>
                <MapPin className="h-7 w-7 transition-transform group-hover:scale-110" strokeWidth={1.5} />
              </div>
              <div className="mr-3">
                <h1 className={cn(
                  "text-xl font-bold font-heading transition-colors duration-300", 
                  scrolled ? "text-primary-700" : "text-primary"
                )}>
                  سامانه رزرو کاروان کربلا
                </h1>
                <p className="text-sm text-gray-500">زیارت با آرامش و اطمینان</p>
              </div>
            </div>
          </div>
          
          {/* منوی دسکتاپ */}
          <div className="hidden md:flex items-center animate-fade-in">
            <nav className="flex items-center gap-1 ml-4">
              <button 
                onClick={goToHome}
                className="px-3 py-2 rounded-md text-gray-600 hover:text-primary hover:bg-primary/5 transition-all font-medium flex items-center"
              >
                <Home className="ml-1.5 h-4 w-4" />
                صفحه اصلی
              </button>
              
              <button 
                onClick={() => goToSection('caravans')}
                className="px-3 py-2 rounded-md text-gray-600 hover:text-primary hover:bg-primary/5 transition-all font-medium flex items-center"
              >
                <Search className="ml-1.5 h-4 w-4" />
                کاروان‌ها
              </button>
              
              <button 
                onClick={() => goToSection('guide')}
                className="px-3 py-2 rounded-md text-gray-600 hover:text-primary hover:bg-primary/5 transition-all font-medium flex items-center"
              >
                <MapPin className="ml-1.5 h-4 w-4" />
                راهنمای زائرین
              </button>
              
              <button 
                onClick={() => goToSection('faq')}
                className="px-3 py-2 rounded-md text-gray-600 hover:text-primary hover:bg-primary/5 transition-all font-medium flex items-center"
              >
                <HelpCircle className="ml-1.5 h-4 w-4" />
                سوالات متداول
              </button>
              
              <button 
                onClick={() => goToSection('contact')}
                className="px-3 py-2 rounded-md text-gray-600 hover:text-primary hover:bg-primary/5 transition-all font-medium flex items-center"
              >
                <Phone className="ml-1.5 h-4 w-4" />
                تماس با ما
              </button>
            </nav>
            
            <UserMenu />
          </div>
          
          {/* دکمه منوی موبایل */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="p-2 rounded-full hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-primary" />
              ) : (
                <Menu className="h-6 w-6 text-primary" />
              )}
            </button>
          </div>
        </div>
        
        {/* منوی موبایل */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 p-4 bg-white rounded-lg shadow-lg animate-slide-down">
            <nav className="flex flex-col space-y-3">
              <button 
                onClick={goToHome}
                className="px-4 py-2 rounded-md text-gray-600 hover:text-primary hover:bg-primary/5 transition-all font-medium flex items-center"
              >
                <Home className="ml-2 h-5 w-5" />
                صفحه اصلی
              </button>
              
              <button 
                onClick={() => goToSection('caravans')}
                className="px-4 py-2 rounded-md text-gray-600 hover:text-primary hover:bg-primary/5 transition-all font-medium flex items-center"
              >
                <Search className="ml-2 h-5 w-5" />
                کاروان‌ها
              </button>
              
              <button 
                onClick={() => goToSection('guide')}
                className="px-4 py-2 rounded-md text-gray-600 hover:text-primary hover:bg-primary/5 transition-all font-medium flex items-center"
              >
                <MapPin className="ml-2 h-5 w-5" />
                راهنمای زائرین
              </button>
              
              <button 
                onClick={() => goToSection('faq')}
                className="px-4 py-2 rounded-md text-gray-600 hover:text-primary hover:bg-primary/5 transition-all font-medium flex items-center"
              >
                <HelpCircle className="ml-2 h-5 w-5" />
                سوالات متداول
              </button>
              
              <button 
                onClick={() => goToSection('contact')}
                className="px-4 py-2 rounded-md text-gray-600 hover:text-primary hover:bg-primary/5 transition-all font-medium flex items-center"
              >
                <Phone className="ml-2 h-5 w-5" />
                تماس با ما
              </button>
              
              <div className="pt-2 border-t border-gray-100">
                <UserMenu />
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

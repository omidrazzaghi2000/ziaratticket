import { Link, useLocation } from "wouter";
import { UserMenu } from "@/components/auth";
import { MapPin, Home, Search, HelpCircle, Phone, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "صفحه اصلی", icon: Home, section: "home" },
  { label: "کاروان‌ها", icon: Search, section: "caravans" },
  { label: "راهنمای زائرین", icon: MapPin, section: "guide" },
  { label: "سوالات متداول", icon: HelpCircle, section: "faq" },
  { label: "تماس با ما", icon: Phone, section: "contact" },
];

export default function Header() {
  const [, navigate] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const goToHome = () => { navigate("/"); setMobileMenuOpen(false); };

  const goToSection = (sectionId: string) => {
    if (sectionId === "home") { goToHome(); return; }
    if (window.location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/90 backdrop-blur-md shadow-lg py-2"
          : "bg-transparent py-4"
      )}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center cursor-pointer group"
            onClick={goToHome}
          >
            <div
              className={cn(
                "h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm",
                scrolled ? "bg-primary text-white" : "bg-white/20 backdrop-blur-sm text-white"
              )}
            >
              <MapPin className="h-6 w-6 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
            </div>
            <div className="mr-3">
              <h1
                className={cn(
                  "text-base font-bold transition-colors duration-300",
                  scrolled ? "text-gray-800" : "text-white"
                )}
              >
                سامانه رزرو کاروان کربلا
              </h1>
              <p className={cn("text-xs", scrolled ? "text-gray-400" : "text-white/60")}>
                زیارت با آرامش و اطمینان
              </p>
            </div>
          </motion.div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <nav className="flex items-center gap-0.5 ml-4">
              {navItems.map((item) => (
                <button
                  key={item.section}
                  onClick={() => goToSection(item.section)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200",
                    scrolled
                      ? "text-gray-600 hover:text-primary hover:bg-primary/5"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              ))}
            </nav>
            <UserMenu />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <UserMenu />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={cn(
                "p-2 rounded-xl transition-colors",
                scrolled ? "hover:bg-gray-100" : "hover:bg-white/10"
              )}
            >
              {mobileMenuOpen ? (
                <X className={cn("h-5 w-5", scrolled ? "text-gray-700" : "text-white")} />
              ) : (
                <Menu className={cn("h-5 w-5", scrolled ? "text-gray-700" : "text-white")} />
              )}
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="md:hidden overflow-hidden"
            >
              <div className="mt-3 p-3 bg-white rounded-2xl shadow-xl border border-gray-100">
                <nav className="flex flex-col gap-1">
                  {navItems.map((item, i) => (
                    <motion.button
                      key={item.section}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => goToSection(item.section)}
                      className="px-4 py-2.5 rounded-xl text-gray-600 hover:text-primary hover:bg-primary/5 transition-all font-medium flex items-center gap-2 text-sm"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </motion.button>
                  ))}
                </nav>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}

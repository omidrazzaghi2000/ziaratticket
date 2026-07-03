import { useLocation } from "wouter";
import { UserMenu } from "@/components/auth";
import { useAuth } from "@/components/auth";
import { Home, Search, MapPin, HelpCircle, Phone, Menu, X, LayoutDashboard, Bus } from "lucide-react";
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

function BrandMark({ scrolled }: { scrolled: boolean }) {
  return (
    <div className="flex items-center gap-3 cursor-pointer group select-none">
      {/* Geometric mark */}
      <div
        className={cn(
          "relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-500",
          scrolled
            ? "bg-primary shadow-emerald-sm"
            : "bg-white/15 backdrop-blur-sm border border-white/20"
        )}
      >
        {/* 8-pointed star mark */}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 1L12.5 7.5L19 10L12.5 12.5L10 19L7.5 12.5L1 10L7.5 7.5L10 1Z"
            fill={scrolled ? "hsl(42 60% 52%)" : "hsl(42 60% 80%)"}
            stroke="none"
          />
          <path
            d="M10 4L11.5 8.5L16 10L11.5 11.5L10 16L8.5 11.5L4 10L8.5 8.5L10 4Z"
            fill={scrolled ? "hsl(162 72% 14%)" : "rgba(255,255,255,0.9)"}
            stroke="none"
          />
        </svg>
      </div>

      {/* Text brand */}
      <div className="leading-none">
        <div
          className={cn(
            "font-heading font-bold transition-colors duration-300 tracking-wide",
            scrolled ? "text-primary text-[17px]" : "text-white text-[17px]"
          )}
        >
          زیارت تیکت
        </div>
        <div
          className={cn(
            "text-[11px] transition-colors duration-300 font-sans tracking-widest mt-0.5",
            scrolled ? "text-gold-700" : "text-white/55"
          )}
        >
          رزرو کاروان زیارتی
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  const isLeader = user?.role === "caravan_leader";
  const isLeaderApproved = isLeader && user?.is_leader_approved;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const goToHome = () => {
    navigate("/");
    setMobileMenuOpen(false);
  };

  const goToSection = (sectionId: string) => {
    setActiveSection(sectionId);
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
      initial={{ y: -90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-400",
        scrolled
          ? "bg-cream-50/95 backdrop-blur-xl shadow-[0_2px_20px_rgba(0,0,0,0.08)] py-2"
          : "bg-transparent py-4"
      )}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Brand */}
          <motion.div whileHover={{ scale: 1.02 }} onClick={goToHome}>
            <BrandMark scrolled={scrolled} />
          </motion.div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-2">
            <nav className="flex items-center gap-0.5">
              {navItems.map((item) => {
                const isActive = activeSection === item.section;
                return (
                  <button
                    key={item.section}
                    onClick={() => goToSection(item.section)}
                    className={cn(
                      "relative px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
                      scrolled
                        ? isActive
                          ? "text-primary bg-primary/8"
                          : "text-foreground/70 hover:text-primary hover:bg-primary/5"
                        : isActive
                        ? "text-white bg-white/15"
                        : "text-white/75 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                    {isActive && (
                      <motion.div
                        layoutId="nav-active"
                        className={cn(
                          "absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full",
                          scrolled ? "bg-gold-500" : "bg-gold-300"
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Divider */}
            <div className={cn("h-5 w-px mx-1", scrolled ? "bg-border" : "bg-white/20")} />

            {isAuthenticated && isLeaderApproved && (
              <button
                onClick={() => navigate("/leader/dashboard")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
                  scrolled ? "bg-primary/8 text-primary hover:bg-primary/15" : "bg-white/15 text-white hover:bg-white/25"
                )}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                داشبورد کاروان
              </button>
            )}

            {isAuthenticated && isLeader && !isLeaderApproved && (
              <span className={cn("text-xs px-3 py-1.5 rounded-xl", scrolled ? "bg-amber-50 text-amber-700" : "bg-white/10 text-white/70")}>
                در انتظار تأیید
              </span>
            )}

            {!isLeader && (
              <button
                onClick={() => navigate("/leader/register")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors",
                  scrolled ? "border-primary/30 text-primary hover:bg-primary/5" : "border-white/25 text-white/75 hover:text-white hover:bg-white/10"
                )}
              >
                <Bus className="h-3.5 w-3.5" />
                ثبت‌نام مدیر کاروان
              </button>
            )}

            <UserMenu />
          </div>

          {/* Mobile */}
          <div className="md:hidden flex items-center gap-2">
            <UserMenu />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={cn(
                "p-2 rounded-xl transition-colors",
                scrolled ? "hover:bg-primary/5 text-foreground" : "hover:bg-white/10 text-white"
              )}
            >
              <AnimatePresence mode="wait">
                {mobileMenuOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <X className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Menu className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="md:hidden overflow-hidden"
            >
              <div className="mt-3 p-3 bg-cream-50/98 backdrop-blur-xl rounded-2xl shadow-xl border border-border">
                {/* Brand in mobile menu */}
                <div className="px-3 py-2 mb-2 border-b border-border">
                  <BrandMark scrolled />
                </div>
                <nav className="flex flex-col gap-1 mt-2">
                  {navItems.map((item, i) => (
                    <motion.button
                      key={item.section}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, ease: "easeOut" }}
                      onClick={() => goToSection(item.section)}
                      className={cn(
                        "px-4 py-3 rounded-xl transition-all font-medium flex items-center gap-3 text-sm",
                        activeSection === item.section
                          ? "bg-primary/8 text-primary"
                          : "text-foreground/70 hover:text-primary hover:bg-primary/5"
                      )}
                    >
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", activeSection === item.section ? "bg-primary/10" : "bg-muted")}>
                        <item.icon className="h-3.5 w-3.5" />
                      </div>
                      {item.label}
                    </motion.button>
                  ))}

                  {/* Divider */}
                  <div className="h-px bg-border my-1" />

                  {/* Leader dashboard / register in mobile menu */}
                  {isAuthenticated && isLeaderApproved && (
                    <motion.button
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: navItems.length * 0.05 }}
                      onClick={() => { navigate("/leader/dashboard"); setMobileMenuOpen(false); }}
                      className="px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 bg-primary/8 text-primary"
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <LayoutDashboard className="h-3.5 w-3.5" />
                      </div>
                      داشبورد کاروان
                    </motion.button>
                  )}

                  {isAuthenticated && isLeader && !isLeaderApproved && (
                    <div className="px-4 py-3 text-sm text-amber-700 bg-amber-50 rounded-xl flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Bus className="h-3.5 w-3.5" />
                      </div>
                      در انتظار تأیید
                    </div>
                  )}

                  {!isLeader && (
                    <motion.button
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: navItems.length * 0.05 }}
                      onClick={() => { navigate("/leader/register"); setMobileMenuOpen(false); }}
                      className="px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 border border-primary/25 text-primary hover:bg-primary/5 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center">
                        <Bus className="h-3.5 w-3.5" />
                      </div>
                      ثبت‌نام مدیر کاروان
                    </motion.button>
                  )}
                </nav>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}

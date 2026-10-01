import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";

/**
 * Floating shortcut back to the caravans list. Shows once the user has
 * scrolled past the first screen, and hides while the list itself is visible.
 */
export default function CaravansFab() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const section = document.getElementById("caravans");

    const update = () => {
      const scrolledPastHero = window.scrollY > window.innerHeight * 0.6;
      let listInView = false;
      if (section) {
        const { top, bottom } = section.getBoundingClientRect();
        listInView = top < window.innerHeight * 0.75 && bottom > 0;
      }
      setVisible(scrolledPastHero && !listInView);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scrollToCaravans = () =>
    document.getElementById("caravans")?.scrollIntoView({ behavior: "smooth" });

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="caravans-fab"
          onClick={scrollToCaravans}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          aria-label="رفتن به کاروان‌ها"
          className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground pl-4 pr-5 py-3 rounded-2xl shadow-emerald hover:bg-primary/90 transition-colors font-semibold text-sm"
        >
          <Search className="h-4 w-4" />
          کاروان‌ها
        </motion.button>
      )}
    </AnimatePresence>
  );
}

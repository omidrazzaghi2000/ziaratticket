import { motion } from "framer-motion";
import lantern1 from "../assets/images/lantern1.jpg";
import lantern2 from "../assets/images/lantern2.jpg";
import lantern3 from "../assets/images/lantern3.jpg";
import lantern4 from "../assets/images/lantern4.jpg";
import lantern5 from "../assets/images/lantern5.jpg";
import lantern6 from "../assets/images/lantern6.jpg";
import lantern7 from "../assets/images/lantern7.jpg";
import lantern8 from "../assets/images/lantern8.jpg";
import lantern9 from "../assets/images/lantern9.jpg";
import lantern10 from "../assets/images/lantern10.jpg";
import lantern11 from "../assets/images/lantern11.jpg";

const lanterns = [
  lantern1, lantern2, lantern3, lantern4, lantern5, lantern6,
  lantern7, lantern8, lantern9, lantern10, lantern11,
];

export default function LanternStrip() {
  const doubled = [...lanterns, ...lanterns];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8 }}
      className="relative py-8 overflow-hidden bg-gradient-to-b from-cream-200 to-background"
    >
      {/* Soft vignette edges */}
      <div className="absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-background to-transparent pointer-events-none" />

      {/* Marquee track */}
      <div className="flex animate-marquee-rtl will-change-transform" style={{ width: "max-content" }}>
        {doubled.map((src, i) => (
          <div
            key={i}
            className="relative mx-2 shrink-0 overflow-hidden rounded-xl"
            style={{ width: "140px", height: "200px" }}
          >
            <img
              src={src}
              alt={`فانوس ${(i % lanterns.length) + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Soft overlay for warmth */}
            <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
          </div>
        ))}
      </div>

      {/* Gold label centered */}
      {/* <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <div
          className="px-6 py-2 rounded-full text-sm font-semibold backdrop-blur-sm flex items-center gap-2"
          style={{ background: "hsl(162 72% 14% / 0.75)", color: "hsl(42 60% 70%)" }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <path d="M8 0L10 6L16 8L10 10L8 16L6 10L0 8L6 6Z" fill="hsl(42 60% 52%)" />
          </svg>
          فانوس‌های کربلا
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <path d="M8 0L10 6L16 8L10 10L8 16L6 10L0 8L6 6Z" fill="hsl(42 60% 52%)" />
          </svg>
        </div>
      </div> */}
    </motion.div>
  );
}

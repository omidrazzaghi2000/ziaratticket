import { motion, animate } from "framer-motion";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { djangoURL } from "@/App";
import shrineImage from "../assets/images/hasanmajed__-E0RryWDcsWw-unsplash.jpg";

/* ─── Animation variants ─── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.3 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.9 } },
};

/* ─── Animated counter ─── */
function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    const controls = animate(0, target, {
      duration: 2.2,
      ease: "easeOut",
      delay: 1.4,
      onUpdate(value) {
        node.textContent = Math.floor(value).toLocaleString("fa-IR") + suffix;
      },
    });
    return controls.stop;
  }, [target, suffix]);

  return <span ref={nodeRef}>۰</span>;
}

/* ─── Islamic star ornament ─── */
function StarOrnament({ size = 32, opacity = 0.2 }: { size?: number; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ opacity }}>
      <path
        d="M16 1L19.5 12.5L31 16L19.5 19.5L16 31L12.5 19.5L1 16L12.5 12.5L16 1Z"
        fill="hsl(42 62% 70%)"
      />
      <path
        d="M16 6L18.5 13.5L26 16L18.5 18.5L16 26L13.5 18.5L6 16L13.5 13.5L16 6Z"
        fill="hsl(42 60% 52%)"
      />
    </svg>
  );
}

/* ─── Geometric tiling SVG ─── */
function GeometricOverlay() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.06 }}
    >
      <defs>
        <pattern id="geo" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          {/* 8-pointed star cell */}
          <polygon points="40,4 47,17 61,17 51,26 55,40 40,32 25,40 29,26 19,17 33,17" fill="none" stroke="#C9A84C" strokeWidth="0.7" />
          <rect x="26" y="26" width="28" height="28" transform="rotate(45 40 40)" fill="none" stroke="#C9A84C" strokeWidth="0.5" />
          <circle cx="40" cy="40" r="4" fill="none" stroke="#C9A84C" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#geo)" />
    </svg>
  );
}

export default function Hero() {
  const { data: statsData } = useQuery<{ active_caravans: number }>({
    queryKey: ["caravan-stats"],
    queryFn: () => fetch(`${djangoURL}/api/stats`).then(r => r.json()),
    staleTime: 60_000,
  });

  const stats = [
    { number: statsData?.active_caravans ?? 0, suffix: "", label: "کاروان فعال" },
    { number: 15, suffix: "+", label: "سال تجربه" },
    { number: 24, suffix: "/۷", label: "پشتیبانی" },
  ];
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden" id="hero">

      {/* ── Background image ── */}
      <div className="absolute inset-0 z-0">
        <img
          src={shrineImage}
          alt="حرم امام حسین کربلا"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* ── Primary overlay: warm dark gradient (tuned for sunset image) ── */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(175deg, rgba(8,20,14,0.80) 0%, rgba(10,25,16,0.48) 45%, rgba(6,16,10,0.75) 100%)",
        }}
      />

      {/* ── Warm gold tint (top edge) to blend with sunset ── */}
      <div
        className="absolute inset-0 z-[2]"
        style={{
          background:
            "linear-gradient(to bottom, hsl(38 55% 8% / 0.3) 0%, transparent 30%), linear-gradient(to top, hsl(162 72% 8% / 0.65) 0%, transparent 55%)",
        }}
      />

      {/* ── Geometric pattern overlay ── */}
      <div className="absolute inset-0 z-[3]">
        <GeometricOverlay />
      </div>

      {/* ── Glow orbs ── */}
      <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full z-[4]"
        style={{ background: "radial-gradient(circle, hsl(162 72% 14% / 0.2) 0%, transparent 70%)" }} />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full z-[4]"
        style={{ background: "radial-gradient(circle, hsl(42 60% 52% / 0.08) 0%, transparent 70%)" }} />

      {/* ── Floating decorative stars ── */}
      {[
        { top: "15%", right: "8%", size: 28, opacity: 0.25, delay: 0 },
        { top: "25%", right: "18%", size: 16, opacity: 0.18, delay: 0.8 },
        { top: "70%", left: "6%", size: 24, opacity: 0.2, delay: 1.2 },
        { top: "45%", left: "2%", size: 14, opacity: 0.15, delay: 0.4 },
      ].map((s, i) => (
        <motion.div
          key={i}
          className="absolute hidden lg:block z-[4]"
          style={{ top: s.top, right: (s as any).right, left: (s as any).left }}
          animate={{ y: [0, -10, 0], rotate: [0, 15, 0] }}
          transition={{ duration: 5 + i * 1.5, repeat: Infinity, ease: "easeInOut", delay: s.delay }}
        >
          <StarOrnament size={s.size} opacity={s.opacity} />
        </motion.div>
      ))}

      {/* ── Main content ── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-[10] w-full container mx-auto px-4 text-center flex flex-col items-center pt-24"
      >
        {/* Official badge */}
        {/* <motion.div variants={scaleIn} className="mb-8">
          <div className="inline-flex items-center gap-3 bg-white/8 backdrop-blur-md border border-white/15 px-5 py-2.5 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-400" />
            </span>
            <span className="text-white/85 text-sm font-medium">سامانه رسمی رزرو کاروان زیارتی</span>
            <span className="h-3.5 w-px bg-white/20" />
            <span className="text-white/50 text-xs">معتمد سازمان حج و زیارت</span>
          </div>
        </motion.div> */}

        {/* Site badge */}
        <motion.div variants={fadeUp} className="mb-4">
          <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm font-medium px-5 py-2 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            سامانه رزرو کاروان زیارتی
          </span>
        </motion.div>

        {/* Main headline — site name */}
        <motion.h1
          variants={fadeUp}
          className="font-heading text-white mb-3"
          style={{
            fontSize: "clamp(3rem, 9vw, 7.5rem)",
            lineHeight: 1.05,
            fontWeight: 700,
            textShadow: "0 4px 32px rgba(0,0,0,0.4)",
            letterSpacing: "0.01em",
          }}
        >
          زیارت تیکت
        </motion.h1>

        {/* Gold sub-headline */}
        <motion.p
          variants={fadeUp}
          className="font-heading mb-5"
          style={{
            fontSize: "clamp(1.2rem, 3vw, 2rem)",
            color: "hsl(42 65% 72%)",
            fontWeight: 500,
            textShadow: "0 2px 16px rgba(0,0,0,0.5)",
          }}
        >
          رزرو آنلاین کاروان‌های زیارتی سراسر کشور
        </motion.p>

        {/* Ornamental divider */}
        <motion.div variants={fadeIn} className="flex items-center justify-center gap-4 mb-7">
          <div className="h-px w-20 bg-gradient-to-r from-transparent via-gold-400/60 to-gold-400/80" />
          <StarOrnament size={18} opacity={0.8} />
          <div className="h-px w-20 bg-gradient-to-l from-transparent via-gold-400/60 to-gold-400/80" />
        </motion.div>

        {/* Description */}
        <motion.p
          variants={fadeUp}
          className="text-white/75 max-w-2xl mx-auto mb-10 leading-loose"
          style={{ fontSize: "clamp(0.9rem, 2vw, 1.05rem)", textShadow: "0 1px 12px rgba(0,0,0,0.5)" }}
        >
          با زیارت تیکت، سفر زیارتی خود را به مشهد، کربلا، حج، عمره و سایر اماکن مقدس
          با اطمینان کامل برنامه‌ریزی کنید. رزرو آنلاین آسان و کاروان‌های رسمی در سراسر کشور.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={fadeUp}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          {/* Primary CTA — Gold */}
          <motion.a
            href="#caravans"
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.97 }}
            className="group relative inline-flex items-center gap-2.5 px-9 py-4 rounded-2xl font-bold text-base overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(42 60% 52%) 0%, hsl(40 62% 44%) 100%)",
              color: "hsl(162 72% 8%)",
              boxShadow: "0 8px 24px hsl(42 60% 52% / 0.4), 0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            <span className="absolute inset-0 bg-white/0 group-hover:bg-white/8 transition-colors duration-300" />
            {/* <svg className="w-4.5 h-4.5 shrink-0" fill="none" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg> */}
            مشاهده کاروان‌ها
          </motion.a>

          {/* Secondary CTA — Ghost */}
          <motion.a
            href="#guide"
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2.5 px-9 py-4 rounded-2xl font-bold text-base text-white border-2 border-white/25 hover:border-white/40 hover:bg-white/8 transition-all duration-300"
          >
            {/* <svg className="w-4.5 h-4.5 shrink-0" fill="none" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zM10 6v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg> */}
            راهنمای سفر
          </motion.a>
        </motion.div>

        {/* Stats row */}
        <motion.div
          variants={fadeIn}
          className="grid grid-cols-3 gap-px bg-white/8 rounded-2xl overflow-hidden backdrop-blur-sm border border-white/10 w-full max-w-xl"
        >
          {stats.map((stat, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center py-5 px-4 bg-white/5 hover:bg-white/10 transition-colors duration-300"
            >
              <div
                className="font-heading font-bold mb-1"
                style={{
                  fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
                  color: "hsl(42 65% 76%)",
                  lineHeight: 1.1,
                  textShadow: "0 2px 12px rgba(0,0,0,0.3)",
                }}
              >
                <CountUp target={stat.number} suffix={stat.suffix} />
              </div>
              <div className="text-white/50 text-xs tracking-wide">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      {/* <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[10] cursor-pointer group"
        onClick={() => document.querySelector("#caravans")?.scrollIntoView({ behavior: "smooth" })}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-white/40 text-xs tracking-widest font-sans group-hover:text-white/60 transition-colors">پایین</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="w-6 h-10 border border-white/25 rounded-full flex justify-center pt-1.5 group-hover:border-white/40 transition-colors"
          >
            <div className="w-1 h-2 bg-white/60 rounded-full" />
          </motion.div>
        </div>
      </motion.div> */}

      {/* Bottom arch divider to next section */}
      {/* <div
        className="absolute bottom-0 left-0 right-0 z-[10] h-20"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, hsl(42 45% 97%) 100%)",
          clipPath: "ellipse(55% 100% at 50% 100%)",
        }}
      /> */}
    </section>
  );
}

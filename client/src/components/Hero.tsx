import { motion } from "framer-motion";
import shrineImage from "../assets/images/Travel-to-Karbala.jpg";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.7 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">

      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <img
          src={shrineImage}
          alt="کربلا"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Dark gradient overlay — must be above bg image */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/75 via-black/55 to-black/80" />

      {/* Teal color wash */}
      <div className="absolute inset-0 z-10 bg-primary/20" />

      {/* Glow blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-700/25 rounded-full blur-3xl z-10" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-900/30 rounded-full blur-3xl z-10" />

      {/* Floating decorative rings */}
      {[
        { size: "w-28 h-28", pos: "top-20 right-20" },
        { size: "w-14 h-14", pos: "top-36 right-40" },
        { size: "w-20 h-20", pos: "bottom-28 left-16" },
      ].map((ring, i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut", delay: i * 1.2 }}
          className={`absolute ${ring.pos} ${ring.size} rounded-full border border-white/10 hidden lg:block z-10`}
        />
      ))}

      {/* ─── CONTENT ─── all z-20 to be above overlays */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-20 container mx-auto px-4 text-center"
      >
        <div className="max-w-4xl mx-auto">

          {/* Badge */}
          <motion.div variants={scaleIn} className="mb-8 flex justify-center">
            <span className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/25 text-white/90 px-6 py-2.5 rounded-full text-sm font-medium shadow-2xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              سامانه رسمی رزرو کاروان زیارتی
              <span className="w-px h-3.5 bg-white/30" />
              <span className="text-white/60 text-xs">معتمد سازمان حج و زیارت</span>
            </span>
          </motion.div>

          {/* Main title */}
          <motion.h1
            variants={fadeUp}
            className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-none tracking-tight mb-4 drop-shadow-2xl"
            style={{ textShadow: "0 4px 24px rgba(0,0,0,0.5)" }}
          >
            کاروان زیارتی کربلا
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            className="text-2xl md:text-3xl font-light text-emerald-300 mb-6 tracking-wide"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
          >
            سفر معنوی به کربلای معلی
          </motion.p>

          {/* Divider */}
          <motion.div
            variants={fadeIn}
            className="flex items-center justify-center gap-3 mb-8"
          >
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-emerald-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-emerald-400" />
          </motion.div>

          {/* Description */}
          <motion.p
            variants={fadeUp}
            className="text-base md:text-lg text-white/80 max-w-2xl mx-auto leading-loose mb-10"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}
          >
            با سامانه کاروان کربلا، سفر زیارتی خود را با اطمینان کامل برنامه‌ریزی کنید.
            <br />
            رزرو آنلاین آسان، پشتیبانی ۲۴ ساعته، و کاروان‌های رسمی و معتمد در سراسر کشور.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <motion.a
              href="#caravans"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-2xl shadow-emerald-900/40 hover:shadow-emerald-800/60 transition-shadow"
            >
              مشاهده کاروان‌ها
            </motion.a>
            <motion.a
              href="#guide"
              whileHover={{ scale: 1.05, y: -2, backgroundColor: "rgba(255,255,255,0.18)" }}
              whileTap={{ scale: 0.97 }}
              className="bg-white/10 backdrop-blur-md border-2 border-white/30 text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all"
            >
              راهنمای سفر
            </motion.a>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={fadeIn}
            className="flex items-center justify-center gap-8 md:gap-16"
          >
            {[
              { number: "+۵۰۰", label: "کاروان فعال" },
              { number: "+۱۰۰۰۰", label: "زائر راضی" },
              { number: "۲۴/۷", label: "پشتیبانی" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div
                  className="text-2xl md:text-4xl font-black text-white mb-1"
                  style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
                >
                  {stat.number}
                </div>
                <div className="text-white/55 text-xs md:text-sm tracking-wide">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 cursor-pointer"
        onClick={() => document.querySelector("#caravans")?.scrollIntoView({ behavior: "smooth" })}
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="w-7 h-11 border-2 border-white/35 rounded-full flex justify-center pt-2"
        >
          <div className="w-1.5 h-1.5 bg-white/70 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}

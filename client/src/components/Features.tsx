import { Shield, Heart, Map, Headphones } from "lucide-react";
import { motion, useMotionValue, useSpring, animate } from "framer-motion";
import { useEffect, useRef } from "react";

const features = [
  {
    icon: Shield,
    title: "امنیت و اطمینان",
    description: "تمامی کاروان‌ها دارای مجوز رسمی از سازمان حج و زیارت هستند و تحت نظارت کامل سفر می‌کنند.",
    stat: 100,
    statSuffix: "%",
    statLabel: "کاروان دارای مجوز",
    accent: "from-primary-700 to-primary-500",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    border: "border-primary/15",
  },
  {
    icon: Heart,
    title: "خدمات ویژه",
    description: "اسکان، تغذیه و حمل‌ونقل درجه یک برای آسایش کامل زائرین در تمام مراحل سفر.",
    stat: 10000,
    statSuffix: "+",
    statLabel: "زائر راضی",
    accent: "from-rose-600 to-pink-500",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
    border: "border-rose-100",
  },
  {
    icon: Map,
    title: "تنوع مسیرها",
    description: "انتخاب از میان مسیرهای زمینی، هوایی و ترکیبی برای هر نوع سفر زیارتی.",
    stat: 50,
    statSuffix: "+",
    statLabel: "مسیر متنوع",
    accent: "from-gold-700 to-gold-500",
    iconBg: "bg-gold-50",
    iconColor: "text-gold-700",
    border: "border-gold-100",
  },
  {
    icon: Headphones,
    title: "پشتیبانی ۲۴ ساعته",
    description: "کارشناسان ما در تمام ساعات شبانه‌روز آماده پاسخگویی و همراهی شما هستند.",
    stat: 24,
    statSuffix: "/۷",
    statLabel: "ساعت در دسترس",
    accent: "from-violet-600 to-purple-500",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    border: "border-violet-100",
  },
];

function CounterStat({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const controls = animate(0, target, {
            duration: 1.8,
            ease: "easeOut",
            onUpdate(v) {
              node.textContent = Math.floor(v).toLocaleString("fa-IR") + suffix;
            },
          });
          observer.disconnect();
          return () => controls.stop();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [target, suffix]);

  return (
    <div className="text-center">
      <span className="font-heading font-bold text-3xl text-primary" ref={nodeRef}>
        ۰
      </span>
      <p className="text-muted-foreground text-xs mt-0.5">{label}</p>
    </div>
  );
}

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: 0.1 } },
};

const card = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};

/* Ornamental section heading with gold divider */
function SectionHeading({ tag, title, sub }: { tag: string; title: string; sub: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7 }}
      className="text-center mb-16"
    >
      <span className="inline-flex items-center gap-2 bg-primary/8 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-5 tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
        {tag}
      </span>
      <h2 className="font-heading text-display-sm text-foreground mb-4">{title}</h2>

      {/* Ornamental gold divider */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="h-px w-12 bg-gradient-to-r from-transparent to-gold-400/60" />
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 0L10 6L16 8L10 10L8 16L6 10L0 8L6 6Z" fill="hsl(42 60% 52%)" opacity="0.8" />
        </svg>
        <div className="h-px w-12 bg-gradient-to-l from-transparent to-gold-400/60" />
      </div>

      <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed text-sm">{sub}</p>
    </motion.div>
  );
}

export default function Features() {
  return (
    <section className="py-24 bg-background overflow-hidden relative">
      {/* Subtle geometric background */}
      <div className="absolute inset-0 bg-geometric opacity-40 pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        <SectionHeading
          tag="چرا ما؟"
          title="چرا سامانه کاروان کربلا؟"
          sub="با هزاران زائر راضی، بهترین تجربه سفر زیارتی را با اطمینان کامل فراهم می‌کنیم."
        />

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {features.map((f, idx) => (
            <motion.div
              key={idx}
              variants={card}
              whileHover={{ y: -10, transition: { duration: 0.3, ease: "easeOut" } }}
              className={`group bg-card rounded-2xl p-7 border ${f.border} shadow-card hover:shadow-card-hover transition-shadow duration-400 relative overflow-hidden flex flex-col`}
            >
              {/* Top accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${f.accent}`} />

              {/* Icon */}
              <div className={`w-12 h-12 ${f.iconBg} ${f.iconColor} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <f.icon className="h-6 w-6" strokeWidth={1.5} />
              </div>

              {/* Content */}
              <h3 className="font-heading text-xl text-foreground mb-2 font-bold">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed flex-grow">{f.description}</p>

              {/* Stat */}
              <div className={`mt-5 pt-4 border-t ${f.border}`}>
                <CounterStat target={f.stat} suffix={f.statSuffix} label={f.statLabel} />
              </div>

              {/* Hover glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${f.accent} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-400 pointer-events-none`} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

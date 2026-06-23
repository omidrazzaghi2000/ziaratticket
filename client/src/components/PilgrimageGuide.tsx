import { motion } from "framer-motion";
import { FileText, Camera, MapPin, Shield, BookOpen, Wallet, ChevronLeft } from "lucide-react";
import nightShrine from "../assets/images/pexels-samer-alhusseini-540227434-17340981.jpg";

const requirementItems = [
  "گذرنامه با حداقل ۶ ماه اعتبار از تاریخ سفر",
  "دو قطعه عکس ۴×۳ جدید (خانم‌ها با حجاب کامل)",
  "کپی شناسنامه و کارت ملی",
  "تکمیل فرم اطلاعات فردی در سامانه",
  "کارت واکسن برای واکسیناسیون‌های موردنیاز",
];

const suppliesItems = [
  "لباس مناسب برای آب‌وهوای عراق",
  "داروهای مورد نیاز و نسخه پزشک",
  "ادعیه و زیارتنامه‌ها",
  "کفش راحت مناسب پیاده‌روی",
  "وسایل بهداشتی شخصی",
];

const travelTips = [
  {
    icon: BookOpen,
    title: "آداب زیارت",
    body: "زیارت امام حسین (ع) از آداب خاصی برخوردار است. قبل از سفر مطالعه آداب زیارت و زیارتنامه‌ها را فراموش نکنید.",
    color: "text-primary",
    bg: "bg-primary/8",
  },
  {
    icon: Camera,
    title: "شرایط آب‌وهوایی",
    body: "تابستان عراق بسیار گرم و زمستان سرد است. لباس مناسب با توجه به فصل سفر حتماً همراه داشته باشید.",
    color: "text-gold-700",
    bg: "bg-gold-50",
  },
  {
    icon: MapPin,
    title: "ارتباطات",
    body: "سیم‌کارت‌های عراقی در مرز یا شهرهای زیارتی قابل تهیه است. بیشتر هتل‌ها دارای اینترنت وای‌فای هستند.",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    icon: Wallet,
    title: "ارز مورد نیاز",
    body: "واحد پول عراق دینار است. دلار یا یورو را در صرافی‌های عراق تبدیل کنید. برخی فروشندگان تومان هم می‌پذیرند.",
    color: "text-sky-600",
    bg: "bg-sky-50",
  },
  {
    icon: Shield,
    title: "امنیت و سلامت",
    body: "همیشه با کاروان حرکت کنید و از دستورات مدیر کاروان پیروی نمایید. مراقب وسایل شخصی خود باشید.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
];

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

function CheckItem({ text }: { text: string }) {
  return (
    <motion.li
      variants={fadeUp}
      className="flex items-start gap-3 group"
    >
      <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/12 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
        <svg className="w-2.5 h-2.5 text-primary" fill="none" viewBox="0 0 10 8">
          <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="text-foreground/80 text-sm leading-relaxed">{text}</span>
    </motion.li>
  );
}

export default function PilgrimageGuide() {
  return (
    <section id="guide" className="py-24 bg-background relative overflow-hidden">
      {/* Subtle bg */}
      <div className="absolute inset-0 bg-geometric opacity-25 pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 bg-primary/8 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-5 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
            راهنمای سفر
          </span>
          <h2 className="font-heading text-display-sm text-foreground mb-4">راهنمای زیارت کربلا</h2>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-gold-400/60" />
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 0L10 6L16 8L10 10L8 16L6 10L0 8L6 6Z" fill="hsl(42 60% 52%)" opacity="0.8" />
            </svg>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-gold-400/60" />
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
            هر آنچه برای آماده شدن جهت سفر معنوی به کربلای معلی نیاز دارید.
          </p>
        </motion.div>

        {/* Requirements grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7 mb-12">
          {/* Documents */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="bg-card rounded-2xl p-7 border border-border shadow-card"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground">مدارک مورد نیاز</h3>
            </div>
            <motion.ul
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-3.5"
            >
              {requirementItems.map((item, i) => (
                <CheckItem key={i} text={item} />
              ))}
            </motion.ul>
          </motion.div>

          {/* Supplies */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="bg-card rounded-2xl p-7 border border-border shadow-card"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gold-100 rounded-xl flex items-center justify-center">
                <svg className="h-5 w-5 text-gold-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground">وسایل ضروری</h3>
            </div>
            <motion.ul
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-3.5"
            >
              {suppliesItems.map((item, i) => (
                <CheckItem key={i} text={item} />
              ))}
            </motion.ul>
          </motion.div>
        </div>

        {/* Travel tips grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="mb-4"
        >
          <h3 className="font-heading text-xl font-bold text-foreground mb-6 flex items-center gap-3">
            <div className="h-6 w-0.5 bg-gradient-to-b from-primary to-gold-500 rounded-full" />
            نکات مهم سفر
          </h3>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {travelTips.map((tip, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="bg-card rounded-2xl p-6 border border-border shadow-card hover:shadow-card-hover transition-shadow group"
            >
              <div className={`w-10 h-10 ${tip.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <tip.icon className={`h-5 w-5 ${tip.color}`} strokeWidth={1.5} />
              </div>
              <h4 className="font-heading text-lg font-bold text-foreground mb-2">{tip.title}</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">{tip.body}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden"
          style={{ minHeight: "140px" }}
        >
          {/* Photo background */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${nightShrine})` }}
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-primary/85" />
          <div className="absolute inset-0 bg-geometric-dark pointer-events-none" />
          <div className="relative">
            <h3 className="font-heading text-2xl font-bold text-white mb-1">آماده سفر هستید؟</h3>
            <p className="text-white/65 text-sm">همین حالا کاروان مناسب خود را پیدا کنید.</p>
          </div>
          <motion.a
            href="#caravans"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="relative inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-gold-foreground px-7 py-3 rounded-xl font-bold text-sm shadow-gold transition-colors shrink-0"
          >
            مشاهده کاروان‌ها
            <ChevronLeft className="h-4 w-4" />
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}

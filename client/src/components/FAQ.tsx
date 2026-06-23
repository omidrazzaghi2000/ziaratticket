import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "شرایط انصراف از سفر چگونه است؟",
    answer:
      "در صورت انصراف، با توجه به زمان باقی‌مانده تا تاریخ حرکت، مبلغی به عنوان جریمه کسر می‌شود: تا ۳۰ روز قبل ۱۰٪، ۱۵ تا ۳۰ روز قبل ۳۰٪، ۷ تا ۱۵ روز قبل ۵۰٪ و کمتر از ۷ روز ۷۰٪ جریمه دارد. در صورت معرفی جایگزین، فقط هزینه تغییر نام کسر خواهد شد.",
  },
  {
    question: "آیا امکان تقسیط هزینه سفر وجود دارد؟",
    answer:
      "بله، برای کاروان‌های با تاریخ حرکت بیش از ۳ ماه، پرداخت اقساطی امکان‌پذیر است. ۵۰٪ مبلغ به عنوان پیش‌پرداخت دریافت می‌شود و مابقی در اقساط ماهانه تا قبل از تاریخ حرکت قابل پرداخت است.",
  },
  {
    question: "برای کودکان چه تسهیلاتی در نظر گرفته شده است؟",
    answer:
      "کودکان زیر ۲ سال فقط هزینه بیمه و ویزا دارند. کودکان ۲ تا ۱۲ سال از ۲۰٪ تخفیف برخوردار می‌شوند. در کاروان‌های ویژه خانواده، خدمات اختصاصی کودکان از جمله غذای مخصوص و برنامه‌های سنی فراهم است.",
  },
  {
    question: "آیا امکان شرکت در پیاده‌روی اربعین وجود دارد؟",
    answer:
      "بله، کاروان‌های ویژه اربعین چند هفته قبل از مناسبت برنامه‌ریزی می‌شوند. با توجه به استقبال زیاد، ثبت‌نام زودهنگام توصیه می‌شود. فیلتر «ویژه اربعین» در بخش کاروان‌ها در دسترس است.",
  },
  {
    question: "آیا هزینه بیمه در قیمت کاروان لحاظ شده است؟",
    answer:
      "بله، بیمه پایه شامل حوادث، درمان اضطراری و فوت در قیمت کاروان لحاظ است. بیمه‌های تکمیلی با پوشش بیشتر با پرداخت هزینه اضافی قابل ارتقا هستند. جزئیات در صفحه کاروان نمایش داده می‌شود.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 bg-gradient-to-b from-cream-200 to-background relative overflow-hidden">
      <div className="absolute inset-0 bg-geometric opacity-25 pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <span className="inline-flex items-center gap-2 bg-primary/8 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-5 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
            سوالات متداول
          </span>
          <h2 className="font-heading text-display-sm text-foreground mb-4">پرسش‌های رایج</h2>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-gold-400/60" />
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 0L10 6L16 8L10 10L8 16L6 10L0 8L6 6Z" fill="hsl(42 60% 52%)" opacity="0.8" />
            </svg>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-gold-400/60" />
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
            پاسخ سوالات رایج زائرین درباره رزرو، قوانین و خدمات کاروان را اینجا بیابید.
          </p>
        </motion.div>

        {/* FAQ list */}
        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.5, delay: index * 0.07 }}
                className={`bg-card rounded-2xl border overflow-hidden transition-all duration-300 ${
                  isOpen ? "border-primary/25 shadow-emerald-sm" : "border-border shadow-card"
                }`}
              >
                {/* Question */}
                <button
                  className="w-full text-right px-6 py-5 flex items-center justify-between gap-4 group"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  {/* Number badge */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span
                      className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold font-heading transition-all duration-300 ${
                        isOpen ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                      }`}
                    >
                      {(index + 1).toLocaleString("fa-IR")}
                    </span>
                    <span className={`font-heading text-base md:text-lg font-bold transition-colors duration-200 text-right ${isOpen ? "text-primary" : "text-foreground group-hover:text-primary"}`}>
                      {faq.question}
                    </span>
                  </div>

                  {/* Toggle icon */}
                  <div className={`shrink-0 w-7 h-7 rounded-xl border flex items-center justify-center transition-all duration-300 ${
                    isOpen ? "bg-primary border-primary text-white" : "border-border text-muted-foreground group-hover:border-primary/40 group-hover:text-primary"
                  }`}>
                    <AnimatePresence mode="wait" initial={false}>
                      {isOpen ? (
                        <motion.div key="minus" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                          <Minus className="h-3.5 w-3.5" />
                        </motion.div>
                      ) : (
                        <motion.div key="plus" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                          <Plus className="h-3.5 w-3.5" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </button>

                {/* Answer */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5 pt-0">
                        <div className="h-px bg-border mb-4" />
                        <p className="text-muted-foreground text-sm leading-loose pr-12">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground text-sm mb-4">سوال دیگری دارید؟</p>
          <a
            href="#contact"
            onClick={(e) => { e.preventDefault(); document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }); }}
            className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:underline underline-offset-4"
          >
            با ما تماس بگیرید
            <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
}

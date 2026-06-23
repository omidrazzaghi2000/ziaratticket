import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { CheckCircle2, Phone, MessageCircle, Home, Copy, Users, CreditCard, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { djangoURL } from "@/App";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";

interface BookingSuccessProps {
  params: { bookingId: string };
}

export default function BookingSuccess({ params }: BookingSuccessProps) {
  const bookingId = parseInt(params.bookingId);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: booking, isLoading } = useQuery({
    queryKey: [djangoURL + `/api/bookings/${bookingId}`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/bookings/${bookingId}`);
      return response.json();
    },
  });

  const copyCode = () => {
    navigator.clipboard.writeText(`#${booking?.id}`);
    toast({ title: "کد رزرو کپی شد", description: `کد #${booking?.id} در کلیپ‌بورد کپی شد.` });
  };

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="bg-background min-h-screen">
        <Header />
        <div className="container py-10 pt-32 text-center">
          <h2 className="font-heading text-2xl font-bold text-foreground mb-4">رزرو یافت نشد</h2>
          <Button variant="outline" onClick={() => navigate("/")}>بازگشت به صفحه اصلی</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <Header />

      <div className="container py-16 pt-28 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="bg-card rounded-3xl shadow-card-hover overflow-hidden border border-border"
        >
          {/* Success banner — emerald + gold premium */}
          <div
            className="relative p-8 text-center overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(162 72% 12%) 0%, hsl(162 72% 18%) 50%, hsl(162 72% 14%) 100%)",
            }}
          >
            {/* Gold top border */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />

            {/* Geometric rings */}
            <div className="absolute inset-0 overflow-hidden opacity-8">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full border border-gold-400/30"
                  style={{
                    width: `${(i + 1) * 80}px`,
                    height: `${(i + 1) * 80}px`,
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                />
              ))}
            </div>

            {/* Star ornaments */}
            <div className="absolute top-4 right-6 opacity-20">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <path d="M8 0L10 6L16 8L10 10L8 16L6 10L0 8L6 6Z" fill="hsl(42 60% 52%)" />
              </svg>
            </div>
            <div className="absolute top-4 left-6 opacity-20">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <path d="M8 0L10 6L16 8L10 10L8 16L6 10L0 8L6 6Z" fill="hsl(42 60% 52%)" />
              </svg>
            </div>

            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="relative"
            >
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 border-2 border-gold-500/40"
                style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}
              >
                <CheckCircle2 className="h-10 w-10 text-gold-400" />
              </div>

              <h1 className="font-heading text-2xl md:text-3xl font-bold text-white mb-2">
                رزرو با موفقیت ثبت شد!
              </h1>
              <p className="text-white/65 text-sm">تیم ما به زودی با شما تماس خواهد گرفت.</p>

              {/* Gold ornament divider */}
              <div className="flex items-center justify-center gap-3 mt-4">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-gold-400/50" />
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0L10 6L16 8L10 10L8 16L6 10L0 8L6 6Z" fill="hsl(42 60% 52%)" opacity="0.7" />
                </svg>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-gold-400/50" />
              </div>
            </motion.div>

            {/* Gold bottom border */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />
          </div>

          <div className="p-6 md:p-8 space-y-5">
            {/* Booking code */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-between bg-primary/8 border border-primary/20 rounded-2xl p-4"
            >
              <div>
                <p className="text-xs text-muted-foreground mb-1">کد رزرو شما</p>
                <p className="font-heading text-2xl font-black text-primary tracking-widest">#{booking.id}</p>
              </div>
              <button
                onClick={copyCode}
                className="flex items-center gap-2 text-sm text-primary bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-xl transition-colors"
              >
                <Copy className="h-4 w-4" />
                کپی کد
              </button>
            </motion.div>

            {/* Summary grid */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-2 gap-3"
            >
              {[
                { icon: Users, label: "سرپرست", value: booking.main_passenger_name, color: "text-primary", bg: "bg-primary/8 border-primary/15" },
                { icon: Users, label: "تعداد مسافرین", value: `${booking.passenger_count} نفر`, color: "text-primary", bg: "bg-primary/8 border-primary/15" },
                { icon: CreditCard, label: "مبلغ کل", value: `${new Intl.NumberFormat("fa-IR").format(booking.total_price)} تومان`, color: "text-gold-700", bg: "bg-gold-50 border-gold-200" },
                { icon: Phone, label: "شماره موبایل", value: booking.main_passenger_phone, color: "text-primary", bg: "bg-primary/8 border-primary/15" },
              ].map((item, i) => (
                <div key={i} className={`${item.bg} border rounded-xl p-3`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                  <p className={`font-bold text-sm ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </motion.div>

            {/* Payment status */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gold-50 border border-gold-200 rounded-2xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gold-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <MessageCircle className="h-4 w-4 text-gold-600" />
                </div>
                <div>
                  <p className="font-semibold text-gold-800 mb-1 text-sm">در انتظار پرداخت</p>
                  <p className="text-gold-700 text-sm leading-relaxed">
                    لینک پرداخت به شماره{" "}
                    <span className="font-bold">{booking.main_passenger_phone}</span>{" "}
                    از طریق تلگرام، واتساپ یا بله ارسال خواهد شد.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Support contact */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-cream-100 border border-border rounded-2xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">پشتیبانی ۲۴ ساعته</p>
                  <p className="font-heading font-bold text-foreground text-lg">۰۹۹۰۲۳۸۲۴۱۶</p>
                </div>
              </div>
              <a
                href="tel:09902382416"
                className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                تماس
              </a>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                onClick={() => navigate("/")}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12 gap-2 font-semibold"
              >
                <Home className="h-4 w-4" />
                بازگشت به صفحه اصلی
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { CheckCircle2, MessageCircle, Home, Copy, Users, CreditCard, Phone, Printer, ExternalLink, Bus, Calendar } from "lucide-react";
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

  const bookingCode = booking?.booking_code || `#${booking?.id}`;
  /** ارقام لاتین به فارسی — کد رزرو و کد ملی عمداً لاتین می‌مانند تا کپی/جستجو آسان باشد */
  const fa = (v?: string | number) => String(v ?? "").replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[+d]);

  const copyCode = () => {
    navigator.clipboard.writeText(bookingCode);
    toast({ title: "کد رزرو کپی شد", description: `کد ${bookingCode} در کلیپ‌بورد کپی شد.` });
  };

  const printReceipt = () => window.print();

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

      <div className="container py-16 pt-28 max-w-2xl mx-auto print-container">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="print-receipt bg-card rounded-3xl shadow-card-hover overflow-hidden border border-border"
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
              <p className="text-white/65 text-sm">مسئول کاروان به زودی با شما تماس خواهد گرفت.</p>

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
                <p className="font-heading text-xl md:text-2xl font-black text-primary tracking-wider" dir="ltr">
                  {bookingCode}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  کد کاروان + تاریخ حرکت + مدت سفر + شماره ترتیبی رزرو
                </p>
              </div>
              <button
                onClick={copyCode}
                className="no-print flex items-center gap-2 text-sm text-primary bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-xl transition-colors shrink-0"
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
                { icon: Users, label: "کد ملی سرپرست", value: booking.main_passenger_id || "—", color: "text-primary", bg: "bg-primary/8 border-primary/15" },
                { icon: Bus, label: "کاروان", value: booking.caravan_name || "—", color: "text-primary", bg: "bg-primary/8 border-primary/15" },
                { icon: Calendar, label: "تاریخ حرکت", value: fa(booking.caravan_departure_date) || "—", color: "text-primary", bg: "bg-primary/8 border-primary/15" },
                { icon: Users, label: "تعداد مسافرین", value: `${fa(booking.passenger_count)} نفر`, color: "text-primary", bg: "bg-primary/8 border-primary/15" },
                {
                  icon: Bus,
                  label: "صندلی‌ها",
                  value: (booking.selected_seats || []).length
                    ? (booking.selected_seats as number[]).slice().sort((a, b) => a - b).map(fa).join("، ")
                    : "—",
                  color: "text-primary",
                  bg: "bg-primary/8 border-primary/15",
                },
                { icon: CreditCard, label: "مبلغ کل", value: `${new Intl.NumberFormat("fa-IR").format(booking.total_price)} تومان`, color: "text-gold-700", bg: "bg-gold-50 border-gold-200" },
                { icon: Phone, label: "موبایل سرپرست", value: fa(booking.main_passenger_phone) || "—", color: "text-primary", bg: "bg-primary/8 border-primary/15" },
                { icon: Phone, label: "مسئول کاروان", value: fa(booking.caravan_leader_phone) || "—", color: "text-primary", bg: "bg-primary/8 border-primary/15" },
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
                <div className="flex-1">
                  <p className="font-semibold text-gold-800 mb-1 text-sm">
                    {booking.is_paid ? "پرداخت انجام شده" : "در انتظار پرداخت"}
                  </p>
                  {booking.is_paid ? (
                    <p className="text-gold-700 text-sm">مبلغ رزرو پرداخت شده است.</p>
                  ) : booking.payment_link ? (
                    <>
                      <p className="text-gold-700 text-sm leading-relaxed mb-3">
                        برای تکمیل رزرو، از طریق لینک زیر پرداخت را انجام دهید.
                      </p>
                      <a
                        href={booking.payment_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="no-print inline-flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                      >
                        <CreditCard className="h-4 w-4" />
                        پرداخت آنلاین
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <p className="only-print text-gold-700 text-xs mt-2 break-all" dir="ltr">
                        {booking.payment_link}
                      </p>
                    </>
                  ) : (
                    <p className="text-gold-700 text-sm leading-relaxed">
                      لینک پرداخت پس از تأیید نهایی مسئول کاروان، در همین صفحه نمایش داده می‌شود.
                      این صفحه را با کد رزرو خود نگه دارید.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Companions — part of the printed receipt */}
            {Array.isArray(booking.companions) && booking.companions.length > 0 && (
              <div className="border border-border rounded-2xl overflow-hidden">
                <div className="bg-cream-100 px-4 py-2.5 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">
                    همراهان ({fa(booking.companions.length)} نفر)
                  </p>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="text-right px-4 py-2 font-medium">#</th>
                      <th className="text-right px-4 py-2 font-medium">نام</th>
                      <th className="text-right px-4 py-2 font-medium">نام خانوادگی</th>
                      <th className="text-right px-4 py-2 font-medium">کد ملی</th>
                      <th className="text-right px-4 py-2 font-medium">موبایل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {booking.companions.map((c: { firstName?: string; lastName?: string; name?: string; nationalId?: string; phone?: string }, i: number) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-2">{c.firstName || c.name || "—"}</td>
                        <td className="px-4 py-2">{c.lastName || "—"}</td>
                        <td className="px-4 py-2" dir="ltr">{c.nationalId || "—"}</td>
                        <td className="px-4 py-2" dir="ltr">{fa(c.phone) || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="only-print text-center text-xs text-muted-foreground pt-2">
              این برگه به عنوان رسید رزرو معتبر است — سامانه رزرو کاروان‌های زیارتی
            </p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="no-print flex flex-col sm:flex-row gap-3"
            >
              <Button
                onClick={printReceipt}
                variant="outline"
                className="flex-1 rounded-xl h-12 gap-2 font-semibold border-primary/30 text-primary hover:bg-primary/5"
              >
                <Printer className="h-4 w-4" />
                چاپ رسید
              </Button>
              <Button
                onClick={() => navigate("/")}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12 gap-2 font-semibold"
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

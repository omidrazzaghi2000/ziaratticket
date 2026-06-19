import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { CheckCircle2, Phone, MessageCircle, Home, Copy, Users, Calendar, CreditCard } from "lucide-react";
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
      <div className="bg-gray-50 min-h-screen">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
          <p className="text-gray-500">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Header />
        <div className="container py-10 pt-32 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">رزرو یافت نشد</h2>
          <Button variant="outline" onClick={() => navigate("/")}>بازگشت به صفحه اصلی</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <Header />

      <div className="container py-16 pt-28 max-w-2xl mx-auto">
        {/* Success card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100"
        >
          {/* Top banner */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full border border-white"
                  style={{
                    width: `${(i + 1) * 60}px`,
                    height: `${(i + 1) * 60}px`,
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                />
              ))}
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="relative"
            >
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                رزرو با موفقیت ثبت شد!
              </h1>
              <p className="text-white/80 text-sm">
                تیم ما به زودی با شما تماس خواهد گرفت.
              </p>
            </motion.div>
          </div>

          <div className="p-6 md:p-8">
            {/* Booking code */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6"
            >
              <div>
                <p className="text-xs text-gray-500 mb-1">کد رزرو شما</p>
                <p className="text-2xl font-black text-primary tracking-widest">#{booking.id}</p>
              </div>
              <button
                onClick={copyCode}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/70 transition-colors bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-xl"
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
              className="grid grid-cols-2 gap-3 mb-6"
            >
              {[
                { icon: Users, label: "سرپرست", value: booking.main_passenger_name, color: "text-blue-600", bg: "bg-blue-50" },
                { icon: Users, label: "تعداد مسافرین", value: `${booking.passenger_count} نفر`, color: "text-violet-600", bg: "bg-violet-50" },
                { icon: CreditCard, label: "مبلغ کل", value: `${new Intl.NumberFormat("fa-IR").format(booking.total_price)} تومان`, color: "text-emerald-600", bg: "bg-emerald-50" },
                { icon: Phone, label: "شماره موبایل", value: booking.main_passenger_phone, color: "text-orange-600", bg: "bg-orange-50" },
              ].map((item, i) => (
                <div key={i} className={`${item.bg} rounded-xl p-3`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                    <p className="text-xs text-gray-500">{item.label}</p>
                  </div>
                  <p className={`font-bold text-sm ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </motion.div>

            {/* Status */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <MessageCircle className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-amber-800 mb-1">در انتظار پرداخت</p>
                  <p className="text-amber-700 text-sm leading-relaxed">
                    لینک پرداخت به شماره{" "}
                    <span className="font-bold">{booking.main_passenger_phone}</span>{" "}
                    از طریق تلگرام، واتساپ یا بله ارسال خواهد شد.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Contact */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-gray-50 rounded-2xl p-4 mb-6 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">پشتیبانی ۲۴ ساعته</p>
                  <p className="font-bold text-gray-800 text-lg">۰۹۹۰۲۳۸۲۴۱۶</p>
                </div>
              </div>
              <a
                href="tel:09902382416"
                className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                تماس
              </a>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                onClick={() => navigate("/")}
                className="w-full bg-primary hover:bg-primary/90 rounded-xl h-12 gap-2 font-semibold"
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

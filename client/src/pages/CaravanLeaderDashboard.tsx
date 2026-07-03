import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bus, Plus, Users, CalendarCheck, Download, Eye, Edit2, Trash2,
  ChevronLeft, TrendingUp, Clock, CheckCircle2, XCircle, AlertCircle,
  Phone, Armchair, X, Image, Upload, Link2, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth";
import Header from "@/components/Header";
import { djangoURL } from "@/App";

function toPersian(n: number | string) {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:   { label: "در انتظار تأیید", color: "bg-amber-100 text-amber-800 border-amber-200" },
  approved:  { label: "تأیید شده", color: "bg-green-100 text-green-800 border-green-200" },
  rejected:  { label: "رد شده", color: "bg-red-100 text-red-800 border-red-200" },
};

const BOOKING_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:   { label: "در انتظار", color: "bg-amber-100 text-amber-800" },
  confirmed: { label: "تأیید شده", color: "bg-green-100 text-green-800" },
  cancelled: { label: "لغو شده", color: "bg-red-100 text-red-800" },
  completed: { label: "تکمیل شده", color: "bg-blue-100 text-blue-800" },
};

function authHeaders() {
  return {
    Authorization: localStorage.getItem("AUTH_TOKEN_KEY") || "",
    "Content-Type": "application/json",
  };
}

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(`${djangoURL}${url}`, { headers: authHeaders(), ...options });
  if (!res.ok) throw new Error("خطا در دریافت اطلاعات");
  return res.json();
}

interface Booking {
  id: number;
  caravan: number;
  caravan_name: string;
  main_passenger_name: string;
  main_passenger_phone: string;
  main_passenger_emergency_phone: string;
  passenger_count: number;
  total_price: number;
  status: string;
  selected_seats: number[];
  created_at: string;
  is_paid: boolean;
}

interface Caravan {
  id: number;
  name: string;
  destination: string;
  destination_display: string;
  departure_date: string;
  duration: number;
  transportation_display: string;
  price: number;
  capacity: number;
  remaining_capacity: number;
  status: string;
}

function ReviewLinkButton({ bookingId }: { bookingId: number }) {
  const { toast } = useToast();
  const generate = useMutation({
    mutationFn: () =>
      fetch(`${djangoURL}/api/leader/bookings/${bookingId}/review-link`, {
        method: "POST",
        headers: { Authorization: localStorage.getItem("AUTH_TOKEN_KEY") || "" },
      }).then(r => r.json()),
    onSuccess: (data) => {
      const link = `${window.location.origin}${data.link}`;
      navigator.clipboard.writeText(link).then(() => {
        toast({ title: "لینک کپی شد", description: "لینک نظرسنجی در کلیپ‌بورد کپی شد. آن را برای زائر ارسال کنید." });
      });
    },
  });

  return (
    <button
      onClick={() => generate.mutate()}
      disabled={generate.isPending}
      className="text-primary hover:bg-primary/10 p-2 rounded-xl transition-colors"
      title="دریافت و کپی لینک نظرسنجی"
    >
      {generate.isPending ? (
        <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      ) : (
        <Link2 className="h-4 w-4" />
      )}
    </button>
  );
}

export default function CaravanLeaderDashboard() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"caravans" | "bookings">("caravans");
  const [selectedCaravanId, setSelectedCaravanId] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<number | null>(null);
  const [photoUploadCaravanId, setPhotoUploadCaravanId] = useState<number | null>(null);
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploadCategory, setUploadCategory] = useState("general");
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: caravans = [], isLoading: loadingCaravans } = useQuery<Caravan[]>({
    queryKey: ["leader-caravans"],
    queryFn: () => apiFetch("/api/leader/caravans"),
    enabled: isAuthenticated,
  });

  const bookingsUrl = selectedCaravanId
    ? `/api/leader/bookings?caravan_id=${selectedCaravanId}`
    : "/api/leader/bookings";

  const { data: bookings = [], isLoading: loadingBookings } = useQuery<Booking[]>({
    queryKey: ["leader-bookings", selectedCaravanId],
    queryFn: () => apiFetch(bookingsUrl),
    enabled: isAuthenticated && activeTab === "bookings",
  });

  const cancelBooking = useMutation({
    mutationFn: (id: number) =>
      fetch(`${djangoURL}/api/leader/bookings/${id}`, { method: "DELETE", headers: authHeaders() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leader-bookings"] });
      toast({ title: "رزرو لغو شد" });
      setConfirmCancel(null);
    },
  });

  const exportCSV = () => {
    const url = selectedCaravanId
      ? `${djangoURL}/api/leader/bookings/export?caravan_id=${selectedCaravanId}`
      : `${djangoURL}/api/leader/bookings/export`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "bookings.csv";
    a.click();
  };

  const handlePhotoUpload = async () => {
    if (!uploadFiles || !photoUploadCaravanId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < uploadFiles.length; i++) {
        formData.append("photos", uploadFiles[i]);
      }
      formData.append("category", uploadCategory);
      formData.append("caption", uploadCaption);
      const res = await fetch(`${djangoURL}/api/leader/caravans/${photoUploadCaravanId}/photos`, {
        method: "POST",
        headers: { Authorization: localStorage.getItem("AUTH_TOKEN_KEY") || "" },
        body: formData,
      });
      if (!res.ok) throw new Error();
      toast({ title: "تصاویر با موفقیت آپلود شدند" });
      setPhotoUploadCaravanId(null);
      setUploadFiles(null);
      setUploadCaption("");
    } catch {
      toast({ title: "خطا در آپلود تصاویر", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-background min-h-screen">
        <Header />
        <div className="container pt-32 text-center">
          <p className="text-muted-foreground mb-4">برای دسترسی به داشبورد، لطفاً وارد شوید.</p>
          <Button onClick={() => navigate("/")}>بازگشت به صفحه اصلی</Button>
        </div>
      </div>
    );
  }

  if (user && (user as any).role !== 'caravan_leader') {
    return (
      <div className="bg-background min-h-screen">
        <Header />
        <div className="container pt-32 text-center max-w-md mx-auto">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="font-heading text-xl font-bold mb-3">دسترسی محدود</h2>
          <p className="text-muted-foreground text-sm mb-6">
            این بخش فقط برای مدیران کاروان است. ابتدا ثبت‌نام کنید.
          </p>
          <Button onClick={() => navigate("/leader/register")} className="rounded-xl">
            ثبت‌نام به عنوان مدیر کاروان
          </Button>
        </div>
      </div>
    );
  }

  const isApproved = (user as any)?.is_leader_approved;

  // Stats
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length;
  const totalRevenue = bookings.filter(b => b.is_paid).reduce((s, b) => s + b.total_price, 0);
  const totalPassengers = bookings.reduce((s, b) => s + b.passenger_count, 0);

  return (
    <div className="bg-background min-h-dvh">
      <Header />

      {/* Dashboard header */}
      <div className="bg-gradient-to-br from-primary to-primary/75 pt-20 pb-6 relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="p-dash" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <polygon points="30,4 33,21 48,16 36,27 48,38 33,33 30,50 27,33 12,38 24,27 12,16 27,21" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#p-dash)" />
        </svg>
        <div className="container relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/65 text-xs mb-1">داشبورد مدیر کاروان</p>
              <h1 className="font-heading text-2xl font-black text-white">
                خوش آمدید، {(user as any)?.full_name || "مدیر کاروان"}
              </h1>
              {!isApproved && (
                <span className="inline-flex items-center gap-1 text-xs bg-amber-400/20 text-amber-200 border border-amber-400/30 rounded-full px-3 py-1 mt-2">
                  <Clock className="h-3 w-3" />
                  در انتظار تأیید ادمین
                </span>
              )}
            </div>
            <Button
              onClick={() => navigate("/leader/add-caravan")}
              disabled={!isApproved}
              className="bg-white text-primary hover:bg-white/90 rounded-xl gap-2 font-bold shadow-lg"
            >
              <Plus className="h-4 w-4" />
              ثبت کاروان جدید
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-6 max-w-5xl mx-auto">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "کاروان‌ها", value: toPersian(caravans.length), icon: Bus, color: "text-primary bg-primary/10" },
            { label: "رزروها", value: toPersian(totalBookings), icon: CalendarCheck, color: "text-blue-600 bg-blue-50" },
            { label: "مسافران", value: toPersian(totalPassengers), icon: Users, color: "text-violet-600 bg-violet-50" },
            { label: "درآمد (تومان)", value: totalRevenue.toLocaleString("fa-IR"), icon: TrendingUp, color: "text-green-600 bg-green-50" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-lg text-foreground leading-none">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-2xl p-1.5 mb-5 w-fit">
          {[
            { key: "caravans", label: "کاروان‌های من", icon: Bus },
            { key: "bookings", label: "مسافران", icon: Users },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as "caravans" | "bookings")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* CARAVANS TAB */}
        <AnimatePresence mode="wait">
          {activeTab === "caravans" && (
            <motion.div key="caravans" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {loadingCaravans ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : caravans.length === 0 ? (
                <div className="bg-card rounded-2xl border border-border p-12 text-center">
                  <Bus className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-heading font-bold text-foreground mb-1">هنوز کاروانی ثبت نشده</p>
                  <p className="text-muted-foreground text-sm mb-5">اولین کاروان خود را ثبت کنید.</p>
                  {isApproved && (
                    <Button onClick={() => navigate("/leader/add-caravan")} className="rounded-xl">
                      <Plus className="h-4 w-4 ml-2" />
                      ثبت کاروان جدید
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {caravans.map((caravan, i) => {
                    const st = STATUS_MAP[caravan.status] || { label: caravan.status, color: "bg-gray-100 text-gray-700 border-gray-200" };
                    return (
                      <motion.div
                        key={caravan.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-heading font-bold text-foreground">{caravan.name}</h3>
                            <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${st.color}`}>
                              {st.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                            <span>{caravan.destination_display}</span>
                            <span>{caravan.departure_date}</span>
                            <span>{caravan.duration} روز</span>
                            <span>{caravan.transportation_display}</span>
                            <span>{toPersian(caravan.capacity - caravan.remaining_capacity)}/{toPersian(caravan.capacity)} نفر رزرو شده</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl text-xs gap-1"
                            onClick={() => setPhotoUploadCaravanId(caravan.id)}
                          >
                            <Image className="h-3.5 w-3.5" />
                            عکس
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl text-xs gap-1"
                            onClick={() => {
                              setActiveTab("bookings");
                              setSelectedCaravanId(caravan.id);
                            }}
                          >
                            <Users className="h-3.5 w-3.5" />
                            مسافران
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl text-xs gap-1"
                            onClick={() => navigate(`/caravan/${caravan.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            مشاهده
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* BOOKINGS TAB */}
          {activeTab === "bookings" && (
            <motion.div key="bookings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {selectedCaravanId && (
                    <button
                      onClick={() => setSelectedCaravanId(null)}
                      className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-lg"
                    >
                      <X className="h-3 w-3" />
                      پاک کردن فیلتر
                    </button>
                  )}
                  <select
                    value={selectedCaravanId || ""}
                    onChange={e => setSelectedCaravanId(e.target.value ? Number(e.target.value) : null)}
                    className="text-sm border border-border rounded-xl px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">همه کاروان‌ها</option>
                    {caravans.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <Button variant="outline" size="sm" onClick={exportCSV} className="rounded-xl gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  دانلود CSV
                </Button>
              </div>

              {loadingBookings ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : bookings.length === 0 ? (
                <div className="bg-card rounded-2xl border border-border p-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-heading font-bold text-foreground mb-1">هنوز رزروی ثبت نشده</p>
                  <p className="text-muted-foreground text-sm">پس از تأیید کاروان، زایرین می‌توانند رزرو کنند.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((booking, i) => {
                    const st = BOOKING_STATUS_MAP[booking.status] || { label: booking.status, color: "bg-gray-100 text-gray-800" };
                    return (
                      <motion.div
                        key={booking.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="bg-card border border-border rounded-2xl p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <span className="font-bold text-foreground">{booking.main_passenger_name}</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                                {st.label}
                              </span>
                              {booking.is_paid && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-semibold">
                                  پرداخت شده
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {booking.main_passenger_phone}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {toPersian(booking.passenger_count)} مسافر
                              </span>
                              <span className="flex items-center gap-1">
                                <Armchair className="h-3 w-3" />
                                صندلی: {(booking.selected_seats || []).join(", ") || "—"}
                              </span>
                              <span className="font-medium text-foreground">
                                {booking.total_price.toLocaleString("fa-IR")} تومان
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <ReviewLinkButton bookingId={booking.id} />
                            <button
                              onClick={() => setConfirmCancel(booking.id)}
                              disabled={booking.status === 'cancelled'}
                              className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="لغو رزرو"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cancel confirm dialog */}
      <AnimatePresence>
        {confirmCancel !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setConfirmCancel(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="font-heading font-bold text-lg text-foreground mb-2">لغو رزرو</h3>
              <p className="text-muted-foreground text-sm mb-5">آیا مطمئن هستید که می‌خواهید این رزرو را لغو کنید؟ این عمل قابل بازگشت نیست.</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setConfirmCancel(null)}>
                  انصراف
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 rounded-xl"
                  onClick={() => cancelBooking.mutate(confirmCancel!)}
                  disabled={cancelBooking.isPending}
                >
                  {cancelBooking.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "لغو رزرو"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Upload Modal */}
      <AnimatePresence>
        {photoUploadCaravanId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setPhotoUploadCaravanId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border shadow-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                  <Image className="h-5 w-5 text-primary" />
                  آپلود تصاویر کاروان
                </h3>
                <button onClick={() => setPhotoUploadCaravanId(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground/75 mb-1.5 block">دسته‌بندی تصویر</label>
                  <select
                    value={uploadCategory}
                    onChange={e => setUploadCategory(e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="accommodation">اقامتگاه</option>
                    <option value="transport">حمل‌ونقل (اتوبوس/هواپیما)</option>
                    <option value="shrine">حرم و اماکن مقدس</option>
                    <option value="general">عمومی</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground/75 mb-1.5 block">توضیح تصویر (اختیاری)</label>
                  <input
                    type="text"
                    value={uploadCaption}
                    onChange={e => setUploadCaption(e.target.value)}
                    placeholder="مثال: لابی هتل، داخل اتوبوس VIP..."
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground/75 mb-1.5 block">انتخاب تصاویر (چند عکس)</label>
                  <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-border rounded-xl py-6 px-4 cursor-pointer hover:border-primary/40 hover:bg-primary/3 transition-colors">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      {uploadFiles ? `${uploadFiles.length} فایل انتخاب شد` : "کلیک کنید یا فایل را اینجا بکشید"}
                    </span>
                    <span className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, WEBP — حداکثر ۵ مگابایت</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => setUploadFiles(e.target.files)}
                    />
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setPhotoUploadCaravanId(null)}>
                    انصراف
                  </Button>
                  <Button
                    onClick={handlePhotoUpload}
                    disabled={!uploadFiles || uploading}
                    className="flex-1 rounded-xl bg-primary"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                      <><Upload className="h-4 w-4 ml-2" />آپلود</>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

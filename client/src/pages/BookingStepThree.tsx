import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, CheckCircle2, Phone, MessageCircle, Bus, User } from "lucide-react";
import Header from "@/components/Header";
import BusSeatMap from "@/components/BusSeatMap";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { djangoURL } from "@/App";

interface Companion {
  firstName?: string;
  lastName?: string;
  name: string;
  nationalId: string;
  phone?: string;
}

interface Seat {
  number: number;
  isOccupied: boolean;
  isSelected: boolean;
  passengerName?: string | null;
}

interface SeatsResponse {
  seats: Seat[];
  busType: number;
  busCount: number;
  capacity: number;
  isGroundTransport: boolean;
  passengerCount: number;
}

interface BookingStepThreeProps {
  params: {
    bookingId: string;
  };
}

interface BookingStep3Data {
  specialRequests?: string;
  selectedSeats?: number[];
}

const DEFAULT_BUS_TYPE = 44;

/** تبدیل ارقام لاتین یک رشته به فارسی (برای تاریخ‌های ذخیره‌شده با ارقام لاتین) */
const toPersianText = (v?: string) =>
  (v || "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: "۱", label: "اطلاعات سرپرست" },
    { n: "۲", label: "همراهان" },
    { n: "۳", label: "تایید ثبت رزرو" },
  ];
  return (
    <div className="flex items-center gap-1 mt-5">
      {steps.map((s, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < current;
        const isActive = stepNum === current;
        return (
          <div key={i} className="flex items-center gap-1">
            <div className="flex items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                isActive ? "bg-primary text-white border-primary" :
                isDone ? "bg-primary/20 text-primary border-primary/40" :
                "bg-transparent text-muted-foreground/40 border-border"
              }`}>
                {isDone ? "✓" : s.n}
              </div>
              <span className={`text-xs hidden sm:block ${isActive ? "text-primary font-semibold" : isDone ? "text-primary/60" : "text-muted-foreground/40"}`}>
                {s.label}
              </span>
            </div>
            {i < 2 && <div className={`w-6 md:w-12 h-px mx-1 ${isDone ? "bg-primary/40" : "bg-border"}`} />}
          </div>
        );
      })}
    </div>
  );
}

export default function BookingStepThree({ params }: BookingStepThreeProps) {
  const bookingId = parseInt(params.bookingId);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [specialRequests, setSpecialRequests] = useState("");
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);

  const authHeader = { Authorization: localStorage.getItem("AUTH_TOKEN_KEY") || "" };

  const { data: booking, isLoading: isLoadingBooking } = useQuery({
    queryKey: ["booking3", bookingId],
    queryFn: async () => {
      const response = await fetch(djangoURL + `/api/bookings/${bookingId}`, { headers: authHeader });
      return response.json();
    },
  });

  const { data: caravan } = useQuery({
    queryKey: ["caravan3", booking?.caravan],
    queryFn: async () => {
      const response = await fetch(djangoURL + `/api/caravans/${booking?.caravan}`, { headers: authHeader });
      return response.json();
    },
    enabled: !!booking?.caravan,
  });

  const { data: seatData } = useQuery<SeatsResponse>({
    queryKey: ["seats3", bookingId],
    queryFn: async () => {
      const response = await fetch(djangoURL + `/api/bookings/${bookingId}/seats`, { headers: authHeader });
      return response.json();
    },
    enabled: !!bookingId,
    // صندلی‌ها ممکن است همزمان توسط زائر دیگری رزرو شوند
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });

  const seats: Seat[] = seatData?.seats ?? [];

  const saveStep3Mutation = useMutation({
    mutationFn: async (data: BookingStep3Data) => {
      const response = await fetch(djangoURL + `/api/bookings/${bookingId}/step3`, {
        method: "POST",
        headers: {
          Authorization: localStorage.getItem("AUTH_TOKEN_KEY") || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          special_requests: data.specialRequests || "",
          selected_seats: data.selectedSeats || [],
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.message || "خطا در ذخیره اطلاعات.");
      return json;
    },
    onError: (error: Error) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در ذخیره اطلاعات.",
        variant: "destructive",
      });
    },
  });

  const completeBookingMutation = useMutation({
    mutationFn: async () => {
      await saveStep3Mutation.mutateAsync({
        specialRequests,
        selectedSeats,
      });
      const response = await fetch(djangoURL + `/api/bookings/${bookingId}/complete`, {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ selected_seats: selectedSeats }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "خطا در تکمیل رزرو.");
      return data;
    },
    onSuccess: () => {
      navigate(`/booking/${bookingId}/success`);
    },
    onError: (error: Error) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در تکمیل رزرو.",
        variant: "destructive",
      });
    },
  });

  const handleSeatClick = (seatNumber: number) => {
    const seat = seats.find((s) => s.number === seatNumber);
    if (seat?.isOccupied) return;

    setSelectedSeats((prev) => {
      if (prev.includes(seatNumber)) {
        return prev.filter((s) => s !== seatNumber);
      }
      if (prev.length >= (booking?.passenger_count || 1)) {
        return prev;
      }
      return [...prev, seatNumber];
    });
  };

  const toPersian = (num: number) => {
    const d = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    return num.toString().replace(/\d/g, (x) => d[parseInt(x)]);
  };

  if (isLoadingBooking) {
    return (
      <div className="bg-background min-h-screen">
        <Header />
        <div className="container py-10 pt-32 flex flex-col items-center justify-center min-h-[50vh]">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
          <p className="text-muted-foreground">در حال بارگذاری اطلاعات رزرو...</p>
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

  const companions: Companion[] = Array.isArray(booking.companions) ? booking.companions : [];

  // سفر زمینی = اتوبوسی. قبلاً با رشته «زمینی» مقایسه می‌شد که هیچ‌وقت با مقدار
  // واقعی ('bus') برابر نمی‌شد؛ در نتیجه نقشه صندلی نمایش داده نمی‌شد و رزرو
  // بدون انتخاب صندلی ثبت می‌گردید.
  const isGroundTransport =
    seatData?.isGroundTransport ??
    booking?.caravan_is_ground_transport ??
    ["bus", "combined", "زمینی"].includes(
      caravan?.transportation_type || booking?.transportation_type || ""
    );

  const busType = seatData?.busType || caravan?.bus_type || DEFAULT_BUS_TYPE;
  const totalCapacity = seatData?.capacity || caravan?.capacity || busType;
  const seatsRequired = booking?.passenger_count || 1;
  const seatsMissing = Math.max(0, seatsRequired - selectedSeats.length);
  const canSubmit = !isGroundTransport || seatsMissing === 0;

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <div className="container py-12 pt-28">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <Button
            variant="ghost"
            size="sm"
            className="mb-5 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`/booking/${bookingId}/step2`)}
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            بازگشت به مرحله قبل
          </Button>
          <span className="inline-flex items-center gap-2 bg-primary/8 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
            فرایند رزرو کاروان
          </span>
          <h1 className="font-heading text-display-sm text-foreground">خلاصه اطلاعات رزرو</h1>
          <StepIndicator current={3} />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Caravan info */}
            {caravan && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 }}
                className="bg-card rounded-2xl p-7 border border-border shadow-card"
              >
                <h2 className="font-heading text-xl font-bold text-foreground mb-5 pb-4 border-b border-border">اطلاعات کاروان</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "نام کاروان", value: caravan.name },
                    { label: "تاریخ حرکت", value: toPersianText(caravan.departure_date) },
                    { label: "مدت سفر", value: `${toPersian(caravan.duration)} روز` },
                    // باید عنوان فارسی نمایش داده شود نه کلید انگلیسی (hotel)
                    { label: "نوع اقامتگاه", value: caravan.accommodation_display || caravan.accommodation_type },
                  ].map((item, i) => (
                    <div key={i}>
                      <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                      <p className="font-medium text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Passengers */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-card rounded-2xl p-7 border border-border shadow-card"
            >
              <h2 className="font-heading text-xl font-bold text-foreground mb-5 pb-4 border-b border-border">اطلاعات مسافرین</h2>

              <div className="mb-6">
                <h3 className="font-semibold text-base text-foreground mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  سرپرست
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-cream-100 rounded-xl p-4">
                  {[
                    { label: "نام", value: booking?.main_passenger_first_name || booking?.main_passenger_name },
                    { label: "نام خانوادگی", value: booking?.main_passenger_last_name || "—" },
                    { label: "کد ملی", value: booking?.main_passenger_id },
                    { label: "شماره موبایل", value: toPersianText(booking?.main_passenger_phone) || "—" },
                  ].map((item, i) => (
                    <div key={i}>
                      <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                      <p className="font-medium text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {companions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-base text-foreground mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                    همراهان ({toPersian(companions.length)} نفر)
                  </h3>
                  <div className="space-y-3">
                    {companions.map((companion, index) => (
                      <div key={index} className="bg-cream-100 rounded-xl p-4 border border-border">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">نام</p>
                            <p className="font-medium text-foreground text-sm">{companion.firstName || companion.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">نام خانوادگی</p>
                            <p className="font-medium text-foreground text-sm">{companion.lastName || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">کد ملی</p>
                            <p className="font-medium text-foreground text-sm">{companion.nationalId}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">شماره موبایل</p>
                            <p className="font-medium text-foreground text-sm">
                              {toPersianText(companion.phone) || "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Seat selector — ground transport only */}
            {isGroundTransport && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-card rounded-2xl p-7 border border-border shadow-card"
              >
                <div className="mb-5 pb-4 border-b border-border">
                  <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
                    <Bus className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    انتخاب صندلی *
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    این کاروان با {caravan?.bus_type_display || `اتوبوس ${toPersian(busType)} نفره`} حرکت می‌کند.
                    برای هر مسافر یک صندلی انتخاب کنید.
                  </p>
                </div>

                {seatsMissing > 0 && (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    هنوز {toPersian(seatsMissing)} صندلی انتخاب نشده است. تا انتخاب همه صندلی‌ها امکان ثبت نهایی وجود ندارد.
                  </div>
                )}

                <BusSeatMap
                  totalCapacity={totalCapacity}
                  busType={busType}
                  occupiedSeats={seats.filter(s => s.isOccupied).map(s => s.number)}
                  selectedSeats={selectedSeats}
                  maxSelectable={seatsRequired}
                  onToggle={handleSeatClick}
                />
              </motion.div>
            )}

            {/* Special requests */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="bg-card rounded-2xl p-7 border border-border shadow-card"
            >
              <h2 className="font-heading text-xl font-bold text-foreground mb-4 pb-4 border-b border-border">درخواست‌های ویژه</h2>
              <Textarea
                placeholder="در صورت نیاز به توضیحات بیشتر یا درخواست‌های ویژه، اینجا بنویسید..."
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                className="h-28 rounded-xl"
              />
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex justify-between"
            >
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => navigate(`/booking/${bookingId}/step2`)}
              >
                بازگشت به مرحله قبل
              </Button>

              <Button
                onClick={() => completeBookingMutation.mutate()}
                disabled={completeBookingMutation.isPending || saveStep3Mutation.isPending || !canSubmit}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-emerald-sm px-6"
              >
                {completeBookingMutation.isPending || saveStep3Mutation.isPending ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    در حال ثبت...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="ml-2 h-4 w-4" />
                    تایید ثبت رزرو
                  </>
                )}
              </Button>
            </motion.div>
          </div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-card rounded-2xl p-7 border border-border shadow-card sticky top-24 space-y-4">
              <h2 className="font-heading text-xl font-bold text-foreground pb-4 border-b border-border flex items-center gap-2">
                <div className="w-1.5 h-5 bg-gradient-to-b from-primary to-gold-500 rounded-full" />
                اطلاعات تکمیلی
              </h2>

              {/* Price summary */}
              <div className="bg-primary/8 border border-primary/15 rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">مبلغ قابل پرداخت</p>
                <p className="font-heading text-2xl font-bold text-primary">
                  {new Intl.NumberFormat("fa-IR").format(booking?.total_price || 0)}
                  <span className="text-sm font-normal mr-1">تومان</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">{booking?.passenger_count} نفر</p>
              </div>

              {(booking?.caravan_leader_phone || caravan?.contact_phone) && (
                <div className="bg-primary/8 border border-primary/15 rounded-xl p-4">
                  <h3 className="font-semibold text-primary text-sm mb-2 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    مسئول کاروان
                  </h3>
                  {(booking?.caravan_leader_name || caravan?.manager) && (
                    <p className="text-primary/80 text-xs mb-1">{booking?.caravan_leader_name || caravan?.manager}</p>
                  )}
                  <p className="font-bold text-primary text-sm">
                    {booking?.caravan_leader_phone || caravan?.contact_phone}
                  </p>
                </div>
              )}

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <h3 className="font-semibold text-emerald-700 text-sm mb-2 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  لینک پرداخت
                </h3>
                <p className="text-emerald-600 text-xs">
                  لینک پرداخت پس از تأیید نهایی شما ارسال می‌شود.
                </p>
              </div>

              <div className="bg-gold-50 border border-gold-200 rounded-xl p-4">
                <h3 className="font-semibold text-gold-700 text-sm mb-2">نکات مهم</h3>
                <ul className="text-gold-600 text-xs space-y-1">
                  <li>• تمام اطلاعات را با دقت بررسی کنید.</li>
                  <li>• پس از تایید، امکان ویرایش وجود ندارد.</li>
                  {isGroundTransport && <li>• انتخاب صندلی برای سفرهای زمینی الزامی است.</li>}
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth";
import { AuthModal } from "@/components/auth";
import { Loader2, ArrowRight, Bus, User, Users, CheckCircle2 } from "lucide-react";
import Header from "@/components/Header";
import BusSeatMap from "@/components/BusSeatMap";
import { motion } from "framer-motion";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { djangoURL } from "@/App";
// ارقام فارسی و انگلیسی هر دو پذیرفته می‌شوند (نرمال‌سازی در ابزار مشترک)
import { toLatinDigits, toPersianDigits } from "@/lib/digits";
import { transportLabel } from "@/lib/caravan";
export { toLatinDigits, toPersianDigits };

export const nationalIdSchema = z
  .string()
  .min(1, { message: "کد ملی الزامی است" })
  .transform(toLatinDigits)
  .refine(v => /^\d{10}$/.test(v), { message: "کد ملی باید دقیقاً ۱۰ رقم باشد" });

export const phoneSchema = z
  .string()
  .min(1, { message: "شماره موبایل الزامی است" })
  .transform(toLatinDigits)
  .refine(v => /^09\d{9}$/.test(v), { message: "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود" });

const optionalPhoneSchema = z
  .string()
  .transform(toLatinDigits)
  .refine(v => v === "" || /^09\d{9}$/.test(v), { message: "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود" })
  .optional();

const companionSchema = z.object({
  firstName: z.string().trim().min(2, { message: "نام الزامی است" }),
  lastName: z.string().trim().min(2, { message: "نام خانوادگی الزامی است" }),
  nationalId: nationalIdSchema,
  phone: optionalPhoneSchema,
});

/**
 * رزرو در یک صفحه: سرپرست، همراهان و صندلی همه همین‌جا.
 * مرحله‌بندی و صفحه‌ی جداگانه‌ی «تایید ثبت رزرو» حذف شده‌اند؛ زدن کد پیامک
 * یعنی رزرو ثبت شد و زائر مستقیم به صفحه‌ی موفقیت می‌رود.
 */
const bookingSchema = z.object({
  caravanId: z.coerce.number(),
  passengerCount: z.coerce.number().min(1).max(10),
  firstName: z.string().trim().min(2, { message: "نام الزامی است" }),
  lastName: z.string().trim().min(2, { message: "نام خانوادگی الزامی است" }),
  nationalId: nationalIdSchema,
  phone: phoneSchema,
  companions: z.array(companionSchema),
  specialRequests: z.string().optional(),
  infoConfirmed: z.boolean().refine(val => val === true, {
    message: "تأیید صحت اطلاعات الزامی است",
  }),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

interface BookingStepOneProps {
  params: { caravanId: string };
}

interface Caravan {
  id: number;
  name: string;
  departure_date: string;
  duration: number;
  transportation_type: string;
  transportation_display?: string;
  train_type?: string;
  train_type_display?: string;
  price: number;
  capacity: number;
  remaining_capacity: number;
  accommodation_type: string;
  accommodation_display?: string;
  is_ground_transport?: boolean;
  bus_type?: number;
  bus_type_display?: string;
}

interface CaravanSeats {
  seats: { number: number; isOccupied: boolean }[];
  busType: number;
  capacity: number;
  isGroundTransport: boolean;
}

const DEFAULT_BUS_TYPE = 44;

const authHeaders = () => ({
  Authorization: localStorage.getItem("AUTH_TOKEN_KEY") || "",
  "Content-Type": "application/json",
});

async function postJson(path: string, body: unknown, fallbackMessage: string) {
  const response = await fetch(djangoURL + path, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const firstFieldError = Object.values(data).find(v => Array.isArray(v) && typeof v[0] === "string") as
      | string[]
      | undefined;
    throw new Error(data.message || firstFieldError?.[0] || fallbackMessage);
  }
  return data;
}

function SectionCard({
  title,
  icon,
  description,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-2xl p-6 sm:p-7 border border-border shadow-card">
      <h2 className="font-heading text-xl font-bold text-foreground mb-2 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {description && (
        <p className="text-muted-foreground text-sm mb-5 pb-4 border-b border-border">{description}</p>
      )}
      {!description && <div className="mb-5 pb-4 border-b border-border" />}
      {children}
    </div>
  );
}

export default function BookingStepOne({ params }: BookingStepOneProps) {
  const caravanId = parseInt(params.caravanId);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [seatError, setSeatError] = useState<string | null>(null);
  /** مقادیر فرم که منتظر تأیید شماره موبایل مانده‌اند */
  const pendingSubmit = useRef<BookingFormValues | null>(null);

  const { data: caravan, isLoading: isLoadingCaravan } = useQuery<Caravan>({
    queryKey: ['/api/caravans', caravanId],
    queryFn: async () => {
      const response = await apiRequest("GET", djangoURL + `/api/caravans/${caravanId}`);
      return response.json();
    },
    enabled: !isNaN(caravanId),
  });

  const { data: seatData } = useQuery<CaravanSeats>({
    queryKey: ['/api/caravans/seats', caravanId],
    queryFn: async () => {
      const response = await fetch(djangoURL + `/api/caravans/${caravanId}/seats`);
      if (!response.ok) throw new Error("خطا در دریافت نقشه صندلی");
      return response.json();
    },
    enabled: !isNaN(caravanId),
    // صندلی‌ها ممکن است همزمان توسط زائر دیگری رزرو شوند
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      caravanId,
      passengerCount: 1,
      firstName: "",
      lastName: "",
      nationalId: "",
      // شماره حساب کاربری به‌عنوان پیش‌فرض؛ کاربر می‌تواند تغییرش دهد
      phone: user?.phone || "",
      companions: [],
      specialRequests: "",
      infoConfirmed: false,
    },
  });

  const { fields, replace } = useFieldArray({ control: form.control, name: "companions" });
  const passengerCount = form.watch("passengerCount");

  // اطلاعات کاربر ممکن است بعد از ساخت فرم برسد
  useEffect(() => {
    if (user?.phone && !form.getFieldState("phone").isDirty && !form.getValues("phone")) {
      form.setValue("phone", user.phone);
    }
  }, [user?.phone, form]);

  /** تعداد فرم‌های همراه همیشه برابر «تعداد مسافر منهای سرپرست» است */
  useEffect(() => {
    const needed = Math.max(0, Number(passengerCount || 1) - 1);
    const current = form.getValues("companions") || [];
    if (current.length === needed) return;
    const next = Array.from({ length: needed }, (_, i) =>
      current[i] ?? { firstName: "", lastName: "", nationalId: "", phone: "" }
    );
    replace(next);
  }, [passengerCount, replace, form]);

  const isGroundTransport =
    seatData?.isGroundTransport ?? caravan?.is_ground_transport ??
    ["bus", "combined"].includes(caravan?.transportation_type || "");
  const busType = seatData?.busType || caravan?.bus_type || DEFAULT_BUS_TYPE;
  const totalCapacity = seatData?.capacity || caravan?.capacity || busType;
  const occupiedSeats = useMemo(
    () => (seatData?.seats || []).filter(s => s.isOccupied).map(s => s.number),
    [seatData]
  );
  const seatsMissing = Math.max(0, Number(passengerCount || 1) - selectedSeats.length);

  // کم‌شدن تعداد مسافر نباید صندلی اضافه را نگه دارد
  useEffect(() => {
    setSelectedSeats(prev => prev.slice(0, Number(passengerCount || 1)));
  }, [passengerCount]);

  const handleSeatClick = (seatNumber: number) => {
    if (occupiedSeats.includes(seatNumber)) return;
    setSeatError(null);
    setSelectedSeats(prev =>
      prev.includes(seatNumber)
        ? prev.filter(s => s !== seatNumber)
        : prev.length >= Number(passengerCount || 1)
          ? prev
          : [...prev, seatNumber]
    );
  };

  /**
   * یک رفت‌وبرگشت کامل: ساخت رزرو، ثبت همراهان، ثبت صندلی و نهایی‌کردن.
   * از دید زائر فقط یک دکمه است و پایانش صفحه‌ی «رزرو ثبت شد».
   */
  const submitBooking = useMutation({
    mutationFn: async (data: BookingFormValues) => {
      const created = await postJson(
        "/api/bookings/step1",
        {
          caravan_id: data.caravanId,
          passenger_count: data.passengerCount,
          first_name: data.firstName,
          last_name: data.lastName,
          main_passenger_id: data.nationalId,
          main_passenger_phone: data.phone,
        },
        "خطا در ثبت اطلاعات سرپرست"
      );

      const bookingId = created.bookingId;

      for (const companion of data.companions) {
        await postJson(
          `/api/bookings/${bookingId}/companions`,
          {
            first_name: companion.firstName,
            last_name: companion.lastName,
            national_id: companion.nationalId,
            phone: companion.phone || "",
          },
          "خطا در ثبت اطلاعات همراه"
        );
      }

      await postJson(
        `/api/bookings/${bookingId}/step3`,
        { special_requests: data.specialRequests || "", selected_seats: selectedSeats },
        "خطا در ثبت صندلی"
      );

      await postJson(
        `/api/bookings/${bookingId}/complete`,
        { selected_seats: selectedSeats },
        "خطا در تکمیل رزرو"
      );

      return bookingId as number;
    },
    onSuccess: (bookingId) => {
      navigate(`/booking/${bookingId}/success`);
    },
    onError: (error: Error) => {
      toast({ title: "خطا", description: error.message, variant: "destructive" });
    },
  });

  const startSubmit = (data: BookingFormValues) => {
    if (isGroundTransport && seatsMissing > 0) {
      setSeatError(`برای هر مسافر یک صندلی انتخاب کنید — ${toPersianDigits(seatsMissing)} صندلی باقی مانده است.`);
      document.getElementById("seat-map")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!isAuthenticated) {
      // کد پیامک همین‌جا گرفته می‌شود و بعد از تأیید، رزرو خودش ثبت می‌شود؛
      // زائر لازم نیست دوباره دکمه را بزند.
      pendingSubmit.current = data;
      setShowAuthModal(true);
      return;
    }
    submitBooking.mutate(data);
  };

  const handleLoginSuccess = () => {
    setShowAuthModal(false);
    const data = pendingSubmit.current;
    pendingSubmit.current = null;
    if (data) submitBooking.mutate(data);
  };

  if (isLoadingCaravan) {
    return (
      <div className="bg-background min-h-screen">
        <Header solid />
        <div className="container py-10 pt-32 flex flex-col items-center justify-center min-h-[50vh]">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
          <p className="text-muted-foreground">در حال بارگذاری اطلاعات کاروان...</p>
        </div>
      </div>
    );
  }

  if (!caravan) {
    return (
      <div className="bg-background min-h-screen">
        <Header solid />
        <div className="container py-10 pt-32 text-center">
          <h2 className="font-heading text-2xl font-bold text-foreground mb-4">کاروان یافت نشد</h2>
          <Button variant="outline" onClick={() => navigate("/")}>بازگشت به صفحه اصلی</Button>
        </div>
      </div>
    );
  }

  const isSubmitting = submitBooking.isPending;

  return (
    <div className="bg-background min-h-screen">
      <Header solid />
      <div className="container py-12 pt-28 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
          <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground hover:text-foreground" onClick={() => navigate(`/caravan/${caravanId}`)}>
            <ArrowRight className="ml-2 h-4 w-4" />
            بازگشت به صفحه کاروان
          </Button>
          <h1 className="font-heading text-display-sm text-foreground">ثبت‌نام و رزرو</h1>
          <p className="text-muted-foreground text-sm mt-2">
            {caravan.name} — {toPersianDigits(caravan.departure_date)} — {transportLabel(caravan)}
          </p>
        </motion.div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(startSubmit)} className="space-y-5">
            {/* سرپرست */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}>
              <SectionCard
                title="اطلاعات سرپرست"
                icon={<User className="h-5 w-5 text-primary" strokeWidth={1.5} />}
                description="فقط نام، نام خانوادگی، کد ملی و شماره موبایل لازم است."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>نام *</FormLabel>
                      <FormControl><Input className="rounded-xl" autoComplete="given-name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>نام خانوادگی *</FormLabel>
                      <FormControl><Input className="rounded-xl" autoComplete="family-name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="nationalId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>کد ملی *</FormLabel>
                      <FormControl>
                        <Input
                          className="rounded-xl"
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="۱۰ رقم"
                          {...field}
                          onChange={(e) => field.onChange(toLatinDigits(e.target.value).replace(/\D/g, ""))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>شماره موبایل *</FormLabel>
                      <FormControl>
                        <Input
                          className="rounded-xl"
                          type="tel"
                          inputMode="numeric"
                          maxLength={11}
                          placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                          autoComplete="tel"
                          {...field}
                          onChange={(e) => field.onChange(toLatinDigits(e.target.value).replace(/\D/g, ""))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="passengerCount" render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>تعداد مسافر *</FormLabel>
                    <Select onValueChange={field.onChange} value={String(field.value)}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from(
                          { length: Math.max(1, Math.min(10, caravan.remaining_capacity || 10)) },
                          (_, i) => i + 1
                        ).map(n => (
                          <SelectItem key={n} value={String(n)}>
                            {toPersianDigits(n)} نفر {n === 1 ? "(فقط خودم)" : `(خودم + ${toPersianDigits(n - 1)} همراه)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </SectionCard>
            </motion.div>

            {/* همراهان — فقط وقتی بیش از یک نفر است */}
            {fields.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <SectionCard
                  title={`همراهان (${toPersianDigits(fields.length)} نفر)`}
                  icon={<Users className="h-5 w-5 text-primary" strokeWidth={1.5} />}
                  description="برای هر همراه نام، نام خانوادگی و کد ملی لازم است. شماره موبایل اختیاری است."
                >
                  <div className="space-y-5">
                    {fields.map((item, index) => (
                      <div key={item.id} className="bg-cream-100 rounded-xl p-4 border border-border">
                        <p className="font-semibold text-sm text-foreground mb-3">همراه {toPersianDigits(index + 1)}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField control={form.control} name={`companions.${index}.firstName`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>نام *</FormLabel>
                              <FormControl><Input className="rounded-xl bg-card" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name={`companions.${index}.lastName`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>نام خانوادگی *</FormLabel>
                              <FormControl><Input className="rounded-xl bg-card" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name={`companions.${index}.nationalId`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>کد ملی *</FormLabel>
                              <FormControl>
                                <Input
                                  className="rounded-xl bg-card"
                                  inputMode="numeric"
                                  maxLength={10}
                                  placeholder="۱۰ رقم"
                                  {...field}
                                  onChange={(e) => field.onChange(toLatinDigits(e.target.value).replace(/\D/g, ""))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name={`companions.${index}.phone`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>شماره موبایل</FormLabel>
                              <FormControl>
                                <Input
                                  className="rounded-xl bg-card"
                                  type="tel"
                                  inputMode="numeric"
                                  maxLength={11}
                                  placeholder="اختیاری"
                                  {...field}
                                  onChange={(e) => field.onChange(toLatinDigits(e.target.value).replace(/\D/g, ""))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* صندلی — فقط سفر زمینی */}
            {isGroundTransport && (
              <motion.div id="seat-map" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <SectionCard
                  title="انتخاب صندلی"
                  icon={<Bus className="h-5 w-5 text-primary" strokeWidth={1.5} />}
                  description={`این کاروان با ${caravan.bus_type_display || `اتوبوس ${toPersianDigits(busType)} نفره`} حرکت می‌کند. برای هر مسافر یک صندلی انتخاب کنید.`}
                >
                  {seatError && (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                      {seatError}
                    </div>
                  )}
                  {!seatError && seatsMissing > 0 && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      هنوز {toPersianDigits(seatsMissing)} صندلی انتخاب نشده است.
                    </div>
                  )}
                  <BusSeatMap
                    totalCapacity={totalCapacity}
                    busType={busType}
                    occupiedSeats={occupiedSeats}
                    selectedSeats={selectedSeats}
                    maxSelectable={Number(passengerCount || 1)}
                    onToggle={handleSeatClick}
                  />
                </SectionCard>
              </motion.div>
            )}

            {/* درخواست ویژه + تأیید + ثبت */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
              <SectionCard title="ثبت نهایی" icon={<CheckCircle2 className="h-5 w-5 text-primary" strokeWidth={1.5} />}>
                <FormField control={form.control} name="specialRequests" render={({ field }) => (
                  <FormItem className="mb-5">
                    <FormLabel>درخواست ویژه (اختیاری)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="اگر درخواست خاصی دارید اینجا بنویسید..."
                        className="h-24 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )} />

                <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-5">
                  <div className="flex items-baseline justify-between text-sm mb-1">
                    <span className="text-muted-foreground">مبلغ کل</span>
                    <span className="font-heading text-xl font-bold text-primary">
                      {new Intl.NumberFormat("fa-IR").format((caravan.price || 0) * Number(passengerCount || 1))}
                      <span className="text-sm font-normal mr-1">تومان</span>
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {toPersianDigits(passengerCount || 1)} نفر × {new Intl.NumberFormat("fa-IR").format(caravan.price || 0)} تومان
                  </p>
                </div>

                <FormField control={form.control} name="infoConfirmed" render={({ field }) => (
                  <FormItem className="flex items-start gap-3 mb-5">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-primary data-[state=checked]:bg-primary mt-0.5"
                      />
                    </FormControl>
                    <div>
                      <FormLabel className="font-normal text-sm cursor-pointer">
                        صحت اطلاعات وارد شده را تایید می‌کنم
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )} />

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12 font-bold text-base"
                >
                  {isSubmitting ? (
                    <><Loader2 className="ml-2 h-4 w-4 animate-spin" />در حال ثبت رزرو...</>
                  ) : (
                    <>ثبت‌نام و رزرو</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  برای ثبت رزرو، یک کد تأیید به شماره موبایل شما پیامک می‌شود.
                </p>
              </SectionCard>
            </motion.div>
          </form>
        </Form>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {
            pendingSubmit.current = null;
            setShowAuthModal(false);
          }}
          title="تأیید شماره موبایل"
          description="کد پیامک‌شده را وارد کنید؛ رزرو شما بلافاصله ثبت می‌شود."
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    </div>
  );
}

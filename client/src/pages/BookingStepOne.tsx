import { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth";
import { AuthModal } from "@/components/auth";
import { Loader2, ArrowRight, Calendar, Users, Car, MapPin, ChevronLeft } from "lucide-react";
import Header from "@/components/Header";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { djangoURL } from "@/App";
// ارقام فارسی و انگلیسی هر دو پذیرفته می‌شوند (نرمال‌سازی در ابزار مشترک)
import { toLatinDigits, toPersianDigits } from "@/lib/digits";
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

/** ثبت‌نام ساده: نام، نام خانوادگی، کد ملی و شماره موبایل — برای همه‌ی سفرها یکسان */
const bookingStep1Schema = z.object({
  caravanId: z.coerce.number(),
  passengerCount: z.coerce.number().min(1).max(10),
  firstName: z.string().trim().min(2, { message: "نام الزامی است" }),
  lastName: z.string().trim().min(2, { message: "نام خانوادگی الزامی است" }),
  nationalId: nationalIdSchema,
  phone: phoneSchema,
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "پذیرش قوانین و مقررات الزامی است",
  }),
});

type BookingStep1FormValues = z.infer<typeof bookingStep1Schema>;

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
  price: number;
  capacity: number;
  remaining_capacity: number;
  accommodation_type: string;
  accommodation_display?: string;
  accommodation_distance: number;
  manager: string;
  description?: string;
  is_international?: boolean;
  is_ground_transport?: boolean;
  bus_type?: number;
  bus_type_display?: string;
  destination?: string;
  leader_name?: string;
  leader_phone?: string;
}

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
              <span className={`text-xs hidden sm:block ${isActive ? "text-primary font-semibold" : "text-muted-foreground/40"}`}>
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

export default function BookingStepOne({ params }: BookingStepOneProps) {
  const caravanId = parseInt(params.caravanId);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { data: caravan, isLoading: isLoadingCaravan } = useQuery<Caravan>({
    queryKey: ['/api/caravans', caravanId],
    queryFn: async () => {
      const response = await apiRequest("GET", djangoURL + `/api/caravans/${caravanId}`);
      return response.json();
    },
    enabled: !isNaN(caravanId),
  });

  const isInternational = caravan?.is_international ?? false;

  const form = useForm<BookingStep1FormValues>({
    resolver: zodResolver(bookingStep1Schema),
    defaultValues: {
      caravanId,
      passengerCount: 1,
      firstName: "",
      lastName: "",
      nationalId: "",
      // شماره حساب کاربری به‌عنوان پیش‌فرض؛ کاربر می‌تواند تغییرش دهد
      phone: user?.phone || "",
      termsAccepted: false,
    },
  });

  // اطلاعات کاربر ممکن است بعد از ساخت فرم برسد؛ اگر کاربر هنوز شماره‌ای وارد
  // نکرده، شماره حساب کاربری‌اش را پیش‌فرض بگذار.
  useEffect(() => {
    if (user?.phone && !form.getFieldState("phone").isDirty && !form.getValues("phone")) {
      form.setValue("phone", user.phone);
    }
  }, [user?.phone, form]);

  const bookingStep1Mutation = useMutation({
    mutationFn: async (data: BookingStep1FormValues) => {
      const response = await fetch(djangoURL + "/api/bookings/step1", {
        method: "POST",
        headers: {
          Authorization: localStorage.getItem("AUTH_TOKEN_KEY") || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caravan_id: data.caravanId,
          passenger_count: data.passengerCount,
          first_name: data.firstName,
          last_name: data.lastName,
          main_passenger_id: data.nationalId,
          main_passenger_phone: data.phone,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          err.message ||
          err.main_passenger_id?.[0] ||
          err.main_passenger_phone?.[0] ||
          err.first_name?.[0] ||
          err.last_name?.[0] ||
          "خطا در ثبت اطلاعات"
        );
      }
      return response.json();
    },
    onSuccess: (data) => {
      navigate(`/booking/${data.bookingId}/step2`);
    },
    onError: (error: Error) => {
      toast({ title: "خطا", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: BookingStep1FormValues) => {
    if (!isAuthenticated) { setShowAuthModal(true); return; }
    bookingStep1Mutation.mutate(data);
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

  return (
    <div className="bg-background min-h-screen">
      <Header solid />
      <div className="container py-12 pt-28">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-10">
          <Button variant="ghost" size="sm" className="mb-5 text-muted-foreground hover:text-foreground" onClick={() => navigate(`/caravan/${caravanId}`)}>
            <ArrowRight className="ml-2 h-4 w-4" />
            بازگشت به صفحه کاروان
          </Button>
          <span className="inline-flex items-center gap-2 bg-primary/8 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
            فرایند رزرو کاروان
          </span>
          <h1 className="font-heading text-display-sm text-foreground">رزرو کاروان</h1>
          <StepIndicator current={1} />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="md:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="bg-card rounded-2xl p-7 border border-border shadow-card">
                  <h2 className="font-heading text-xl font-bold text-foreground mb-2">اطلاعات سرپرست</h2>
                  <p className="text-muted-foreground text-sm mb-6 pb-4 border-b border-border">
                    ثبت‌نام ساده است؛ فقط نام، نام خانوادگی، کد ملی و شماره موبایل لازم است.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                            dir="ltr"
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

                  {/* Passenger count */}
                  <FormField control={form.control} name="passengerCount" render={({ field }) => (
                    <FormItem className="mb-6">
                      <FormLabel className="text-base font-semibold">تعداد مسافرین *</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} defaultValue={String(field.value)}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl mt-1">
                            <SelectValue />
                          </SelectTrigger>
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

                  {/* Terms */}
                  <div className="bg-cream-100 border border-border rounded-xl p-6">
                    <h3 className="font-heading font-bold text-lg text-foreground mb-4">شرایط و قوانین رزرو</h3>
                    <ul className="text-muted-foreground text-sm space-y-3 mb-6">
                      {[
                        isInternational
                          ? "داشتن پاسپورت معتبر با حداقل ۶ ماه اعتبار برای سفرهای خارجی الزامی است."
                          : "همراه داشتن شناسنامه و کارت ملی معتبر الزامی است.",
                        "در صورت انصراف تا ۱۴ روز قبل از سفر، ۸۰٪ مبلغ عودت داده می‌شود.",
                        "مسئولیت صحت اطلاعات وارد شده به عهده مسافر است.",
                        "رعایت کلیه قوانین و مقررات مقصد الزامی است.",
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <FormField control={form.control} name="termsAccepted" render={({ field }) => (
                      <FormItem className="flex items-start gap-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="border-primary data-[state=checked]:bg-primary mt-0.5"
                          />
                        </FormControl>
                        <div>
                          <FormLabel className="font-normal text-sm cursor-pointer">شرایط و قوانین رزرو را مطالعه کرده و می‌پذیرم</FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )} />
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => navigate("/")} className="rounded-xl">انصراف</Button>
                  <Button type="submit" disabled={bookingStep1Mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-emerald-sm px-6">
                    {bookingStep1Mutation.isPending ? (
                      <><Loader2 className="ml-2 h-4 w-4 animate-spin" />در حال ثبت...</>
                    ) : (
                      <>ادامه و ثبت اطلاعات مسافرین<ChevronLeft className="mr-2 h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </motion.div>

          {/* Sidebar */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <div className="bg-card rounded-2xl p-7 border border-border shadow-card sticky top-24">
              <h2 className="font-heading text-xl font-bold text-foreground mb-6 pb-4 border-b border-border flex items-center gap-2">
                <div className="w-1.5 h-5 bg-gradient-to-b from-primary to-gold-500 rounded-full" />
                اطلاعات کاروان
              </h2>
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <Calendar className="h-6 w-6 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-foreground">{caravan.name}</h3>
                    <p className="text-muted-foreground text-sm mt-0.5">
                      تاریخ حرکت: {toPersianDigits(caravan.departure_date)} — {toPersianDigits(caravan.duration)} روزه
                    </p>
                  </div>
                </div>

                <div className="grid gap-2.5 bg-cream-100 rounded-xl p-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Car className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-foreground/80 text-sm">
                      {caravan.transportation_display || caravan.transportation_type}
                      {caravan.is_ground_transport && caravan.bus_type
                        ? ` — ${caravan.bus_type_display || `${toPersianDigits(caravan.bus_type)} نفره`}`
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-foreground/80 text-sm">
                      {caravan.accommodation_display || caravan.accommodation_type} — {toPersianDigits(caravan.accommodation_distance)} متر تا حرم
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Users className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-foreground/80 text-sm">ظرفیت باقیمانده: {toPersianDigits(caravan.remaining_capacity)} نفر</span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center bg-primary/8 border border-primary/15 rounded-xl p-6">
                  <p className="text-muted-foreground text-xs mb-2">هزینه سفر برای هر نفر</p>
                  <p className="font-heading text-2xl font-bold text-primary">
                    {new Intl.NumberFormat('fa-IR').format(caravan.price)}
                    <span className="text-base font-normal mr-1">تومان</span>
                  </p>
                </div>

                {isInternational && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-amber-700 text-xs font-semibold mb-1">سفر بین‌المللی</p>
                    <p className="text-amber-600 text-xs">داشتن پاسپورت با حداقل ۶ ماه اعتبار الزامی است.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          title="ورود به حساب کاربری"
          description="برای ادامه فرایند رزرو، لطفا وارد حساب کاربری خود شوید."
        />
      </div>
    </div>
  );
}

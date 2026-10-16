import { useEffect, useState } from "react";
import { toPersianDigits } from "@/lib/digits";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { djangoURL } from "@/App";
import { authFetch } from "@/lib/auth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PersianDatePicker, jalaliToISO, isoToJalali } from "@/components/ui/date-time-picker";
import { Loader2, Plus, Trash2, ArrowRight, CheckCircle2, Bus, AlertTriangle } from "lucide-react";

const MESSAGING_APPS = [
  { id: "whatsapp", label: "واتساپ" },
  { id: "bale", label: "بله" },
  { id: "eitaa", label: "ایتا" },
];

const schema = z.object({
  name: z.string().min(3, "نام کاروان الزامی است"),
  destination: z.enum(["mashhad", "karbala", "hajj_umrah", "qom_jamkaran"]),
  description: z.string().optional(),
  departure_date: z.string().min(5, "تاریخ حرکت الزامی است"),
  duration: z.coerce.number().min(3).max(9),
  // اختیاری: مدل این‌ها را خالی می‌پذیرد و کاروان‌های موجود خالی دارندشان.
  // اجباری‌بودنشان یعنی هیچ کاروان قدیمی‌ای قابل ویرایش نیست.
  start_date: z.string().optional().default(""),
  end_date: z.string().optional().default(""),
  transportation_type: z.enum(["bus", "train", "airplane", "combined"]),
  bus_type: z.coerce.number().refine(v => [25, 32, 44].includes(v), {
    message: "نوع اتوبوس را انتخاب کنید",
  }),
  origin_city: z.string().min(2, "مبدأ حرکت الزامی است"),
  transit_cities_str: z.string().optional(),
  accommodation_type: z.enum(["hotel", "hosseinieh", "apartment", "mixed"]),
  accommodation_name: z.string().optional(),
  accommodation_city: z.string().optional(),
  accommodation_distance: z.coerce.number().min(0).default(0),
  meal_breakfast: z.boolean().default(false),
  meal_lunch: z.boolean().default(false),
  meal_dinner: z.boolean().default(false),
  has_insurance: z.boolean().default(false),
  price: z.coerce.number().min(1, "قیمت الزامی است"),
  capacity: z.coerce.number().min(1).max(500),
  contact_phone: z.string().min(10, "شماره تماس الزامی است"),
  leader_messaging_apps: z.array(z.string()).default([]),
  rules: z.string().optional(),
  itinerary: z.array(z.object({
    day: z.coerce.number().min(1),
    title: z.string().min(2),
    description: z.string().optional(),
  })).default([]),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  /** وقتی از مسیر ویرایش می‌آید، شناسه‌ی کاروان اینجاست */
  params?: { caravanId?: string };
}

export default function CaravanLeaderAddCaravan({ params }: Props = {}) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [success, setSuccess] = useState(false);

  const caravanId = params?.caravanId ? Number(params.caravanId) : null;
  const isEdit = caravanId !== null && !Number.isNaN(caravanId);

  // در حالت ویرایش، مقادیر فعلی کاروان بارگذاری و در فرم نشانده می‌شوند
  const { data: existing, isLoading: isLoadingCaravan, isError: loadFailed } = useQuery({
    queryKey: ["leader-caravan", caravanId],
    queryFn: async () => {
      const res = await authFetch(`${djangoURL}/api/leader/caravans/${caravanId}`, {
        headers: {},
      });
      if (!res.ok) throw new Error("کاروان یافت نشد یا دسترسی ندارید.");
      return res.json();
    },
    enabled: isEdit,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      destination: "karbala",
      description: "",
      departure_date: "",
      duration: 5,
      start_date: "",
      end_date: "",
      transportation_type: "bus",
      bus_type: 44,
      origin_city: "",
      transit_cities_str: "",
      accommodation_type: "hotel",
      accommodation_name: "",
      accommodation_city: "",
      accommodation_distance: 0,
      meal_breakfast: false,
      meal_lunch: false,
      meal_dinner: false,
      has_insurance: false,
      price: 0,
      capacity: 40,
      contact_phone: "",
      leader_messaging_apps: [],
      rules: "",
      itinerary: [],
    },
  });

  useEffect(() => {
    if (!existing) return;
    form.reset({
      name: existing.name ?? "",
      destination: existing.destination ?? "karbala",
      description: existing.description ?? "",
      departure_date: existing.departure_date ?? "",
      duration: existing.duration ?? 5,
      // تاریخ‌های میلادی ذخیره‌شده دوباره به شمسی برمی‌گردند تا در تقویم درست بنشینند
      start_date: isoToJalali(existing.start_date) ?? "",
      end_date: isoToJalali(existing.end_date) ?? "",
      transportation_type: existing.transportation_type ?? "bus",
      bus_type: existing.bus_type ?? 44,
      origin_city: existing.origin_city ?? "",
      transit_cities_str: (existing.transit_cities ?? []).join("، "),
      accommodation_type: existing.accommodation_type ?? "hotel",
      accommodation_name: existing.accommodation_name ?? "",
      accommodation_city: existing.accommodation_city ?? "",
      accommodation_distance: existing.accommodation_distance ?? 0,
      meal_breakfast: !!existing.meal_breakfast,
      meal_lunch: !!existing.meal_lunch,
      meal_dinner: !!existing.meal_dinner,
      has_insurance: !!existing.has_insurance,
      price: existing.price ?? 0,
      capacity: existing.capacity ?? 40,
      contact_phone: existing.contact_phone ?? "",
      leader_messaging_apps: existing.leader_messaging_apps ?? [],
      rules: existing.rules ?? "",
      itinerary: existing.itinerary ?? [],
    });
  }, [existing, form]);

  const { fields: itinFields, append: addItinRow, remove: removeItinRow } = useFieldArray({
    control: form.control,
    name: "itinerary",
  });

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const transit_cities = (data.transit_cities_str || "")
        .split("،")
        .map(s => s.trim())
        .filter(Boolean);

      const payload: Record<string, unknown> = {
        ...data,
        transit_cities,
        // تاریخ‌های شمسی انتخاب‌شده برای ذخیره در سرور به میلادی تبدیل می‌شوند
        start_date: jalaliToISO(data.start_date) || null,
        end_date: jalaliToISO(data.end_date) || null,
      };
      delete payload.transit_cities_str;
      // ظرفیت باقیمانده را فقط موقع ساخت می‌فرستیم؛ هنگام ویرایش سرور خودش
      // آن را با توجه به رزروهای انجام‌شده حساب می‌کند.
      if (!isEdit) payload.remaining_capacity = data.capacity;

      const url = isEdit
        ? `${djangoURL}/api/leader/caravans/${caravanId}`
        : `${djangoURL}/api/leader/caravans`;

      const res = await authFetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
                  },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || (isEdit ? "خطا در ویرایش کاروان" : "خطا در ثبت کاروان"));
      }
      return res.json();
    },
    onSuccess: () => {
      // کوئری‌ها staleTime: Infinity دارند، پس لیست داشبورد تا بارگذاری کامل
      // صفحه کاروان تازه را نشان نمی‌داد. ویرایش هم کاروان را به «در انتظار
      // تأیید» برمی‌گرداند، یعنی از لیست و آمار عمومی بیرون می‌رود؛ آن‌ها هم
      // باید دوباره خوانده شوند.
      qc.invalidateQueries({ queryKey: ["leader-caravans"] });
      qc.invalidateQueries({ queryKey: ["/api/caravans"] });
      qc.invalidateQueries({ queryKey: ["caravan-stats"] });
      if (isEdit) qc.invalidateQueries({ queryKey: ["leader-caravan", caravanId] });
      setSuccess(true);
    },
    onError: (err: Error) => {
      toast({ title: isEdit ? "خطا در ویرایش کاروان" : "خطا در ثبت کاروان", description: err.message, variant: "destructive" });
    },
  });

  const duration = form.watch("duration");
  const transportationType = form.watch("transportation_type");
  const busType = form.watch("bus_type");
  const capacity = form.watch("capacity");
  const isGroundTransport = transportationType === "bus" || transportationType === "combined";
  const bookedSeats = existing ? (existing.capacity ?? 0) - (existing.remaining_capacity ?? 0) : 0;
  const busCount = busType ? Math.ceil((capacity || 0) / busType) : 0;

  if (isEdit && isLoadingCaravan) {
    return (
      <div className="bg-background min-h-screen">
        <Header solid />
        <div className="container py-24 pt-32 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
          <p className="text-muted-foreground">در حال بارگذاری اطلاعات کاروان...</p>
        </div>
      </div>
    );
  }

  if (isEdit && loadFailed) {
    return (
      <div className="bg-background min-h-screen">
        <Header solid />
        <div className="container max-w-md mx-auto py-24 pt-32 text-center">
          <h1 className="font-heading text-2xl font-bold mb-3">کاروان یافت نشد</h1>
          <p className="text-muted-foreground text-sm leading-6 mb-6">
            این کاروان وجود ندارد یا متعلق به شما نیست.
          </p>
          <Button className="rounded-xl" onClick={() => navigate("/leader/dashboard")}>بازگشت به داشبورد</Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-background min-h-screen">
        <Header solid />
        <div className="container max-w-lg mx-auto py-24 pt-32 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-3xl p-10 shadow-lg">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h1 className="font-heading text-2xl font-bold mb-3">
              {isEdit ? "تغییرات ثبت شد!" : "کاروان ثبت شد!"}
            </h1>
            <p className="text-muted-foreground text-sm leading-6 mb-6">
              {isEdit
                ? "تغییرات شما ذخیره شد. چون مشخصات کاروان عوض شده، دوباره برای تأیید ادمین ارسال شد و تا تأیید نهایی در فهرست عمومی نمایش داده نمی‌شود."
                : "کاروان شما ثبت شد و پس از بررسی و تأیید توسط ادمین، برای زایرین نمایش داده خواهد شد."}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => navigate("/leader/dashboard")}>
                داشبورد
              </Button>
              {!isEdit && (
                <Button className="flex-1 rounded-xl" onClick={() => { setSuccess(false); form.reset(); }}>
                  ثبت کاروان دیگر
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <Header solid />

      <div className="bg-gradient-to-br from-primary to-primary/70 pt-20 pb-6 relative overflow-hidden">
        <div className="container relative">
          <button onClick={() => navigate("/leader/dashboard")}
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 transition-colors">
            <ArrowRight className="h-4 w-4" />
            بازگشت به داشبورد
          </button>
          <h1 className="font-heading text-2xl font-black text-white">
            {isEdit ? `ویرایش کاروان${existing?.name ? `: ${existing.name}` : ""}` : "ثبت کاروان جدید"}
          </h1>
          <p className="text-white/70 text-sm mt-1">
            {isEdit
              ? "با ذخیره‌ی تغییرات، کاروان دوباره برای تأیید ادمین ارسال می‌شود."
              : "پس از ثبت، کاروان برای بررسی ادمین ارسال می‌شود."}
          </p>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto py-8">
        {isEdit && (
          <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-sm text-amber-800 leading-6">
              <p className="font-bold mb-1">بعد از ذخیره، کاروان دوباره بررسی می‌شود</p>
              <p>
                مشخصاتی که زائر بر اساس آن رزرو می‌کند بدون بازبینی عوض نمی‌شود؛ پس تا تأیید ادمین،
                این کاروان در فهرست عمومی دیده نمی‌شود.
                {bookedSeats > 0 && (
                  <> تا الان <b>{toPersianDigits(bookedSeats)} نفر</b> روی این کاروان رزرو کرده‌اند — ظرفیت را کمتر از این عدد نگذارید.</>
                )}
              </p>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-5">

            {/* Section: Core info */}
            <SectionCard title="اطلاعات اصلی کاروان" icon={<Bus className="h-5 w-5" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>نام کاروان *</FormLabel>
                    <FormControl><Input className="rounded-xl" placeholder="کاروان امام رضا ۱۴۰۳" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="destination" render={({ field }) => (
                  <FormItem>
                    <FormLabel>مقصد *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mashhad">مشهد مقدس</SelectItem>
                        <SelectItem value="karbala">کربلای معلا</SelectItem>
                        <SelectItem value="hajj_umrah">حج / عمره</SelectItem>
                        <SelectItem value="qom_jamkaran">قم / جمکران</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="duration" render={({ field }) => (
                  <FormItem>
                    <FormLabel>مدت سفر (روز) *</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} defaultValue={String(field.value)}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[3,4,5,6,7,8,9].map(d => (
                          <SelectItem key={d} value={String(d)}>{toPersianDigits(d)} روز</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="departure_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاریخ حرکت (شمسی) *</FormLabel>
                    <FormControl>
                      <PersianDatePicker value={field.value} onChange={field.onChange} futureOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="start_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاریخ و ساعت شروع سفر (اختیاری)</FormLabel>
                    <FormControl>
                      <PersianDatePicker value={field.value} onChange={field.onChange} withTime futureOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="end_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاریخ و ساعت پایان سفر (اختیاری)</FormLabel>
                    <FormControl>
                      <PersianDatePicker value={field.value} onChange={field.onChange} withTime futureOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>توضیحات کاروان</FormLabel>
                  <FormControl><Textarea className="rounded-xl resize-none" rows={3} placeholder="معرفی کاروان، خدمات ویژه، نکات مهم..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </SectionCard>

            {/* Section: Transport */}
            <SectionCard title="حمل‌ونقل و مسیر" icon={<span className="text-primary">🚌</span>}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="transportation_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع حمل‌ونقل *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bus">اتوبوس</SelectItem>
                        <SelectItem value="train">قطار</SelectItem>
                        <SelectItem value="airplane">هواپیما</SelectItem>
                        <SelectItem value="combined">ترکیبی</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                {isGroundTransport && (
                  <FormField control={form.control} name="bus_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع اتوبوس *</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="25">اتوبوس ۲۵ نفره (VIP — ۲+۱)</SelectItem>
                          <SelectItem value="32">اتوبوس ۳۲ نفره (۲+۱)</SelectItem>
                          <SelectItem value="44">اتوبوس ۴۴ نفره (۲+۲)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        نقشه انتخاب صندلی زائران بر اساس همین اتوبوس ساخته می‌شود.
                        {busCount > 1 && ` با ظرفیت ${toPersianDigits(capacity)} نفر، ${toPersianDigits(busCount)} اتوبوس نمایش داده می‌شود.`}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                <FormField control={form.control} name="origin_city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>مبدأ حرکت *</FormLabel>
                    <FormControl><Input className="rounded-xl" placeholder="تهران" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="transit_cities_str" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>شهرهای بین‌راهی (با ، جدا کنید)</FormLabel>
                    <FormControl><Input className="rounded-xl" placeholder="قم، کرمانشاه، خسروی" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </SectionCard>

            {/* Section: Accommodation */}
            <SectionCard title="اقامتگاه" icon={<span>🏨</span>}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="accommodation_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع اقامتگاه *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="hotel">هتل</SelectItem>
                        <SelectItem value="hosseinieh">حسینیه</SelectItem>
                        <SelectItem value="apartment">آپارتمان</SelectItem>
                        <SelectItem value="mixed">ترکیبی</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="accommodation_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام اقامتگاه</FormLabel>
                    <FormControl><Input className="rounded-xl" placeholder="هتل عباسی" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="accommodation_city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>شهر اقامتگاه</FormLabel>
                    <FormControl><Input className="rounded-xl" placeholder="کربلا" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="accommodation_distance" render={({ field }) => (
                  <FormItem>
                    <FormLabel>فاصله تا حرم (متر)</FormLabel>
                    <FormControl><Input type="number" className="rounded-xl" dir="ltr" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </SectionCard>

            {/* Section: Services */}
            <SectionCard title="خدمات و امکانات" icon={<span>🍽️</span>}>
              <div className="flex flex-wrap gap-5">
                {[
                  { name: "meal_breakfast" as const, label: "صبحانه" },
                  { name: "meal_lunch" as const, label: "ناهار" },
                  { name: "meal_dinner" as const, label: "شام" },
                  { name: "has_insurance" as const, label: "بیمه مسافرتی" },
                ].map(item => (
                  <FormField key={item.name} control={form.control} name={item.name} render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox checked={field.value as boolean} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">{item.label}</FormLabel>
                    </FormItem>
                  )} />
                ))}
              </div>
            </SectionCard>

            {/* Section: Pricing */}
            <SectionCard title="قیمت و ظرفیت" icon={<span>💰</span>}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>قیمت هر نفر (تومان) *</FormLabel>
                    <FormControl><Input type="number" className="rounded-xl" dir="ltr" placeholder="۳۵۰۰۰۰۰" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="capacity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ظرفیت کل (نفر) *</FormLabel>
                    <FormControl><Input type="number" className="rounded-xl" dir="ltr" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </SectionCard>

            {/* Section: Contact */}
            <SectionCard title="اطلاعات تماس کاروان" icon={<span>📞</span>}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="contact_phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>شماره تماس کاروان *</FormLabel>
                    <FormControl><Input className="rounded-xl" type="tel" inputMode="numeric" dir="ltr" maxLength={11} placeholder="۰۹۱۲..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="leader_messaging_apps" render={({ field }) => (
                <FormItem>
                  <FormLabel>پیام‌رسان‌های فعال</FormLabel>
                  <div className="flex gap-4 flex-wrap mt-1">
                    {MESSAGING_APPS.map(app => (
                      <label key={app.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={(field.value || []).includes(app.id)}
                          onCheckedChange={(c) => {
                            const next = c
                              ? [...(field.value || []), app.id]
                              : (field.value || []).filter(v => v !== app.id);
                            field.onChange(next);
                          }}
                        />
                        <span className="text-sm font-medium">{app.label}</span>
                      </label>
                    ))}
                  </div>
                </FormItem>
              )} />
            </SectionCard>

            {/* Section: Itinerary */}
            <SectionCard title="برنامه سفر" icon={<span>🗺️</span>}>
              <div className="space-y-3">
                {itinFields.map((field, i) => (
                  <div key={field.id} className="bg-muted/40 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-primary">روز {i + 1}</span>
                      <button type="button" onClick={() => removeItinRow(i)} className="text-red-500 hover:bg-red-50 p-1 rounded-lg">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField control={form.control} name={`itinerary.${i}.title`} render={({ field: f }) => (
                        <FormItem>
                          <FormLabel className="text-xs">عنوان</FormLabel>
                          <FormControl><Input className="rounded-lg h-9 text-sm" placeholder="حرکت از تهران" {...f} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name={`itinerary.${i}.description`} render={({ field: f }) => (
                        <FormItem>
                          <FormLabel className="text-xs">توضیحات</FormLabel>
                          <FormControl><Input className="rounded-lg h-9 text-sm" placeholder="توضیح اختیاری" {...f} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                ))}
                {itinFields.length < duration && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-1.5 text-xs"
                    onClick={() => addItinRow({ day: itinFields.length + 1, title: "", description: "" })}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    افزودن روز
                  </Button>
                )}
              </div>
            </SectionCard>

            {/* Section: Rules */}
            <SectionCard title="قوانین و مقررات" icon={<span>📋</span>}>
              <FormField control={form.control} name="rules" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea className="rounded-xl resize-none" rows={4}
                      placeholder="قوانین و مقررات خاص کاروان..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </SectionCard>

            {/* Submit */}
            <div className="flex gap-3 pb-8">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => navigate("/leader/dashboard")}>
                انصراف
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold">
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                {isEdit ? "ذخیره تغییرات و ارسال برای تأیید" : "ثبت کاروان و ارسال برای تأیید"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <span className="text-lg leading-none">{icon}</span>
        <h2 className="font-heading font-bold text-base text-foreground">{title}</h2>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </motion.div>
  );
}


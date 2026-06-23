import { useState, useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, Users, UserPlus, UserMinus, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { djangoURL } from "@/App";

const companionSchema = z.object({
  name: z.string().min(3, { message: "نام و نام خانوادگی الزامی است" }),
  nationalId: z.string().min(10, { message: "کد ملی معتبر نیست" }),
  relationship: z.string().min(1, { message: "نسبت الزامی است" }),
  birthdate: z.string().min(5, { message: "تاریخ تولد الزامی است" }),
});

type CompanionFormValues = z.infer<typeof companionSchema>;

interface BookingStepTwoProps {
  params: {
    bookingId: string;
  };
}

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: "۱", label: "اطلاعات سرپرست" },
    { n: "۲", label: "همراهان" },
    { n: "۳", label: "تایید نهایی" },
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

export default function BookingStepTwo({ params }: BookingStepTwoProps) {
  const bookingId = parseInt(params.bookingId);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);

  const { data: booking, isLoading: isLoadingBooking } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      const response = await fetch(djangoURL+`/api/bookings/${bookingId}`,{method:"GET",headers:{
        Authorization: localStorage.getItem("AUTH_TOKEN_KEY") || ""
      }});
      const data = await response.json();
      return {
        ...data,
        passengerCount: parseInt(data.passenger_count) || 1
      };
    },
  });

  useEffect(() => {
    if (booking?.passengerCount === 1) {
      navigate(`/booking/${bookingId}/step3`);
    }
  }, [booking?.passengerCount, bookingId, navigate]);

  const form = useForm<CompanionFormValues>({
    resolver: zodResolver(companionSchema),
    defaultValues: {
      name: "",
      nationalId: "",
      relationship: "",
      birthdate: "",
    },
  });

  const addCompanionMutation = useMutation({
    mutationFn: async (data: CompanionFormValues) => {
      const response = await fetch(djangoURL + `/api/bookings/${bookingId}/companions`, {
        method: "POST",
        headers: {
          Authorization: localStorage.getItem("AUTH_TOKEN_KEY") || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          national_id: data.nationalId,
          relationship: data.relationship,
          birthdate: data.birthdate,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "خطا در ثبت اطلاعات همراه");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "ثبت اطلاعات همراه",
        description: "اطلاعات همراه با موفقیت ثبت شد.",
      });
      form.reset();
      if (currentStep === totalSteps - 1) {
        navigate(`/booking/${bookingId}/step3`);
      } else {
        setCurrentStep(prev => prev + 1);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در ثبت اطلاعات. لطفا دوباره تلاش کنید.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CompanionFormValues) => {
    addCompanionMutation.mutate(data);
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
          <p className="text-muted-foreground mb-6">متأسفانه رزرو موردنظر شما یافت نشد.</p>
          <Button variant="outline" onClick={() => navigate("/")}>بازگشت به صفحه اصلی</Button>
        </div>
      </div>
    );
  }

  const passengerCount = parseInt(booking?.passengerCount) || 1;
  const totalSteps = Math.max(0, passengerCount - 1);
  const isLastStep = currentStep === totalSteps - 1;

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
            onClick={() => navigate(`/booking/${bookingId}/step1`)}
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            بازگشت به مرحله قبل
          </Button>
          <span className="inline-flex items-center gap-2 bg-primary/8 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
            فرایند رزرو کاروان
          </span>
          <h1 className="font-heading text-display-sm text-foreground">اطلاعات مسافرین</h1>
          <StepIndicator current={2} />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Lead passenger info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-card rounded-2xl p-7 border border-border shadow-card"
            >
              <h2 className="font-heading text-xl font-bold text-foreground mb-6 pb-4 border-b border-border">اطلاعات سرپرست</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">نام و نام خانوادگی</p>
                  <p className="font-medium text-foreground">{booking?.main_passenger_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">کد ملی</p>
                  <p className="font-medium text-foreground">{booking?.main_passenger_id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">شماره موبایل</p>
                  <p className="font-medium text-foreground">{booking?.main_passenger_phone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">تاریخ تولد</p>
                  <p className="font-medium text-foreground">{booking?.main_passenger_birthdate}</p>
                </div>
              </div>
            </motion.div>

            {/* Companion form */}
            {totalSteps > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="bg-card rounded-2xl p-7 border border-border shadow-card"
              >
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                  <h2 className="font-heading text-xl font-bold text-foreground">
                    اطلاعات همراه {currentStep + 1} از {totalSteps}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{currentStep}/{totalSteps}</span>
                    <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>نام و نام خانوادگی</FormLabel>
                            <FormControl>
                              <Input className="rounded-xl" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="nationalId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>کد ملی</FormLabel>
                            <FormControl>
                              <Input className="rounded-xl" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="relationship"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>نسبت</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="rounded-xl">
                                  <SelectValue placeholder="انتخاب کنید" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="spouse">همسر</SelectItem>
                                <SelectItem value="child">فرزند</SelectItem>
                                <SelectItem value="parent">والدین</SelectItem>
                                <SelectItem value="sibling">خواهر/برادر</SelectItem>
                                <SelectItem value="other">سایر</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="birthdate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>تاریخ تولد</FormLabel>
                            <FormControl>
                              <Input className="rounded-xl" placeholder="مثال: ۱۳۷۰/۰۴/۲۰" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-between pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => {
                          if (currentStep > 0) {
                            setCurrentStep(prev => prev - 1);
                            form.reset();
                          } else {
                            navigate(`/booking/${bookingId}/step1`);
                          }
                        }}
                      >
                        <ChevronRight className="ml-2 h-4 w-4" />
                        {currentStep > 0 ? "مرحله قبل" : "بازگشت"}
                      </Button>

                      <Button
                        type="submit"
                        disabled={addCompanionMutation.isPending}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-emerald-sm px-6"
                      >
                        {addCompanionMutation.isPending ? (
                          <>
                            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                            در حال ثبت...
                          </>
                        ) : isLastStep ? (
                          "پایان و ادامه"
                        ) : (
                          <>
                            ثبت و ادامه
                            <ChevronLeft className="mr-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </motion.div>
            )}

            {totalSteps === 0 && (
              <div className="flex justify-end">
                <Button
                  onClick={() => navigate(`/booking/${bookingId}/step3`)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-emerald-sm px-6"
                >
                  ادامه به مرحله بعد
                  <ChevronLeft className="mr-2 h-4 w-4" />
                </Button>
              </div>
            )}
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
                راهنمای ثبت اطلاعات
              </h2>

              <div className="bg-primary/8 border border-primary/15 rounded-xl p-4">
                <h3 className="font-semibold text-primary text-sm mb-2 flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  نکات مهم
                </h3>
                <ul className="text-primary/75 text-xs space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="inline-block w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                    اطلاعات باید دقیقاً مطابق با مدارک شناسایی باشد.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="inline-block w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                    کد ملی باید ۱۰ رقم باشد.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="inline-block w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                    تاریخ تولد را به فرمت شمسی وارد کنید.
                  </li>
                </ul>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <h3 className="font-semibold text-emerald-700 text-sm mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  وضعیت ثبت
                </h3>
                <div className="text-emerald-600 text-xs space-y-1">
                  <p>تعداد کل همراهان: {totalSteps} نفر</p>
                  <p>تعداد ثبت شده: {currentStep} نفر</p>
                </div>
              </div>

              <div className="bg-gold-50 border border-gold-200 rounded-xl p-4">
                <h3 className="font-semibold text-gold-700 text-sm mb-2 flex items-center gap-2">
                  <UserMinus className="h-4 w-4" />
                  توجه
                </h3>
                <p className="text-gold-600 text-xs">
                  در صورت نیاز به تغییر اطلاعات، می‌توانید در مراحل بعدی آن را ویرایش کنید.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

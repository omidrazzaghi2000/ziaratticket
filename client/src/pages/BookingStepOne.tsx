import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { djangoURL } from "@/App";

const bookingStep1Schema = z.object({
  caravanId: z.coerce.number(),
  passengerCount: z.coerce.number().min(1, { message: "حداقل تعداد مسافر باید ۱ نفر باشد" }),
  mainPassengerName: z.string().min(3, { message: "نام و نام خانوادگی الزامی است" }),
  mainPassengerId: z.string().min(10, { message: "کد ملی معتبر نیست" }),
  mainPassengerPhone: z.string().min(10, { message: "شماره موبایل معتبر نیست" }),
  mainPassengerBirthdate: z.string().min(5, { message: "تاریخ تولد الزامی است" }),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "پذیرش قوانین و مقررات الزامی است",
  }),
});

type BookingStep1FormValues = z.infer<typeof bookingStep1Schema>;

interface BookingStepOneProps {
  params: {
    caravanId: string;
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
  const { user, isAuthenticated, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  interface Caravan {
    id: number;
    name: string;
    departure_date: string;
    duration: number;
    transportation_type: string;
    price: number;
    capacity: number;
    remaining_capacity: number;
    accommodation_type: string;
    accommodation_distance: number;
    manager: string;
    description?: string;
  }

  const { data: caravan, isLoading: isLoadingCaravan } = useQuery<Caravan>({
    queryKey: ['/api/caravans', caravanId],
    queryFn: async () => {
      const response = await apiRequest("GET", djangoURL+`/api/caravans/${caravanId}`);
      return response.json();
    },
    enabled: !isNaN(caravanId),
  });

  const form = useForm<BookingStep1FormValues>({
    resolver: zodResolver(bookingStep1Schema),
    defaultValues: {
      caravanId: caravanId,
      passengerCount: 1,
      mainPassengerName: "",
      mainPassengerId: "",
      mainPassengerPhone: "",
      mainPassengerBirthdate: "",
      termsAccepted: false,
    },
  });

  function getCookie(name:string) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
  }

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
          main_passenger_name: data.mainPassengerName,
          main_passenger_id: data.mainPassengerId,
          main_passenger_phone: data.mainPassengerPhone,
          main_passenger_birthdate: data.mainPassengerBirthdate,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "خطا در ثبت اطلاعات");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "مرحله اول رزرو",
        description: "اطلاعات مرحله اول با موفقیت ثبت شد.",
      });
      navigate(`/booking/${data.bookingId}/step2`);
    },
    onError: (error: Error) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در ثبت اطلاعات. لطفا دوباره تلاش کنید.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BookingStep1FormValues) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    console.log(data);
    bookingStep1Mutation.mutate(data);
  };

  const handleAuthModalClose = () => {
    setShowAuthModal(false);
  };

  if (isLoadingCaravan) {
    return (
      <div className="bg-background min-h-screen">
        <Header />
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
        <Header />
        <div className="container py-10 pt-32 text-center">
          <h2 className="font-heading text-2xl font-bold text-foreground mb-4">کاروان یافت نشد</h2>
          <p className="text-muted-foreground mb-6">متأسفانه کاروان موردنظر شما یافت نشد.</p>
          <Button variant="outline" onClick={() => navigate("/")}>
            بازگشت به صفحه اصلی
          </Button>
        </div>
      </div>
    );
  }

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
            onClick={() => navigate("/")}
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            بازگشت به صفحه اصلی
          </Button>
          <span className="inline-flex items-center gap-2 bg-primary/8 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
            فرایند رزرو کاروان
          </span>
          <h1 className="font-heading text-display-sm text-foreground">رزرو کاروان</h1>
          <StepIndicator current={1} />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-2"
          >
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Passenger info card */}
                <div className="bg-card rounded-2xl p-7 border border-border shadow-card">
                  <h2 className="font-heading text-xl font-bold text-foreground mb-6 pb-4 border-b border-border">
                    اطلاعات مسافرین
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <FormField
                      control={form.control}
                      name="mainPassengerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نام و نام خانوادگی سرپرست</FormLabel>
                          <FormControl>
                            <Input className="rounded-xl" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mainPassengerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>کد ملی سرپرست</FormLabel>
                          <FormControl>
                            <Input className="rounded-xl" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mainPassengerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>شماره موبایل سرپرست</FormLabel>
                          <FormControl>
                            <Input className="rounded-xl" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mainPassengerBirthdate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تاریخ تولد سرپرست</FormLabel>
                          <FormControl>
                            <Input className="rounded-xl" placeholder="مثال: ۱۳۶۵/۰۶/۱۰" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="passengerCount"
                    render={({ field }) => (
                      <FormItem className="mb-6">
                        <FormLabel className="text-base mb-3 block font-semibold">تعداد مسافرین</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            defaultValue={field.value.toString()}
                            className="flex flex-col space-y-2.5"
                          >
                            {[1, 2, 3, 4, 5].map((count) => (
                              <div key={count} className="flex items-center gap-3">
                                <RadioGroupItem value={count.toString()} id={`count-${count}`} />
                                <label
                                  htmlFor={`count-${count}`}
                                  className="flex flex-1 cursor-pointer items-center rounded-xl border border-border p-4 hover:border-primary hover:bg-primary/8 transition-all duration-200"
                                >
                                  <Users className="ml-3 h-4 w-4 text-primary shrink-0" />
                                  <div>
                                    <p className="font-medium text-sm">{count} نفر</p>
                                    <p className="text-muted-foreground text-xs">
                                      {count === 1 ? "فقط خودم" : `خودم به همراه ${count - 1} نفر همراه`}
                                    </p>
                                  </div>
                                </label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-primary/8 border border-primary/15 rounded-xl p-4 mb-6">
                    <p className="text-primary/80 text-sm leading-6">
                      اطلاعات همراهان در مرحله بعد دریافت خواهد شد. لطفا تعداد دقیق مسافرین را وارد کنید.
                    </p>
                  </div>

                  <div className="bg-cream-100 border border-border rounded-xl p-6">
                    <h3 className="font-heading font-bold text-lg text-foreground mb-4">شرایط و قوانین رزرو</h3>
                    <ul className="text-muted-foreground text-sm space-y-3 mb-6">
                      {[
                        "همراه داشتن شناسنامه، کارت ملی و گذرنامه معتبر الزامی است.",
                        "در صورت انصراف تا ۱۴ روز قبل از سفر، ۸۰٪ مبلغ عودت داده می‌شود.",
                        "مسئولیت صحت اطلاعات وارد شده به عهده مسافر است.",
                        "رعایت کلیه قوانین و مقررات کشور عراق الزامی است.",
                        "هزینه بیمه مسافرتی در قیمت کاروان لحاظ شده است.",
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <FormField
                      control={form.control}
                      name="termsAccepted"
                      render={({ field }) => (
                        <FormItem className="flex items-start gap-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground mt-0.5"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="font-normal text-sm cursor-pointer">
                              شرایط و قوانین رزرو را مطالعه کرده و می‌پذیرم
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/")}
                    className="rounded-xl"
                  >
                    انصراف
                  </Button>

                  <Button
                    type="submit"
                    disabled={bookingStep1Mutation.isPending}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-emerald-sm px-6"
                  >
                    {bookingStep1Mutation.isPending ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        در حال ثبت...
                      </>
                    ) : (
                      <>
                        ادامه و ثبت اطلاعات مسافرین
                        <ChevronLeft className="mr-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
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
                      تاریخ حرکت: {caravan.departure_date} — {caravan.duration} روزه
                    </p>
                  </div>
                </div>

                <div className="grid gap-2.5 bg-cream-100 rounded-xl p-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Car className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-foreground/80 text-sm">{caravan.transportation_type}</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-foreground/80 text-sm">
                      {caravan.accommodation_type} — {caravan.accommodation_distance} متر تا حرم
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Users className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-foreground/80 text-sm">
                      ظرفیت باقیمانده: {caravan.remaining_capacity} نفر
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center bg-primary/8 border border-primary/15 rounded-xl p-6">
                  <p className="text-muted-foreground text-xs mb-2">هزینه سفر برای هر نفر</p>
                  <p className="font-heading text-2xl font-bold text-primary">
                    {new Intl.NumberFormat('fa-IR').format(caravan.price)}
                    <span className="text-base font-normal mr-1">تومان</span>
                  </p>
                </div>

                {caravan.description && (
                  <div className="pt-4 border-t border-border">
                    <h4 className="font-heading font-bold text-sm text-foreground mb-2">توضیحات کاروان</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">{caravan.description}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={handleAuthModalClose}
          title="ورود به حساب کاربری"
          description="برای ادامه فرایند رزرو، لطفا وارد حساب کاربری خود شوید یا ثبت‌نام کنید."
        />
      </div>
    </div>
  );
}

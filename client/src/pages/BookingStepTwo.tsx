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
import { Card } from "@/components/ui/card";
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

export default function BookingStepTwo({ params }: BookingStepTwoProps) {
  const bookingId = parseInt(params.bookingId);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);

  // دریافت اطلاعات رزرو
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

  // اگر تعداد مسافرین 1 نفر است، مستقیماً به مرحله سوم هدایت شود
  useEffect(() => {
    if (booking?.passengerCount === 1) {
      navigate(`/booking/${bookingId}/step3`);
    }
  }, [booking?.passengerCount, bookingId, navigate]);

  // فرم اطلاعات همراه
  const form = useForm<CompanionFormValues>({
    resolver: zodResolver(companionSchema),
    defaultValues: {
      name: "",
      nationalId: "",
      relationship: "",
      birthdate: "",
    },
  });

  // ارسال اطلاعات همراه
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
      
      // اگر آخرین همراه بود، به مرحله بعد برو
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

  // ارسال فرم
  const onSubmit = (data: CompanionFormValues) => {
    addCompanionMutation.mutate(data);
  };

  if (isLoadingBooking) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Header />
        <div className="container py-10 pt-32 flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-gray-500">در حال بارگذاری اطلاعات رزرو...</p>
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
          <p className="text-gray-500 mb-6">متأسفانه رزرو موردنظر شما یافت نشد.</p>
          <Button variant="outline" onClick={() => navigate("/")}>
            بازگشت به صفحه اصلی
          </Button>
        </div>
      </div>
    );
  }

  // اطمینان از اینکه passengerCount یک عدد معتبر است
  const passengerCount = parseInt(booking?.passengerCount) || 1;
  // تعداد همراهان = تعداد کل مسافرین منهای یک (سرپرست)
  const totalSteps = Math.max(0, passengerCount - 1);
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="bg-gray-50 min-h-screen">
    <Header />
    <div className="container py-12 pt-28">
      <div className="mb-8 animate-fade-in">
        <Button 
          variant="ghost"
          size="sm"
          className="mb-4 hover:scale-105 transition-transform"
          onClick={() => navigate(`/booking/${bookingId}/step1`)}
        >
          <ArrowRight className="ml-2 h-4 w-4" />
          بازگشت به مرحله قبل
        </Button>
        <h1 className="text-3xl md:text-4xl font-bold font-heading bg-gradient-to-l from-primary to-primary-600 bg-clip-text text-transparent">
          اطلاعات مسافرین
        </h1>
        <div className="flex items-center mt-3">
          <div className="h-2 w-2 rounded-full bg-primary"></div>
          <div className="h-[2px] w-10 bg-primary"></div>
          <div className="px-3 py-1 rounded-full bg-primary text-white text-sm">
            مرحله ۲ از ۴: اطلاعات مسافرین
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {/* اطلاعات سرپرست */}
          <Card className="p-6 shadow-md border-0 overflow-hidden relative mb-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <h2 className="text-2xl font-heading font-bold mb-6 border-b pb-4">اطلاعات سرپرست</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">نام و نام خانوادگی</p>
                  <p className="font-medium">{booking?.main_passenger_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">کد ملی</p>
                  <p className="font-medium">{booking?.main_passenger_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">شماره موبایل</p>
                  <p className="font-medium">{booking?.main_passenger_phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">تاریخ تولد</p>
                  <p className="font-medium">{booking?.main_passenger_birthdate}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* فرم اطلاعات همراه */}
          {totalSteps > 0 && (
            <Card className="p-6 shadow-md border-0 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-6 border-b pb-4">
                  <h2 className="text-2xl font-heading font-bold">
                    اطلاعات همراه {currentStep + 1} از {totalSteps}
                  </h2>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>نام و نام خانوادگی</FormLabel>
                            <FormControl>
                              <Input {...field} />
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
                              <Input {...field} />
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
                                <SelectTrigger>
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
                              <Input placeholder="مثال: ۱۳۷۰/۰۴/۲۰" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (currentStep > 0) {
                            setCurrentStep(prev => prev - 1);
                            form.reset();
                          } else {
                            navigate(`/booking/${bookingId}/step1`);
                          }
                        }}
                        className="border-gray-300 hover:bg-gray-100 transition-all duration-300"
                      >
                        <ChevronRight className="ml-2 h-4 w-4" />
                        {currentStep > 0 ? "مرحله قبل" : "بازگشت به مرحله قبل"}
                      </Button>
                      
                      <Button 
                        type="submit"
                        disabled={addCompanionMutation.isPending}
                        className="bg-gradient-to-l from-primary-600 to-primary hover:opacity-90 transition-all shadow-md"
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
              </div>
            </Card>
          )}

          {/* دکمه ادامه برای حالت تک نفره */}
          {totalSteps === 0 && (
            <div className="flex justify-end">
              <Button
                onClick={() => navigate(`/booking/${bookingId}/step3`)}
                className="bg-gradient-to-l from-primary-600 to-primary hover:opacity-90 transition-all shadow-md"
              >
                ادامه به مرحله بعد
                <ChevronLeft className="mr-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="animate-slide-left delay-200">
          <Card className="p-6 shadow-md border-0 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-40 h-40 bg-primary/5 rounded-full -ml-16 -mt-16"></div>
            <div className="relative">
              <h2 className="text-2xl font-heading font-bold mb-6 border-b pb-4 flex items-center">
                <span className="ml-2 text-primary">•</span>
                راهنمای ثبت اطلاعات
              </h2>
              
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="font-bold text-blue-700 mb-2 flex items-center">
                    <UserPlus className="ml-2 h-5 w-5" />
                    نکات مهم
                  </h3>
                  <ul className="text-blue-600 text-sm space-y-2">
                    <li className="flex items-start">
                      <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 ml-2"></span>
                      <span>اطلاعات باید دقیقاً مطابق با مدارک شناسایی باشد.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 ml-2"></span>
                      <span>کد ملی باید ۱۰ رقم باشد.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 ml-2"></span>
                      <span>تاریخ تولد را به فرمت شمسی وارد کنید.</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <h3 className="font-bold text-green-700 mb-2 flex items-center">
                    <Users className="ml-2 h-5 w-5" />
                    وضعیت ثبت
                  </h3>
                  <div className="text-green-600 text-sm">
                    <p className="mb-2">تعداد کل همراهان: {totalSteps} نفر</p>
                    <p>تعداد ثبت شده: {currentStep} نفر</p>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                  <h3 className="font-bold text-yellow-700 mb-2 flex items-center">
                    <UserMinus className="ml-2 h-5 w-5" />
                    توجه
                  </h3>
                  <p className="text-yellow-600 text-sm">
                    در صورت نیاز به تغییر اطلاعات، می‌توانید در مراحل بعدی آن را ویرایش کنید.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
    </div>
  );
}
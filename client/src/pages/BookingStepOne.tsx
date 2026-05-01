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
import { Loader2, ArrowRight, Calendar, Users, Car, MapPin, Currency } from "lucide-react";
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

export default function BookingStepOne({ params }: BookingStepOneProps) {
  const caravanId = parseInt(params.caravanId);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // تعریف اینترفیس کاروان
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
  
  // دریافت اطلاعات کاروان
  const { data: caravan, isLoading: isLoadingCaravan } = useQuery<Caravan>({
    queryKey: ['/api/caravans', caravanId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/caravans/${caravanId}`);
      return response.json();
    },
    enabled: !isNaN(caravanId),
  });

  // فرم مرحله اول رزرو
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
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

  // ارسال فرم مرحله اول
  const bookingStep1Mutation = useMutation({
    mutationFn: async (data: BookingStep1FormValues) => {
      const token = (getCookie('csrftoken'));
      const response = await apiRequest("POST", "/api/bookings/step1", {
        ...data,
        passengerCount: data.passengerCount,
        csrftoken: token // اطمینان از ارسال تعداد مسافرین
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "مرحله اول رزرو",
        description: "اطلاعات مرحله اول با موفقیت ثبت شد.",
      });
      
      // هدایت به مرحله دوم
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

  // ارسال فرم
  const onSubmit = (data: BookingStep1FormValues) => {
    if (!isAuthenticated) {
      // اگر کاربر وارد نشده، مودال احراز هویت نمایش داده شود
      setShowAuthModal(true);
      return;
    }
    
    // ارسال فرم
    console.log(data);
    bookingStep1Mutation.mutate(data);

  };

  // هندلر بستن مودال احراز هویت
  const handleAuthModalClose = () => {
    setShowAuthModal(false);
  };

  // اگر در حال بارگذاری است، اسکلتون نمایش می‌دهیم
  if (isLoadingCaravan) {
    return (
      <div className="container py-10">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-gray-500">در حال بارگذاری اطلاعات کاروان...</p>
        </div>
      </div>
    );
  }

  // اگر کاروان یافت نشد
  if (!caravan) {
    return (
      <div className="container py-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">کاروان یافت نشد</h2>
          <p className="text-gray-500 mb-6">متأسفانه کاروان موردنظر شما یافت نشد.</p>
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
          >
            بازگشت به صفحه اصلی
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12 bg-gray-50/30">
      <div className="mb-8 animate-fade-in">
        <Button 
          variant="ghost"
          size="sm"
          className="mb-4 hover:scale-105 transition-transform"
          onClick={() => navigate("/")}
        >
          <ArrowRight className="ml-2 h-4 w-4" />
          بازگشت به صفحه اصلی
        </Button>
        <h1 className="text-3xl md:text-4xl font-bold font-heading bg-gradient-to-l from-primary to-primary-600 bg-clip-text text-transparent">
          رزرو کاروان
        </h1>
        <div className="flex items-center mt-3">
          <div className="h-2 w-2 rounded-full bg-primary"></div>
          <div className="h-[2px] w-10 bg-primary"></div>
          <div className="px-3 py-1 rounded-full bg-primary text-white text-sm">
            مرحله ۱ از ۴: انتخاب تعداد مسافرین
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 animate-slide-up delay-100">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card className="p-6 shadow-md border-0 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10"></div>
                <div className="relative">
                  <h2 className="text-2xl font-heading font-bold mb-6 border-b pb-4">اطلاعات مسافرین</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <FormField
                      control={form.control}
                      name="mainPassengerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نام و نام خانوادگی سرپرست</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                            <Input {...field} />
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
                            <Input {...field} />
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
                            <Input placeholder="مثال: ۱۳۶۵/۰۶/۱۰" {...field} />
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
                        <FormLabel className="text-lg mb-3 block">تعداد مسافرین</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            defaultValue={field.value.toString()}
                            className="flex flex-col space-y-3"
                          >
                            {[1, 2, 3, 4, 5].map((count, index) => (
                              <div 
                                key={count} 
                                className={`animate-slide-right delay-${(index + 1) * 100} flex items-center space-x-2 space-x-reverse`}
                              >
                                <RadioGroupItem value={count.toString()} id={`count-${count}`} />
                                <label
                                  htmlFor={`count-${count}`}
                                  className="flex flex-1 cursor-pointer items-center rounded-md border border-gray-200 p-4 hover:border-primary hover:bg-primary/5 transition-all duration-300"
                                >
                                  <Users className="ml-3 h-5 w-5 text-primary-600" />
                                  <div>
                                    <p className="font-medium">{count} نفر</p>
                                    <p className="text-gray-500 text-sm">
                                      {count === 1 
                                        ? "فقط خودم" 
                                        : `خودم به همراه ${count - 1} نفر همراه`}
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

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100/50 rounded-full -mr-5 -mt-5"></div>
                    <div className="relative">
                      <p className="text-blue-700 text-sm leading-6">
                        اطلاعات همراهان در مرحله بعد دریافت خواهد شد. لطفا تعداد دقیق مسافرین را وارد کنید.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-20 h-20 bg-gray-100/50 rounded-full -ml-5 -mt-5"></div>
                    <div className="relative">
                      <h3 className="font-bold text-lg mb-4 font-heading">شرایط و قوانین رزرو</h3>
                      <ul className="text-gray-600 text-sm space-y-3 mb-6">
                        <li className="flex items-start">
                          <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full mt-2 ml-2"></span>
                          <span>همراه داشتن شناسنامه، کارت ملی و گذرنامه معتبر الزامی است.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full mt-2 ml-2"></span>
                          <span>در صورت انصراف تا ۱۴ روز قبل از سفر، ۸۰٪ مبلغ عودت داده می‌شود.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full mt-2 ml-2"></span>
                          <span>مسئولیت صحت اطلاعات وارد شده به عهده مسافر است.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full mt-2 ml-2"></span>
                          <span>رعایت کلیه قوانین و مقررات کشور عراق الزامی است.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full mt-2 ml-2"></span>
                          <span>هزینه بیمه مسافرتی در قیمت کاروان لحاظ شده است.</span>
                        </li>
                      </ul>

                      <FormField
                        control={form.control}
                        name="termsAccepted"
                        render={({ field }) => (
                          <FormItem className="flex items-start space-x-2 space-x-reverse animate-pulse">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="font-normal">
                                شرایط و قوانین رزرو را مطالعه کرده و می‌پذیرم
                              </FormLabel>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <div className="flex justify-between animate-slide-up delay-500">
                <Button
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="border-gray-300 hover:bg-gray-100 transition-all duration-300"
                >
                  انصراف
                </Button>
                
                <Button 
                  type="submit"
                  disabled={bookingStep1Mutation.isPending}
                  className="bg-gradient-to-l from-primary-600 to-primary hover:opacity-90 transition-all shadow-md"
                >
                  {bookingStep1Mutation.isPending ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      در حال ثبت...
                    </>
                  ) : (
                    "ادامه و ثبت اطلاعات مسافرین"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        <div className="animate-slide-left delay-200">
          <Card className="p-6 shadow-md border-0 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-40 h-40 bg-primary/5 rounded-full -ml-16 -mt-16"></div>
            <div className="relative">
              <h2 className="text-2xl font-heading font-bold mb-6 border-b pb-4 flex items-center">
                <span className="ml-2 text-primary">•</span>
                اطلاعات کاروان
              </h2>
              
              <div className="space-y-6">
                <div className="flex animate-fade-in">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-300 to-primary-600 rounded-lg flex items-center justify-center text-white shadow-md">
                    <Calendar className="h-8 w-8" strokeWidth={1.5} />
                  </div>
                  <div className="mr-4">
                    <h3 className="font-bold text-xl font-heading">{caravan.name}</h3>
                    <p className="text-gray-500">
                      تاریخ حرکت: {caravan.departure_date} - {caravan.duration} روزه
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-3 bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center animate-slide-right delay-300">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center ml-3">
                      <Car className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-gray-700">{caravan.transportation_type}</span>
                  </div>
                  
                  <div className="flex items-center animate-slide-right delay-400">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center ml-3">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-gray-700">
                      {caravan.accommodation_type} - {caravan.accommodation_distance} متر تا حرم
                    </span>
                  </div>
                  
                  <div className="flex items-center animate-slide-right delay-500">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center ml-3">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-gray-700">
                      ظرفیت باقیمانده: {caravan.remaining_capacity} نفر
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col items-center justify-center bg-primary/10 p-6 rounded-lg animate-pulse">
                  <p className="text-gray-500 text-sm mb-2">هزینه سفر برای هر نفر</p>
                  <p className="text-3xl font-bold font-heading text-primary-600">
                    {new Intl.NumberFormat('fa-IR').format(caravan.price)}
                    <span className="text-lg mr-1">تومان</span>
                  </p>
                </div>
                
                {caravan.description && (
                  <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in delay-500">
                    <h4 className="font-bold mb-2 font-heading">توضیحات کاروان</h4>
                    <p className="text-gray-600 text-sm leading-6">{caravan.description}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* مودال احراز هویت */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
        title="ورود به حساب کاربری"
        description="برای ادامه فرایند رزرو، لطفا وارد حساب کاربری خود شوید یا ثبت‌نام کنید."
      />
    </div>
  );
}
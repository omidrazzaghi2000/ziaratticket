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

const bookingStep1Schema = z.object({
  caravanId: z.coerce.number(),
  passengerCount: z.coerce.number().min(1, { message: "حداقل تعداد مسافر باید ۱ نفر باشد" }),
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
    departureDate: string;
    duration: number;
    transportationType: string;
    price: number;
    capacity: number;
    remainingCapacity: number;
    accommodationType: string;
    accommodationDistance: number;
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
      termsAccepted: false,
    },
  });

  // ارسال فرم مرحله اول
  const bookingStep1Mutation = useMutation({
    mutationFn: async (data: BookingStep1FormValues) => {
      const response = await apiRequest("POST", "/api/bookings/step1", data);
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
    <div className="container py-10">
      <div className="mb-6">
        <Button 
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => navigate("/")}
        >
          <ArrowRight className="ml-2 h-4 w-4" />
          بازگشت به صفحه اصلی
        </Button>
        <h1 className="text-3xl font-bold">رزرو کاروان</h1>
        <p className="text-gray-500 mt-2">مرحله ۱ از ۴: انتخاب تعداد مسافرین</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">اطلاعات مسافرین</h2>

                <FormField
                  control={form.control}
                  name="passengerCount"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>تعداد مسافرین</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value.toString()}
                          className="flex flex-col space-y-2"
                        >
                          {[1, 2, 3, 4, 5].map((count) => (
                            <div key={count} className="flex items-center space-x-2 space-x-reverse">
                              <RadioGroupItem value={count.toString()} id={`count-${count}`} />
                              <label
                                htmlFor={`count-${count}`}
                                className="flex flex-1 cursor-pointer items-center rounded-md border border-gray-200 p-4 hover:border-gray-300"
                              >
                                <Users className="ml-3 h-5 w-5 text-gray-500" />
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

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                  <p className="text-blue-700 text-sm">
                    اطلاعات همراهان در مرحله بعد دریافت خواهد شد. لطفا تعداد دقیق مسافرین را وارد کنید.
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-bold mb-2">شرایط و قوانین رزرو</h3>
                  <ul className="text-gray-600 text-sm space-y-2 mb-4">
                    <li>• همراه داشتن شناسنامه، کارت ملی و گذرنامه معتبر الزامی است.</li>
                    <li>• در صورت انصراف تا ۱۴ روز قبل از سفر، ۸۰٪ مبلغ عودت داده می‌شود.</li>
                    <li>• مسئولیت صحت اطلاعات وارد شده به عهده مسافر است.</li>
                    <li>• رعایت کلیه قوانین و مقررات کشور عراق الزامی است.</li>
                    <li>• هزینه بیمه مسافرتی در قیمت کاروان لحاظ شده است.</li>
                  </ul>

                  <FormField
                    control={form.control}
                    name="termsAccepted"
                    render={({ field }) => (
                      <FormItem className="flex items-start space-x-2 space-x-reverse">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
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
              </Card>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => navigate("/")}
                >
                  انصراف
                </Button>
                
                <Button 
                  type="submit"
                  disabled={bookingStep1Mutation.isPending}
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

        <div>
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">اطلاعات کاروان</h2>
            
            <div className="space-y-4">
              <div className="flex">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <Calendar className="h-8 w-8" strokeWidth={1.5} />
                </div>
                <div className="mr-4">
                  <h3 className="font-bold text-lg">{caravan.name}</h3>
                  <p className="text-gray-500">
                    تاریخ حرکت: {caravan.departureDate} - {caravan.duration} روزه
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center">
                  <Car className="h-5 w-5 text-gray-400 ml-2" />
                  <span className="text-gray-600">{caravan.transportationType}</span>
                </div>
                
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-gray-400 ml-2" />
                  <span className="text-gray-600">
                    {caravan.accommodationType} - {caravan.accommodationDistance} متر تا حرم
                  </span>
                </div>
                
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-gray-400 ml-2" />
                  <span className="text-gray-600">
                    ظرفیت باقیمانده: {caravan.remainingCapacity} نفر
                  </span>
                </div>
                
                <div className="flex items-center">
                  <Currency className="h-5 w-5 text-gray-400 ml-2" />
                  <span className="text-gray-600 font-bold">
                    {new Intl.NumberFormat('fa-IR').format(caravan.price)} تومان
                  </span>
                </div>
              </div>
              
              {caravan.description && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="font-bold mb-2">توضیحات</h4>
                  <p className="text-gray-600 text-sm">{caravan.description}</p>
                </div>
              )}
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
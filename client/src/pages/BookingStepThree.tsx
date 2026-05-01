import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, CheckCircle2, Phone, MessageCircle, Bus, User, Square, Armchair} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";

interface Companion {
  name: string;
  nationalId: string;
  relationship: string;
  birthdate: string;
}

interface Seat {
  number: number;
  isOccupied: boolean;
  isSelected: boolean;
  passengerName?: string;
}

interface BookingStepThreeProps {
  params: {
    bookingId: string;
  };
}

interface BookingStep3 {
  address: string;
  specialRequests?: string;
  selectedSeats?: number[];
}

export default function BookingStepThree({ params }: BookingStepThreeProps) {
  const bookingId = parseInt(params.bookingId);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [specialRequests, setSpecialRequests] = useState("");
  const [address, setAddress] = useState("");
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [processedCompanions, setProcessedCompanions] = useState<Companion[]>([]);
  const [error, setError] = useState<string | null>(null);

  // دریافت اطلاعات رزرو
  const { data: booking, isLoading: isLoadingBooking } = useQuery({
    queryKey: ['/api/bookings', bookingId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/bookings/${bookingId}`);
      const data = await response.json();
      return data;
    },
  });

  // پردازش اطلاعات همراهان
  useEffect(() => {
    if (booking?.companions) {
      const companions = (booking.companions || []).map((companion: string) => {
        try {
          return JSON.parse(companion) as Companion;
        } catch (e) {
          console.error('Error parsing companion:', e);
          return null;
        }
      }).filter(Boolean);
      
      setProcessedCompanions(companions);
    }
  }, [booking?.companions]);

  // دریافت اطلاعات کاروان
  const { data: caravan } = useQuery({
    queryKey: ['/api/caravans', booking?.caravanId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/caravans/${booking?.caravanId}`);
      const data = await response.json();
      return data;
    },
    enabled: !!booking?.caravanId,
  });

  // دریافت وضعیت صندلی‌ها
  const { data: seats = [] } = useQuery<Seat[]>({
    queryKey: ['/api/bookings', bookingId, 'seats'],
    queryFn: async () => {
      console.log('درخواست دریافت صندلی‌ها برای رزرو:', bookingId);
      const response = await apiRequest("GET", `/api/bookings/${bookingId}/seats`);
      const data = await response.json();
      console.log('پاسخ سرور برای صندلی‌ها:', data);
      return data;
    },
    enabled: !!bookingId,
  });

  // نمایش صندلی‌های اشغال شده در کنسول
  useEffect(() => {
    console.log('تمام صندلی‌ها:', seats);
    const occupiedSeats = seats.filter(seat => seat.isOccupied);
    console.log('صندلی‌های اشغال شده:', occupiedSeats.map(seat => ({
      شماره_صندلی: seat.number,
      نام_مسافر: seat.passengerName,
      وضعیت: seat.isOccupied ? 'اشغال شده' : 'خالی'
    })));
  }, [seats]);

  // ذخیره مرحله سوم
  const saveStep3Mutation = useMutation({
    mutationFn: async (data: BookingStep3) => {
      const response = await apiRequest("POST", `/api/bookings/${bookingId}/step3`, data);
      return response.json();
    },
    onError: (error: Error) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در ذخیره اطلاعات. لطفا دوباره تلاش کنید.",
        variant: "destructive",
      });
    },
  });

  // تکمیل رزرو
  const completeBookingMutation = useMutation({
    mutationFn: async () => {
      console.log('شروع تکمیل رزرو با صندلی‌های انتخاب شده:', selectedSeats);
      
      // اول مرحله سوم را ذخیره می‌کنیم
      console.log('در حال ذخیره مرحله سوم با آدرس:', address);
      await saveStep3Mutation.mutateAsync({
        address,
        specialRequests,
        selectedSeats
      });
      
      // سپس رزرو را تکمیل می‌کنیم
      console.log('در حال ارسال درخواست تکمیل رزرو با صندلی‌ها:', selectedSeats);
      const response = await apiRequest("POST", `/api/bookings/${bookingId}/complete`, {
        selectedSeats
      });
      
      const data = await response.json();
      console.log('پاسخ سرور:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'خطا در تکمیل رزرو');
      }
      
      return data;
    },
    onSuccess: () => {
      console.log('رزرو با موفقیت تکمیل شد');
      navigate(`/booking/${bookingId}/success`);
    },
    onError: (error: Error) => {
      console.error('خطا در تکمیل رزرو:', error);
      toast({
        title: "خطا",
        description: error.message || "خطا در تکمیل رزرو. لطفا دوباره تلاش کنید.",
        variant: "destructive",
      });
    },
  });

  // انتخاب صندلی
  const handleSeatClick = (seatNumber: number) => {
    if (seats.find(s => s.number === seatNumber)?.isOccupied) {
      console.log('صندلی اشغال شده است:', seatNumber);
      return;
    }
    
    setSelectedSeats(prev => {
      const newSeats = prev.includes(seatNumber) || selectedSeats.length >= booking?.passengerCount
        ? prev.filter(s => s !== seatNumber)
        : [...prev, seatNumber];
      
      console.log('صندلی‌های انتخاب شده جدید:', newSeats);
      return newSeats;
    });
  };

  const toPersianNumber = (num: number) => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d)]);
  };

  // اگر در حال بارگذاری است
  if (isLoadingBooking) {
    return (
      <div className="container py-10">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-gray-500">در حال بارگذاری اطلاعات رزرو...</p>
        </div>
      </div>
    );
  }

  // اگر رزرو یافت نشد
  if (!booking || !caravan) {
    return (
      <div className="container py-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">رزرو یافت نشد</h2>
          <p className="text-gray-500 mb-6">متأسفانه رزرو موردنظر شما یافت نشد.</p>
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
          onClick={() => navigate(`/booking/${bookingId}/step2`)}
        >
          <ArrowRight className="ml-2 h-4 w-4" />
          بازگشت به مرحله قبل
        </Button>
        <h1 className="text-3xl md:text-4xl font-bold font-heading bg-gradient-to-l from-primary to-primary-600 bg-clip-text text-transparent">
          خلاصه اطلاعات رزرو
        </h1>
        <div className="flex items-center mt-3">
          <div className="h-2 w-2 rounded-full bg-primary"></div>
          <div className="h-[2px] w-10 bg-primary"></div>
          <div className="px-3 py-1 rounded-full bg-primary text-white text-sm">
            مرحله ۳ از ۴: تایید نهایی
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {/* اطلاعات کاروان */}
          <Card className="p-6 shadow-md border-0 overflow-hidden relative mb-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <h2 className="text-2xl font-heading font-bold mb-6 border-b pb-4">اطلاعات کاروان</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">نام کاروان</p>
                  <p className="font-medium">{caravan.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">تاریخ حرکت</p>
                  <p className="font-medium">{caravan.departure_date}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">مدت سفر</p>
                  <p className="font-medium">{caravan.duration} روز</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">نوع اقامتگاه</p>
                  <p className="font-medium">{caravan.accommodation_type}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* اطلاعات مسافرین */}
          <Card className="p-6 shadow-md border-0 overflow-hidden relative mb-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <h2 className="text-2xl font-heading font-bold mb-6 border-b pb-4">اطلاعات مسافرین</h2>
              
              {/* اطلاعات سرپرست */}
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-4 flex items-center">
                  <User className="ml-2 h-5 w-5 text-primary" />
                  سرپرست
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">نام و نام خانوادگی</p>
                    <p className="font-medium">{booking?.mainPassengerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">کد ملی</p>
                    <p className="font-medium">{booking?.mainPassengerId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">شماره موبایل</p>
                    <p className="font-medium">{booking?.mainPassengerPhone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">تاریخ تولد</p>
                    <p className="font-medium">{booking?.mainPassengerBirthdate}</p>
                  </div>
                </div>
              </div>

              {/* اطلاعات همراهان */}
              {processedCompanions.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-4 flex items-center">
                    <User className="ml-2 h-5 w-5 text-primary" />
                    همراهان ({processedCompanions.length} نفر)
                  </h3>
                  <div className="space-y-4">
                    {processedCompanions.map((companion: Companion, index: number) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500 mb-1">نام و نام خانوادگی</p>
                            <p className="font-medium">{companion.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mb-1">کد ملی</p>
                            <p className="font-medium">{companion.nationalId}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mb-1">نسبت</p>
                            <p className="font-medium">
                              {companion.relationship === 'spouse' && 'همسر'}
                              {companion.relationship === 'child' && 'فرزند'}
                              {companion.relationship === 'parent' && 'والدین'}
                              {companion.relationship === 'sibling' && 'خواهر/برادر'}
                              {companion.relationship === 'other' && 'سایر'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mb-1">تاریخ تولد</p>
                            <p className="font-medium">{companion.birthdate}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* آدرس */}
          <Card className="p-6 shadow-md border-0 overflow-hidden relative mb-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <h2 className="text-2xl font-heading font-bold mb-6 border-b pb-4">آدرس</h2>
              <Textarea
                placeholder="لطفا آدرس خود را وارد کنید..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-32"
              />
            </div>
          </Card>

          {/* انتخاب صندلی */}
          {caravan?.transportation_type === "زمینی" && (
            <Card className="p-6 shadow-md border-0 overflow-hidden relative mb-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10"></div>
              <div className="relative">
                <h2 className="text-2xl font-heading font-bold mb-6 border-b pb-4 flex items-center">
                  <Bus className="ml-2 h-6 w-6 text-primary" />
                  انتخاب صندلی
                </h2>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4 space-x-reverse">
                        <div className="flex items-center">
                          <Square className="w-4 h-4 text-gray-600 ml-2" />
                          <span className="text-sm text-gray-600">خالی</span>
                        </div>
                        <div className="flex items-center">
                          <Square className="w-4 h-4 text-primary ml-2" />
                          <span className="text-sm text-gray-600">انتخاب شده</span>
                        </div>
                        <div className="flex items-center">
                          <Square className="w-4 h-4 text-gray-400 ml-2" />
                          <span className="text-sm text-gray-600">اشغال شده</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        {selectedSeats.length} صندلی از {booking?.passengerCount} صندلی انتخاب شده
                      </p>
                    </div>

                    {/* نمایش صندلی‌های اتوبوس */}
                    <div className="relative">
                      {/* نشانگر جلو اتوبوس */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 flex items-center space-x-2 space-x-reverse">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold">جلو</span>
                        </div>
                      </div>

                      {/* راهرو */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-12 -translate-x-1/2 bg-gray-100 rounded-lg"></div>
                      
                      {/* گرید صندلی‌ها */}
                      <div className="grid grid-cols-2 gap-12">
                        {/* ستون سمت راست */}
                        <div className="grid grid-cols-2 gap-2">
                          {Array.from({ length: 25 }, (_, i) => i + 1).map((seatNumber) => {
                            const seat = seats.find(s => s.number === seatNumber);
                            return (
                              <motion.button
                                key={seatNumber}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSeatClick(seatNumber)}
                                disabled={seat?.isOccupied}
                                className={`
                                  relative flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-300
                                  ${seat?.isOccupied 
                                    ? 'text-gray-400 cursor-not-allowed' 
                                    : selectedSeats.includes(seatNumber)
                                      ? 'text-primary'
                                      : 'text-gray-300 hover:text-gray-500'
                                  }
                                `}
                              >
                                <Armchair className="w-6 h-6" />
                                <span className="text-xs font-bold mt-1">{toPersianNumber(seatNumber)}</span>
                                {seat?.isOccupied && seat.passengerName && (
                                  <span className="absolute -bottom-4 left-0 right-0 text-xs text-gray-500 truncate">
                                    {seat.passengerName}
                                  </span>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>

                        {/* ستون سمت چپ */}
                        <div className="grid grid-cols-2 gap-2">
                          {Array.from({ length: 25 }, (_, i) => i + 26).map((seatNumber) => {
                            const seat = seats.find(s => s.number === seatNumber);
                            return (
                              <motion.button
                                key={seatNumber}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSeatClick(seatNumber)}
                                disabled={seat?.isOccupied}
                                className={`
                                  relative flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-300
                                  ${seat?.isOccupied 
                                    ? 'text-gray-400 cursor-not-allowed' 
                                    : selectedSeats.includes(seatNumber)
                                      ? 'text-primary'
                                      : 'text-gray-300 hover:text-gray-500'
                                  }
                                `}
                              >
                                <Armchair className="w-6 h-6" />
                                <span className="text-xs font-bold mt-1">{toPersianNumber(seatNumber)}</span>
                                {seat?.isOccupied && seat.passengerName && (
                                  <span className="absolute -bottom-4 left-0 right-0 text-xs text-gray-500 truncate">
                                    {seat.passengerName}
                                  </span>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>

                      {/* نشانگر عقب اتوبوس */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-8 flex items-center space-x-2 space-x-reverse">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold">عقب</span>
                        </div>
                      </div>

                      {/* راهنمای صندلی‌ها */}
                      <div className="mt-16 text-center text-sm text-gray-500">
                        <p>راهرو</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* درخواست‌های ویژه */}
          <Card className="p-6 shadow-md border-0 overflow-hidden relative mb-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <h2 className="text-2xl font-heading font-bold mb-6 border-b pb-4">درخواست‌های ویژه</h2>
              <Textarea
                placeholder="در صورت نیاز به توضیحات بیشتر یا درخواست‌های ویژه، اینجا بنویسید..."
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                className="h-32"
              />
            </div>
          </Card>

          {/* دکمه‌های عملیات */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => navigate(`/booking/${bookingId}/step2`)}
              className="border-gray-300 hover:bg-gray-100 transition-all duration-300"
            >
              بازگشت به مرحله قبل
            </Button>
            
            <Button 
              onClick={() => completeBookingMutation.mutate()}
              disabled={completeBookingMutation.isPending || saveStep3Mutation.isPending || !address || (caravan?.transportation_type === "زمینی" && selectedSeats.length !== booking?.passengerCount)}
              className="bg-gradient-to-l from-primary-600 to-primary hover:opacity-90 transition-all shadow-md"
            >
              {completeBookingMutation.isPending || saveStep3Mutation.isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  در حال ثبت...
                </>
              ) : (
                <>
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                  تایید نهایی رزرو
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="animate-slide-left delay-200">
          <Card className="p-6 shadow-md border-0 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-40 h-40 bg-primary/5 rounded-full -ml-16 -mt-16"></div>
            <div className="relative">
              <h2 className="text-2xl font-heading font-bold mb-6 border-b pb-4 flex items-center">
                <span className="ml-2 text-primary">•</span>
                اطلاعات تکمیلی
              </h2>
              
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="font-bold text-blue-700 mb-2 flex items-center">
                    <Phone className="ml-2 h-5 w-5" />
                    تماس با ما
                  </h3>
                  <p className="text-blue-600 text-sm">
                    برای هرگونه سوال یا راهنمایی می‌توانید با شماره زیر تماس بگیرید:
                  </p>
                  <p className="text-blue-700 font-bold mt-2">۰۹۹۰۲۳۸۲۴۱۶</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <h3 className="font-bold text-green-700 mb-2 flex items-center">
                    <MessageCircle className="ml-2 h-5 w-5" />
                    پیام‌رسان‌ها
                  </h3>
                  <p className="text-green-600 text-sm">
                    پس از تایید نهایی، لینک پرداخت از طریق پیام‌رسان‌های زیر ارسال خواهد شد:
                  </p>
                  <ul className="text-green-700 mt-2 space-y-1">
                    <li>• تلگرام</li>
                    <li>• واتساپ</li>
                    <li>• بله</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                  <h3 className="font-bold text-yellow-700 mb-2">نکات مهم</h3>
                  <ul className="text-yellow-600 text-sm space-y-2">
                    <li className="flex items-start">
                      <span className="inline-block w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 ml-2"></span>
                      <span>لطفا قبل از تایید نهایی، تمام اطلاعات را با دقت بررسی کنید.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="inline-block w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 ml-2"></span>
                      <span>پس از تایید نهایی، امکان ویرایش اطلاعات وجود ندارد.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="inline-block w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 ml-2"></span>
                      <span>لینک پرداخت تا ۲۴ ساعت معتبر خواهد بود.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
} 
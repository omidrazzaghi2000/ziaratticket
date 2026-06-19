import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, CheckCircle2, Phone, MessageCircle, Bus, User, Square, Armchair } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { djangoURL } from "@/App";

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

interface BookingStep3Data {
  address: string;
  specialRequests?: string;
  selectedSeats?: number[];
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  spouse: "همسر",
  child: "فرزند",
  parent: "والدین",
  sibling: "خواهر/برادر",
  other: "سایر",
};

export default function BookingStepThree({ params }: BookingStepThreeProps) {
  const bookingId = parseInt(params.bookingId);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [specialRequests, setSpecialRequests] = useState("");
  const [address, setAddress] = useState("");
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);

  // دریافت اطلاعات رزرو
  const { data: booking, isLoading: isLoadingBooking } = useQuery({
    queryKey: [djangoURL + `/api/bookings/${bookingId}`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/bookings/${bookingId}`);
      return response.json();
    },
  });

  // دریافت اطلاعات کاروان
  const { data: caravan } = useQuery({
    queryKey: [djangoURL + `/api/caravans/${booking?.caravan}`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/caravans/${booking?.caravan}`);
      return response.json();
    },
    enabled: !!booking?.caravan,
  });

  // دریافت وضعیت صندلی‌ها
  const { data: seats = [] } = useQuery<Seat[]>({
    queryKey: [djangoURL + `/api/bookings/${bookingId}/seats`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/bookings/${bookingId}/seats`);
      return response.json();
    },
    enabled: !!bookingId,
  });

  // ذخیره مرحله سوم
  const saveStep3Mutation = useMutation({
    mutationFn: async (data: BookingStep3Data) => {
      const response = await apiRequest("POST", `/api/bookings/${bookingId}/step3`, data);
      return response.json();
    },
    onError: (error: Error) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در ذخیره اطلاعات.",
        variant: "destructive",
      });
    },
  });

  // تکمیل رزرو
  const completeBookingMutation = useMutation({
    mutationFn: async () => {
      await saveStep3Mutation.mutateAsync({
        address,
        specialRequests,
        selectedSeats,
      });
      const response = await apiRequest("POST", `/api/bookings/${bookingId}/complete`, {
        selected_seats: selectedSeats,
      });
      const data = await response.json();
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

  // انتخاب صندلی
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
          <Button variant="outline" onClick={() => navigate("/")}>
            بازگشت به صفحه اصلی
          </Button>
        </div>
      </div>
    );
  }

  const companions: Companion[] = Array.isArray(booking.companions)
    ? booking.companions
    : [];

  const isGroundTransport =
    caravan?.transportation_type === "زمینی" ||
    booking?.transportation_type === "زمینی";

  const seatsRequired = booking?.passenger_count || 1;
  const canSubmit =
    address.trim() &&
    (!isGroundTransport || selectedSeats.length === seatsRequired);

  return (
    <div className="bg-gray-50 min-h-screen">
    <Header />
    <div className="container py-12 pt-28">
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
            مرحله ۳ از ۳: تایید نهایی
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* اطلاعات کاروان */}
          {caravan && (
            <Card className="p-6 shadow-md border-0 overflow-hidden relative">
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
          )}

          {/* اطلاعات مسافرین */}
          <Card className="p-6 shadow-md border-0 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <h2 className="text-2xl font-heading font-bold mb-6 border-b pb-4">اطلاعات مسافرین</h2>

              {/* سرپرست */}
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-4 flex items-center">
                  <User className="ml-2 h-5 w-5 text-primary" />
                  سرپرست
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
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

              {/* همراهان */}
              {companions.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-4 flex items-center">
                    <User className="ml-2 h-5 w-5 text-primary" />
                    همراهان ({companions.length} نفر)
                  </h3>
                  <div className="space-y-3">
                    {companions.map((companion, index) => (
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
                              {RELATIONSHIP_LABELS[companion.relationship] || companion.relationship}
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
          <Card className="p-6 shadow-md border-0 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <h2 className="text-2xl font-heading font-bold mb-4 border-b pb-4">آدرس</h2>
              <Textarea
                placeholder="لطفا آدرس خود را وارد کنید..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-28"
              />
            </div>
          </Card>

          {/* انتخاب صندلی - فقط برای کاروان زمینی */}
          {isGroundTransport && (
            <Card className="p-6 shadow-md border-0 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10"></div>
              <div className="relative">
                <h2 className="text-2xl font-heading font-bold mb-6 border-b pb-4 flex items-center">
                  <Bus className="ml-2 h-6 w-6 text-primary" />
                  انتخاب صندلی
                </h2>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-6 rounded border-2 border-gray-300 bg-white"></div>
                      <span className="text-sm text-gray-600">خالی</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-6 rounded border-2 border-primary bg-primary/20"></div>
                      <span className="text-sm text-gray-600">انتخاب شده</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-6 rounded border-2 border-gray-400 bg-gray-200"></div>
                      <span className="text-sm text-gray-600">اشغال شده</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-primary">
                    {selectedSeats.length} از {seatsRequired} صندلی انتخاب شده
                  </p>
                </div>

                {/* نمای اتوبوس */}
                <div className="bg-gray-50 rounded-xl p-4 overflow-x-auto">
                  <div className="min-w-[280px]">
                    {/* جلوی اتوبوس */}
                    <div className="flex justify-center mb-4">
                      <div className="bg-gray-300 rounded-t-3xl w-32 h-8 flex items-center justify-center text-sm font-bold text-gray-600">
                        جلو (راننده)
                      </div>
                    </div>

                    {/* گرید صندلی‌ها - ۴ صندلی در هر ردیف با راهرو */}
                    <div className="flex flex-col gap-2">
                      {Array.from({ length: Math.ceil(seats.length / 4) }, (_, rowIdx) => {
                        const rowSeats = seats.slice(rowIdx * 4, rowIdx * 4 + 4);
                        return (
                          <div key={rowIdx} className="flex justify-center gap-1 items-center">
                            <span className="text-xs text-gray-400 w-5 text-center">{rowIdx + 1}</span>
                            {/* دو صندلی راست */}
                            {rowSeats.slice(0, 2).map((seat) => (
                              <motion.button
                                key={seat.number}
                                whileHover={!seat.isOccupied ? { scale: 1.1 } : {}}
                                whileTap={!seat.isOccupied ? { scale: 0.95 } : {}}
                                onClick={() => handleSeatClick(seat.number)}
                                disabled={seat.isOccupied}
                                title={seat.isOccupied ? `اشغال شده توسط ${seat.passengerName || ''}` : `صندلی ${seat.number}`}
                                className={`
                                  w-10 h-10 rounded-lg flex flex-col items-center justify-center text-xs font-bold border-2 transition-all
                                  ${seat.isOccupied
                                    ? "bg-gray-200 border-gray-400 text-gray-400 cursor-not-allowed"
                                    : selectedSeats.includes(seat.number)
                                      ? "bg-primary/20 border-primary text-primary"
                                      : "bg-white border-gray-300 text-gray-600 hover:border-primary hover:text-primary"
                                  }
                                `}
                              >
                                <Armchair className="w-4 h-4" />
                                <span>{toPersian(seat.number)}</span>
                              </motion.button>
                            ))}
                            {/* راهرو */}
                            <div className="w-6"></div>
                            {/* دو صندلی چپ */}
                            {rowSeats.slice(2, 4).map((seat) => (
                              <motion.button
                                key={seat.number}
                                whileHover={!seat.isOccupied ? { scale: 1.1 } : {}}
                                whileTap={!seat.isOccupied ? { scale: 0.95 } : {}}
                                onClick={() => handleSeatClick(seat.number)}
                                disabled={seat.isOccupied}
                                title={seat.isOccupied ? `اشغال شده توسط ${seat.passengerName || ''}` : `صندلی ${seat.number}`}
                                className={`
                                  w-10 h-10 rounded-lg flex flex-col items-center justify-center text-xs font-bold border-2 transition-all
                                  ${seat.isOccupied
                                    ? "bg-gray-200 border-gray-400 text-gray-400 cursor-not-allowed"
                                    : selectedSeats.includes(seat.number)
                                      ? "bg-primary/20 border-primary text-primary"
                                      : "bg-white border-gray-300 text-gray-600 hover:border-primary hover:text-primary"
                                  }
                                `}
                              >
                                <Armchair className="w-4 h-4" />
                                <span>{toPersian(seat.number)}</span>
                              </motion.button>
                            ))}
                          </div>
                        );
                      })}
                    </div>

                    {/* عقب اتوبوس */}
                    <div className="flex justify-center mt-4">
                      <div className="bg-gray-300 rounded-b-3xl w-32 h-8 flex items-center justify-center text-sm font-bold text-gray-600">
                        عقب
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* درخواست‌های ویژه */}
          <Card className="p-6 shadow-md border-0 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <h2 className="text-2xl font-heading font-bold mb-4 border-b pb-4">درخواست‌های ویژه</h2>
              <Textarea
                placeholder="در صورت نیاز به توضیحات بیشتر یا درخواست‌های ویژه، اینجا بنویسید..."
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                className="h-28"
              />
            </div>
          </Card>

          {/* دکمه‌های عملیات */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => navigate(`/booking/${bookingId}/step2`)}
              className="border-gray-300 hover:bg-gray-100"
            >
              بازگشت به مرحله قبل
            </Button>

            <Button
              onClick={() => completeBookingMutation.mutate()}
              disabled={
                completeBookingMutation.isPending ||
                saveStep3Mutation.isPending ||
                !canSubmit
              }
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

        {/* ستون راهنما */}
        <div className="animate-slide-left delay-200">
          <Card className="p-6 shadow-md border-0 overflow-hidden relative sticky top-4">
            <div className="absolute top-0 left-0 w-40 h-40 bg-primary/5 rounded-full -ml-16 -mt-16"></div>
            <div className="relative">
              <h2 className="text-xl font-heading font-bold mb-6 border-b pb-4">
                اطلاعات تکمیلی
              </h2>

              <div className="space-y-4">
                {/* خلاصه قیمت */}
                <div className="bg-primary/10 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">مبلغ قابل پرداخت</p>
                  <p className="text-2xl font-bold text-primary-600">
                    {new Intl.NumberFormat("fa-IR").format(booking?.total_price || 0)}
                    <span className="text-sm font-normal mr-1">تومان</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {booking?.passenger_count} نفر
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="font-bold text-blue-700 mb-2 flex items-center text-sm">
                    <Phone className="ml-2 h-4 w-4" />
                    تماس با ما
                  </h3>
                  <p className="text-blue-600 text-xs mb-1">
                    برای هرگونه سوال تماس بگیرید:
                  </p>
                  <p className="text-blue-700 font-bold">۰۹۹۰۲۳۸۲۴۱۶</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <h3 className="font-bold text-green-700 mb-2 flex items-center text-sm">
                    <MessageCircle className="ml-2 h-4 w-4" />
                    پیام‌رسان‌ها
                  </h3>
                  <p className="text-green-600 text-xs mb-1">
                    لینک پرداخت از طریق:
                  </p>
                  <ul className="text-green-700 text-xs space-y-1">
                    <li>• تلگرام</li>
                    <li>• واتساپ</li>
                    <li>• بله</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                  <h3 className="font-bold text-yellow-700 mb-2 text-sm">نکات مهم</h3>
                  <ul className="text-yellow-600 text-xs space-y-1">
                    <li>• تمام اطلاعات را با دقت بررسی کنید.</li>
                    <li>• پس از تایید، امکان ویرایش وجود ندارد.</li>
                    <li>• لینک پرداخت تا ۲۴ ساعت معتبر است.</li>
                  </ul>
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

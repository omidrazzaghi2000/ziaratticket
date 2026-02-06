import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { CheckCircle2, Phone, MessageCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface BookingSuccessProps {
  params: {
    bookingId: string;
  };
}

export default function BookingSuccess({ params }: BookingSuccessProps) {
  const bookingId = parseInt(params.bookingId);
  const [, navigate] = useLocation();

  // دریافت اطلاعات رزرو
  const { data: booking, isLoading: isLoadingBooking } = useQuery({
    queryKey: ['/api/bookings', bookingId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/bookings/${bookingId}`);
      return response.json();
    },
  });

  // اگر در حال بارگذاری است
  if (isLoadingBooking) {
    return (
      <div className="container py-10">
        <div className="flex flex-col items-center justify-center">
          <div className="h-10 w-10 animate-spin text-primary mb-4">...</div>
          <p className="text-gray-500">در حال بارگذاری اطلاعات رزرو...</p>
        </div>
      </div>
    );
  }

  // اگر رزرو یافت نشد
  if (!booking) {
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
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 shadow-lg border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/5 rounded-full -ml-20 -mb-20"></div>
          
          <div className="relative text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              رزرو شما با موفقیت ثبت شد
            </h1>
            
            <p className="text-gray-600 mb-8">
              لینک پرداخت به شماره موبایل شما ارسال خواهد شد. لطفا در اسرع وقت نسبت به پرداخت هزینه اقدام کنید.
            </p>
            
            <div className="space-y-6 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="font-bold text-blue-700 mb-2 flex items-center justify-center">
                  <Phone className="ml-2 h-5 w-5" />
                  تماس با ما
                </h3>
                <p className="text-blue-600 text-sm">
                  برای هرگونه سوال یا راهنمایی می‌توانید با شماره زیر تماس بگیرید:
                </p>
                <p className="text-blue-700 font-bold mt-2">۰۹۹۰۲۳۸۲۴۱۶</p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <h3 className="font-bold text-green-700 mb-2 flex items-center justify-center">
                  <MessageCircle className="ml-2 h-5 w-5" />
                  پیام‌رسان‌ها
                </h3>
                <p className="text-green-600 text-sm">
                  لینک پرداخت از طریق پیام‌رسان‌های زیر ارسال خواهد شد:
                </p>
                <ul className="text-green-700 mt-2 space-y-1">
                  <li>• تلگرام</li>
                  <li>• واتساپ</li>
                  <li>• بله</li>
                </ul>
              </div>
            </div>
            
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="border-gray-300 hover:bg-gray-100 transition-all duration-300"
              >
                <ArrowLeft className="ml-2 h-4 w-4" />
                بازگشت به صفحه اصلی
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 
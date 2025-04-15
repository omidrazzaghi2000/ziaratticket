import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home, FileText, CalendarCheck, Clock } from "lucide-react";

export default function BookingConfirmation() {
  const [, navigate] = useLocation();
  
  // اگر کاربر به طور مستقیم وارد این صفحه شود، به صفحه اصلی هدایت می‌شود
  useEffect(() => {
    // اسکرول به بالای صفحه
    window.scrollTo(0, 0);
    
    const timeout = setTimeout(() => {
      // بعد از 60 ثانیه کاربر را به صفحه اصلی هدایت می‌کنیم
      navigate("/");
    }, 60000);
    
    return () => clearTimeout(timeout);
  }, [navigate]);
  
  return (
    <div className="min-h-[80vh] flex items-center justify-center py-16 px-4 bg-primary/5">
      <div className="container max-w-3xl animate-fade-in bg-white rounded-xl shadow-lg p-8 md:p-12 relative overflow-hidden">
        {/* دکوراسیون های پس‌زمینه */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full -ml-20 -mt-20 z-0"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-50 rounded-full -mr-32 -mb-32 z-0"></div>
        
        <div className="text-center relative z-10">
          <div className="animate-fade-in inline-flex flex-col items-center justify-center mb-8">
            <div className="w-28 h-28 bg-gradient-to-br from-green-400 to-green-600 rounded-full p-6 shadow-lg animate-pulse mb-4">
              <CheckCircle className="h-full w-full text-white" strokeWidth={1.5} />
            </div>
            
            <div className="inline-flex -mt-2 px-6 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-bold">
              تکمیل شد!
            </div>
          </div>
          
          <h1 className="text-4xl font-bold font-heading bg-gradient-to-r from-green-600 to-primary bg-clip-text text-transparent mb-6 animate-fade-in">
            رزرو شما با موفقیت ثبت شد
          </h1>
          
          <p className="text-gray-600 text-lg mb-10 animate-slide-up delay-200 max-w-xl mx-auto">
            از اینکه سفر معنوی خود را با ما برنامه‌ریزی کردید سپاسگزاریم.
            جزئیات رزرو به زودی برای شما پیامک خواهد شد.
          </p>
          
          <div className="bg-gradient-to-br from-white to-green-50 border border-green-100 rounded-xl p-8 mb-10 shadow-sm text-right relative overflow-hidden animate-slide-up delay-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-100/50 rounded-full -mr-8 -mt-8"></div>
            
            <div className="relative">
              <h2 className="text-2xl font-bold font-heading mb-6 flex items-center text-green-700">
                <FileText className="inline-block ml-2 h-6 w-6 text-green-600" strokeWidth={1.5} />
                اطلاعات مهم
              </h2>
              
              <div className="grid grid-cols-1 gap-y-6">
                <div className="flex items-start animate-slide-right delay-300">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center ml-3 mt-0.5">
                    <Clock className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-green-800 mb-1">پرداخت هزینه</h3>
                    <p className="text-gray-600">لطفاً جهت پرداخت هزینه، حداکثر تا ۴۸ ساعت آینده به دفتر کاروان مراجعه نمایید.</p>
                  </div>
                </div>
                
                <div className="flex items-start animate-slide-right delay-400">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center ml-3 mt-0.5">
                    <FileText className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-green-800 mb-1">مدارک مورد نیاز</h3>
                    <p className="text-gray-600">اصل شناسنامه، کارت ملی و گذرنامه معتبر (با حداقل ۶ ماه اعتبار) برای تمامی مسافرین</p>
                  </div>
                </div>
                
                <div className="flex items-start animate-slide-right delay-500">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center ml-3 mt-0.5">
                    <CalendarCheck className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-green-800 mb-1">قوانین انصراف</h3>
                    <p className="text-gray-600">در صورت انصراف تا ۱۴ روز قبل از سفر، ۸۰٪ مبلغ عودت داده می‌شود.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-slide-up delay-500">
            <Button 
              onClick={() => navigate("/")}
              className="gap-2 bg-gradient-to-r from-primary-600 to-primary transition-all duration-300 hover:shadow-md"
              size="lg"
            >
              <Home className="h-4 w-4" />
              بازگشت به صفحه اصلی
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate("/bookings")}
              className="border-primary text-primary hover:bg-primary/10 transition-all duration-300"
              size="lg"
            >
              <FileText className="h-4 w-4 ml-2" />
              مشاهده رزروهای من
            </Button>
          </div>
          
          <p className="text-gray-400 text-sm mt-8 animate-fade-in delay-500">
            جهت پیگیری وضعیت رزرو، می‌توانید با شماره ۰۲۱-۱۲۳۴۵۶۷۸ تماس بگیرید.
          </p>
        </div>
      </div>
    </div>
  );
}
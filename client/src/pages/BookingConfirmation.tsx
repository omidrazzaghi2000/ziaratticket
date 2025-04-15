import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home } from "lucide-react";

export default function BookingConfirmation() {
  const [, navigate] = useLocation();
  
  // اگر کاربر به طور مستقیم وارد این صفحه شود، به صفحه اصلی هدایت می‌شود
  useEffect(() => {
    const timeout = setTimeout(() => {
      // بعد از 30 ثانیه کاربر را به صفحه اصلی هدایت می‌کنیم
      navigate("/");
    }, 30000);
    
    return () => clearTimeout(timeout);
  }, [navigate]);
  
  return (
    <div className="container py-10 max-w-3xl">
      <div className="text-center">
        <div className="inline-flex items-center justify-center bg-green-100 p-6 rounded-full mb-6">
          <CheckCircle className="h-16 w-16 text-green-600" />
        </div>
        
        <h1 className="text-3xl font-bold mb-4">رزرو شما با موفقیت ثبت شد</h1>
        
        <p className="text-gray-600 text-lg mb-8">
          از اینکه سفر معنوی خود را با ما برنامه‌ریزی کردید متشکریم. جزئیات رزرو برای شما پیامک خواهد شد.
        </p>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8 text-right">
          <h2 className="text-xl font-bold mb-4">اطلاعات مهم</h2>
          
          <ul className="space-y-3 text-gray-700">
            <li className="flex">
              <span className="inline-block w-2 h-2 bg-primary rounded-full mt-2 ml-2"></span>
              <span>لطفاً جهت پرداخت هزینه، حداکثر تا ۴۸ ساعت آینده به دفتر کاروان مراجعه نمایید.</span>
            </li>
            <li className="flex">
              <span className="inline-block w-2 h-2 bg-primary rounded-full mt-2 ml-2"></span>
              <span>مدارک لازم: اصل شناسنامه، کارت ملی و گذرنامه معتبر (با حداقل ۶ ماه اعتبار)</span>
            </li>
            <li className="flex">
              <span className="inline-block w-2 h-2 bg-primary rounded-full mt-2 ml-2"></span>
              <span>در صورت انصراف تا ۱۴ روز قبل از سفر، ۸۰٪ مبلغ عودت داده می‌شود.</span>
            </li>
            <li className="flex">
              <span className="inline-block w-2 h-2 bg-primary rounded-full mt-2 ml-2"></span>
              <span>یک کپی از اطلاعات رزرو به شماره موبایل شما ارسال خواهد شد.</span>
            </li>
          </ul>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button 
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            بازگشت به صفحه اصلی
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => navigate("/bookings")}
          >
            مشاهده رزروهای من
          </Button>
        </div>
      </div>
    </div>
  );
}
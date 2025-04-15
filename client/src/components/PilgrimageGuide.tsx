import { Check } from "lucide-react";

export default function PilgrimageGuide() {
  return (
    <section id="guide" className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">راهنمای سفر زیارتی کربلا</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-bold mb-4 text-primary-500">مدارک مورد نیاز</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <Check className="text-green-500 mt-1 ml-2 h-5 w-5" />
                <span>گذرنامه با حداقل ۶ ماه اعتبار از تاریخ سفر</span>
              </li>
              <li className="flex items-start">
                <Check className="text-green-500 mt-1 ml-2 h-5 w-5" />
                <span>دو قطعه عکس ۴×۳ جدید (برای خانم‌ها با حجاب کامل)</span>
              </li>
              <li className="flex items-start">
                <Check className="text-green-500 mt-1 ml-2 h-5 w-5" />
                <span>کپی شناسنامه و کارت ملی</span>
              </li>
              <li className="flex items-start">
                <Check className="text-green-500 mt-1 ml-2 h-5 w-5" />
                <span>تکمیل فرم اطلاعات فردی در سامانه</span>
              </li>
              <li className="flex items-start">
                <Check className="text-green-500 mt-1 ml-2 h-5 w-5" />
                <span>کارت واکسن برای واکسیناسیون‌های موردنیاز</span>
              </li>
            </ul>
            
            <h3 className="text-xl font-bold mb-4 mt-8 text-primary-500">وسایل ضروری همراه</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <Check className="text-green-500 mt-1 ml-2 h-5 w-5" />
                <span>لباس مناسب برای شرایط آب و هوایی عراق</span>
              </li>
              <li className="flex items-start">
                <Check className="text-green-500 mt-1 ml-2 h-5 w-5" />
                <span>داروهای مورد نیاز و نسخه پزشک</span>
              </li>
              <li className="flex items-start">
                <Check className="text-green-500 mt-1 ml-2 h-5 w-5" />
                <span>ادعیه و زیارتنامه‌ها</span>
              </li>
              <li className="flex items-start">
                <Check className="text-green-500 mt-1 ml-2 h-5 w-5" />
                <span>کفش راحت مناسب پیاده‌روی</span>
              </li>
              <li className="flex items-start">
                <Check className="text-green-500 mt-1 ml-2 h-5 w-5" />
                <span>وسایل بهداشتی شخصی</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-bold mb-4 text-primary-500">نکات مهم سفر</h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-gray-800 mb-2">آداب زیارت</h4>
                <p className="text-gray-700">زیارت امام حسین (ع) و حضرت ابوالفضل (ع) از آداب خاصی برخوردار است که رعایت آن برای زائرین توصیه می‌شود. قبل از سفر مطالعه آداب زیارت و زیارتنامه‌ها را فراموش نکنید.</p>
              </div>
              
              <div>
                <h4 className="font-bold text-gray-800 mb-2">شرایط آب و هوایی</h4>
                <p className="text-gray-700">آب و هوای عراق در فصول مختلف سال متفاوت است. در تابستان بسیار گرم و خشک و در زمستان سرد و بارانی می‌باشد. لباس مناسب با توجه به فصل سفر همراه داشته باشید.</p>
              </div>
              
              <div>
                <h4 className="font-bold text-gray-800 mb-2">ارتباطات</h4>
                <p className="text-gray-700">برای ارتباط با خانواده می‌توانید از سیم‌کارت‌های عراقی استفاده کنید که در مرز یا شهرهای زیارتی قابل تهیه هستند. همچنین در بیشتر هتل‌ها و زائرسراها اینترنت وای‌فای موجود است.</p>
              </div>
              
              <div>
                <h4 className="font-bold text-gray-800 mb-2">ارز مورد نیاز</h4>
                <p className="text-gray-700">واحد پول عراق، دینار است. می‌توانید مقداری دلار یا یورو همراه داشته باشید و در صورت نیاز در صرافی‌های عراق تبدیل کنید. برخی از فروشندگان نیز تومان ایران را قبول می‌کنند.</p>
              </div>
              
              <div>
                <h4 className="font-bold text-gray-800 mb-2">امنیت و سلامت</h4>
                <p className="text-gray-700">همیشه با کاروان حرکت کنید و از دستورات مدیر کاروان پیروی نمایید. مراقب وسایل شخصی خود باشید و از مصرف غذا و آب از منابع نامطمئن خودداری کنید.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

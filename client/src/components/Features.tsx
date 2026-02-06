import { Shield, Heart, Map, Headphones } from "lucide-react";

export default function Features() {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-primary-800">چرا سامانه رزرو کاروان کربلا؟</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 text-center">
            <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold mb-3 text-primary-700">امنیت و اطمینان</h3>
            <p className="text-gray-600">تمامی کاروان‌ها دارای مجوز رسمی از سازمان حج و زیارت هستند.</p>
          </div>
          
          <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 text-center">
            <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold mb-3 text-primary-700">خدمات ویژه</h3>
            <p className="text-gray-600">ارائه خدمات اسکان، تغذیه و حمل و نقل با کیفیت برای زائرین.</p>
          </div>
          
          <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 text-center">
            <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Map className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold mb-3 text-primary-700">تنوع مسیرها</h3>
            <p className="text-gray-600">انتخاب از میان مسیرهای زمینی، هوایی و ترکیبی برای سفر.</p>
          </div>
          
          <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 text-center">
            <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Headphones className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold mb-3 text-primary-700">پشتیبانی ۲۴ ساعته</h3>
            <p className="text-gray-600">ارتباط با کارشناسان ما در تمام مراحل ثبت‌نام و سفر.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

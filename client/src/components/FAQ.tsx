import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

export default function FAQ() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);
  
  const faqs: FAQItem[] = [
    {
      question: "شرایط انصراف از سفر چگونه است؟",
      answer: (
        <>
          <p className="text-gray-700">
            در صورت انصراف از سفر، با توجه به زمان باقی‌مانده تا تاریخ حرکت، مبلغی به عنوان جریمه کسر خواهد شد:
          </p>
          <ul className="list-disc list-inside mt-2 mr-4 text-gray-700 space-y-1">
            <li>تا ۳۰ روز قبل از سفر: ۱۰٪ جریمه</li>
            <li>۱۵ تا ۳۰ روز قبل از سفر: ۳۰٪ جریمه</li>
            <li>۷ تا ۱۵ روز قبل از سفر: ۵۰٪ جریمه</li>
            <li>کمتر از ۷ روز: ۷۰٪ جریمه</li>
          </ul>
          <p className="text-gray-700 mt-2">
            لازم به ذکر است در صورتی که برای شما جایگزین معرفی شود، فقط هزینه تغییر نام کسر خواهد شد.
          </p>
        </>
      ),
    },
    {
      question: "آیا امکان تقسیط هزینه سفر وجود دارد؟",
      answer: (
        <p className="text-gray-700">
          بله، برای کاروان‌های با تاریخ حرکت بیش از ۳ ماه، امکان پرداخت اقساطی فراهم است. در این صورت ۵۰٪ مبلغ به عنوان پیش‌پرداخت دریافت می‌شود و مابقی در اقساط ماهانه تا قبل از تاریخ حرکت قابل پرداخت است. برای اطلاعات بیشتر با مدیران کاروان تماس بگیرید.
        </p>
      ),
    },
    {
      question: "برای کودکان چه تسهیلاتی در نظر گرفته شده است؟",
      answer: (
        <p className="text-gray-700">
          برای کودکان زیر ۲ سال، تنها هزینه بیمه و ویزا دریافت می‌شود. کودکان ۲ تا ۱۲ سال از ۲۰٪ تخفیف در هزینه کل برخوردار می‌شوند. همچنین در کاروان‌های مخصوص خانواده، خدمات ویژه‌ای برای کودکان از جمله برنامه‌های متناسب با سن آن‌ها و غذای مخصوص در نظر گرفته شده است.
        </p>
      ),
    },
    {
      question: "آیا امکان شرکت در پیاده‌روی اربعین هم وجود دارد؟",
      answer: (
        <p className="text-gray-700">
          بله، کاروان‌های ویژه اربعین در زمان‌های مناسب برنامه‌ریزی می‌شوند که شامل حضور در پیاده‌روی اربعین نیز هستند. این کاروان‌ها معمولاً از چند هفته قبل از اربعین آغاز به ثبت‌نام می‌کنند و با توجه به استقبال زیاد، توصیه می‌شود ثبت‌نام خود را زودتر انجام دهید. در بخش کاروان‌ها می‌توانید فیلتر "ویژه اربعین" را انتخاب کنید.
        </p>
      ),
    },
    {
      question: "آیا هزینه بیمه در قیمت کاروان لحاظ شده است؟",
      answer: (
        <p className="text-gray-700">
          بله، هزینه بیمه پایه در قیمت کلی کاروان لحاظ شده است. این بیمه شامل پوشش حوادث، درمان اضطراری و فوت می‌باشد. در صورت تمایل به استفاده از بیمه‌های تکمیلی با پوشش بیشتر، می‌توانید با پرداخت هزینه اضافی، از این خدمات نیز بهره‌مند شوید. جزئیات بیمه در بخش "اطلاعات کاروان" قابل مشاهده است.
        </p>
      ),
    },
  ];
  
  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };
  
  return (
    <section id="faq" className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">سوالات متداول</h2>
        
        <div className="max-w-3xl mx-auto">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                <button 
                  className="w-full flex justify-between items-center p-4 text-right bg-gray-50 hover:bg-gray-100 transition"
                  onClick={() => toggleFAQ(index)}
                >
                  <span className="font-bold">{faq.question}</span>
                  {openFAQ === index ? (
                    <ChevronUp className="text-gray-500 h-5 w-5" />
                  ) : (
                    <ChevronDown className="text-gray-500 h-5 w-5" />
                  )}
                </button>
                <div 
                  className={`p-4 border-t border-gray-200 bg-white ${
                    openFAQ === index ? "block" : "hidden"
                  }`}
                >
                  {faq.answer}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

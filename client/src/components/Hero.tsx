import shrineImage from '../assets/images/Travel-to-Karbala.jpg';

export default function Hero() {
  return (
    <section className="relative bg-primary-600 text-white overflow-hidden">
      {/* تصویر بک‌گراند با استایل fit */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${shrineImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.2,
          objectFit: "cover"
        }}
      ></div>
      
      {/* بک‌گراند با افکت گرادیان */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary-700/90 to-primary-900/80 z-1"></div>
      
      <div className="container mx-auto px-4 py-20 lg:py-32 relative z-10">
        <div className="max-w-3xl text-center mx-auto">
          <h1 className="font-lalezar text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in text-green-800 drop-shadow-lg">
            سفر معنوی به کربلای معلی
          </h1>
          
          <p className="text-lg md:text-xl text-green-800/90 mb-10 animate-slide-up delay-200 max-w-2xl mx-auto drop-shadow">
            با استفاده از سامانه رزرو کاروان کربلا، سفر زیارتی خود را با خیال راحت برنامه‌ریزی کنید و از مزایای رزرو آنلاین بهره‌مند شوید.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-reverse sm:space-x-6">
            <a 
              href="#caravans" 
              className="bg-green-200 hover:bg-green-100 text-green-800 px-8 py-4 rounded-lg font-bold shadow-lg transition-all duration-300 transform hover:scale-105 animate-slide-right delay-300"
            >
              مشاهده کاروان‌ها
            </a>
            <a 
              href="#guide" 
                className="bg-transparent border-2 border-green-800 text-green-800 px-8 py-4 rounded-lg font-bold hover:bg-green-100/20 transition-all duration-300 animate-slide-left delay-400"
            >
              راهنمای سفر
            </a>
          </div>
          
          {/* اضافه کردن نشانگر اسکرول به پایین */}
          <a 
            href="#caravans"
            className="absolute bottom-10 left-1/2 transform -translate-x-1/2 hidden md:block cursor-pointer group"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector('#caravans')?.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
              });
            }}
          >
            <div className="w-8 h-12 border-2 border-white rounded-full flex justify-center pt-2 group-hover:border-opacity-80 transition-all duration-300">
              <svg 
                className="w-4 h-4 text-white animate-[bounce_2s_ease-in-out_infinite] group-hover:opacity-80" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>
          </a>
        </div>
      </div>
      
      {/* دکوراسیون */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
    </section>
  );
}

export default function Hero() {
  return (
    <section className="relative bg-primary-500 text-white overflow-hidden">
      <div className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1562979314-bee79f99c8cc?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center bg-no-repeat opacity-30"></div>
      
      {/* بک‌گراند با افکت گرادیان */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary-600/80 to-primary-900/60 z-1"></div>
      
      <div className="container mx-auto px-4 py-20 lg:py-32 relative z-10">
        <div className="max-w-3xl text-center mx-auto">
          <h1 className="font-lalezar text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in text-transparent bg-clip-text bg-gradient-to-r from-white to-white/80">
            سفر معنوی به کربلای معلی
          </h1>
          
          <p className="text-lg md:text-xl opacity-90 mb-10 animate-slide-up delay-200 max-w-2xl mx-auto">
            با استفاده از سامانه رزرو کاروان کربلا، سفر زیارتی خود را با خیال راحت برنامه‌ریزی کنید و از مزایای رزرو آنلاین بهره‌مند شوید.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-reverse sm:space-x-6">
            <a 
              href="#caravans" 
              className="bg-white text-primary-600 px-8 py-4 rounded-lg font-bold shadow-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 animate-slide-right delay-300"
            >
              مشاهده کاروان‌ها
            </a>
            <a 
              href="#guide" 
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-white/10 transition-all duration-300 animate-slide-left delay-400"
            >
              راهنمای سفر
            </a>
          </div>
          
          {/* اضافه کردن نشانگر اسکرول به پایین */}
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce hidden md:block">
            <div className="w-8 h-12 border-2 border-white rounded-full flex justify-center pt-2">
              <div className="w-1 h-3 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* دکوراسیون */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
    </section>
  );
}

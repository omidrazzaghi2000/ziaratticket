export default function Hero() {
  return (
    <section className="relative bg-primary-500 text-white overflow-hidden">
      <div className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1562979314-bee79f99c8cc?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center bg-no-repeat opacity-30"></div>
      <div className="container mx-auto px-4 py-16 lg:py-24 relative z-10">
        <div className="max-w-2xl text-center mx-auto">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">سفر معنوی به کربلای معلی</h1>
          <p className="text-lg md:text-xl opacity-90 mb-8">با استفاده از سامانه رزرو کاروان کربلا، سفر زیارتی خود را با خیال راحت برنامه‌ریزی کنید.</p>
          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-reverse sm:space-x-4">
            <a href="#caravans" className="bg-white text-primary-600 px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-gray-100 transition">
              مشاهده کاروان‌ها
            </a>
            <a href="#guide" className="bg-transparent border-2 border-white text-white px-6 py-3 rounded-lg font-bold hover:bg-white/10 transition">
              راهنمای سفر
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

import { Link } from "wouter";

export default function Header() {
  return (
    <header className="bg-white shadow">
      <div className="container mx-auto py-4 px-4 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center text-primary-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h2.5M15 11h4.5a2 2 0 012 2v1a2 2 0 002 2h2.055M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h.5A2.5 2.5 0 0022 5.5V3.935M12 21.5v-5" />
              </svg>
            </div>
            <div className="mr-3">
              <h1 className="text-xl font-bold text-primary-500">سامانه رزرو کاروان کربلا</h1>
              <p className="text-sm text-gray-500">زیارت با آرامش و اطمینان</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            <Link href="/">
              <a className="text-gray-600 hover:text-primary-500 font-medium">صفحه اصلی</a>
            </Link>
            <a href="#caravans" className="text-gray-600 hover:text-primary-500 font-medium">کاروان‌ها</a>
            <a href="#guide" className="text-gray-600 hover:text-primary-500 font-medium">راهنمای زائرین</a>
            <a href="#faq" className="text-gray-600 hover:text-primary-500 font-medium">سوالات متداول</a>
            <a href="#contact" className="text-gray-600 hover:text-primary-500 font-medium">تماس با ما</a>
          </nav>
        </div>
      </div>
    </header>
  );
}

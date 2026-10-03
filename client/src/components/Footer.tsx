import { Phone } from "lucide-react";

const PHONE = "09902382416";

export default function Footer() {
  return (
    <footer className="bg-primary text-white/70 py-7">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <span>کاروان کربلا — رزرو آنلاین کاروان‌های زیارتی</span>

        <a href={`tel:${PHONE}`} className="flex items-center gap-2 hover:text-white transition-colors">
          <Phone className="h-4 w-4" />
          <span dir="ltr">{PHONE}</span>
        </a>
      </div>
    </footer>
  );
}

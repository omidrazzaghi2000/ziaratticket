import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Send } from "lucide-react";

const newsletterSchema = z.object({
  email: z.string().email({ message: "ایمیل معتبر نیست" }),
});

export default function Footer() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const { mutate: subscribeNewsletter, isPending } = useMutation({
    mutationFn: (data: { email: string }) => apiRequest("POST", "/api/newsletters", data),
    onSuccess: () => {
      toast({ title: "عضویت موفق", description: "با موفقیت در خبرنامه عضو شدید." });
      setEmail("");
    },
    onError: (error: Error) => {
      toast({ title: "خطا", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    try {
      subscribeNewsletter(newsletterSchema.parse({ email }));
    } catch {
      toast({ title: "ایمیل نامعتبر", description: "لطفاً یک ایمیل معتبر وارد کنید.", variant: "destructive" });
    }
  };

  const links = [
    { label: "صفحه اصلی", href: "#" },
    { label: "کاروان‌ها", href: "#caravans" },
    { label: "راهنمای زائرین", href: "#guide" },
    { label: "سوالات متداول", href: "#faq" },
    { label: "تماس با ما", href: "#contact" },
  ];

  const services = [
    { label: "رزرو کاروان‌های عتبات", href: "#caravans" },
    { label: "کاروان‌های ویژه اربعین", href: "#caravans" },
    { label: "سفرهای خانوادگی", href: "#caravans" },
    { label: "بیمه زائرین", href: "#guide" },
    { label: "مشاوره سفر زیارتی", href: "#contact" },
  ];

  return (
    <footer className="bg-gradient-to-b from-gray-900 to-gray-950 text-white">
      <div className="container mx-auto px-4 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-white">سامانه کاروان کربلا</div>
                <div className="text-gray-400 text-xs">زیارت با آرامش</div>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              سامانه رزرو کاروان کربلا با هدف تسهیل سفر زیارتی زائران به عتبات عالیات راه‌اندازی شده است.
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <span>۰۲۱-۱۲۳۴۵۶۷۸</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <span>info@karvan-karbala.ir</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-base font-bold mb-5 text-white">دسترسی سریع</h4>
            <ul className="space-y-2.5">
              {links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors duration-200 flex items-center gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 group-hover:bg-primary transition-colors" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-base font-bold mb-5 text-white">خدمات ما</h4>
            <ul className="space-y-2.5">
              {services.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors duration-200 flex items-center gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 group-hover:bg-primary transition-colors" />
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-base font-bold mb-5 text-white">عضویت در خبرنامه</h4>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">
              از آخرین کاروان‌ها و تخفیف‌های ویژه باخبر شوید.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="ایمیل شما"
                  className="flex-grow bg-white/5 border border-white/10 text-white placeholder-gray-500 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={isPending}
                  className="bg-primary hover:bg-primary/90 text-white p-2.5 rounded-xl transition-colors shrink-0"
                >
                  <Send className="h-4 w-4" />
                </motion.button>
              </div>
            </form>

            {/* Social */}
            <div className="flex gap-2 mt-6">
              {[
                {
                  label: "تلگرام",
                  path: "M22.05 1.577c-.393-.016-.784.08-1.117.235-.484.186-4.92 1.902-9.41 3.64-2.26.873-4.518 1.746-6.256 2.415-1.737.67-3.045 1.168-3.114 1.192-.46.16-.868.51-1.1.896-.24.394-.25.842-.14 1.24.32 1.09 1.472 6.32 1.556 6.65.065.254.222.496.46.643.24.152.485.187.726.17.24-.05.48-.226 2.43-1.26.654-.348 1.437-.765 1.778-.95.69-.36 1.924.243 2.004.315.243.216.462.38 1.06.21.194-.057.422-.15.673-.233.63-.197 1.47-.42 2.107-.583.507-.143.98-.276 1.052-.215.11.09.134.35.134.66.006.417.05.865.322 1.08.27.215.664.096 1.04-.07.376-.165 2.312-1.346 3.113-1.804l.424-.23c.19-.106.297-.237.362-.386.064-.148.112-.332.112-.522.007-.515-.176-.855-.36-1.1-.317-.422-.846-.673-1.194-.823-.153-.065-3.642-1.535-4.03-1.7-.393-.164-.678-.118-1.02.002-.55.194-1.2.964-1.548 1.277-.346.313-.707.103-1.246-.21z",
                },
                {
                  label: "اینستاگرام",
                  path: "M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z",
                },
              ].map((social) => (
                <motion.a
                  key={social.label}
                  href="#"
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.15)" }}
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d={social.path} />
                  </svg>
                </motion.a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            تمامی حقوق برای سامانه رزرو کاروان کربلا محفوظ است. &copy; ۱۴۰۳
          </p>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <span>ساخته شده با</span>
            <span className="text-red-400 mx-0.5">♥</span>
            <span>برای زائران اهل بیت</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

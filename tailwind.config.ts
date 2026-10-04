import type { Config } from "tailwindcss";

import clientConfig from "./client/tailwind.config";

/**
 * بیلد تولید از client/tailwind.config.ts ساخته می‌شود (کانتکست داکر ./client است)
 * و فقط همان فایل رنگ‌های gold و cream، سایه‌ها و اندازه‌ی تیترها را دارد.
 * این فایل همان تنظیمات را با مسیرهای ریشه‌ی مخزن به کار می‌برد تا دو منبع
 * حقیقتِ واگرا نداشته باشیم؛ پیش از این، بیلد ریشه کلاس‌هایی مثل
 * bg-cream-50/95 را تولید نمی‌کرد و سربرگ بی‌زمینه می‌ماند.
 */
export default {
  ...clientConfig,
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
} satisfies Config;

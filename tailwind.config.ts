import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        /*
         * طلایی و کرم — رنگ‌های اصلی هویت بصری سایت.
         * ۴۰ جا در کد از کلاس‌های gold-* و cream-* استفاده شده بود ولی هیچ‌کدام
         * در این فایل تعریف نشده بودند، پس تِیلویند چیزی تولید نمی‌کرد و آن
         * کلاس‌ها بی‌اثر بودند؛ مثلاً سربرگ با bg-cream-50/95 کاملاً بی‌زمینه
         * می‌ماند و متنش روی هر پس‌زمینه‌ای گم می‌شد.
         * مقادیر بر اساس همان متغیرهای --gold در index.css است.
         */
        gold: {
          50: "hsl(42 65% 95%)",
          100: "hsl(42 65% 90%)",
          200: "hsl(42 65% 84%)",   /* --gold-light */
          300: "hsl(42 62% 74%)",
          400: "hsl(42 60% 64%)",
          500: "hsl(42 60% 52%)",   /* --gold */
          600: "hsl(40 58% 44%)",
          700: "hsl(38 55% 35%)",   /* --gold-dark */
          800: "hsl(38 55% 27%)",
          900: "hsl(38 50% 20%)",
        },
        cream: {
          50: "hsl(43 45% 98%)",
          100: "hsl(43 40% 95%)",
          200: "hsl(42 32% 90%)",
          300: "hsl(40 26% 84%)",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 40, 34, .04), 0 4px 16px rgba(16, 40, 34, .06)",
        "card-hover": "0 2px 4px rgba(16, 40, 34, .06), 0 12px 32px rgba(16, 40, 34, .10)",
        "emerald-sm": "0 2px 8px hsl(var(--primary) / .25)",
      },
      fontSize: {
        "display-sm": ["1.875rem", { lineHeight: "2.4rem", fontWeight: "700" }],
        "display-md": ["2.25rem", { lineHeight: "2.8rem", fontWeight: "700" }],
        "display-lg": ["3rem", { lineHeight: "3.4rem", fontWeight: "800" }],
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;

import { Phone, MessageCircle } from "lucide-react";

import {
  SUPPORT_PHONE_FA,
  SUPPORT_TEL_HREF,
  SUPPORT_EITAA,
  SUPPORT_BALE,
} from "@/lib/support";

interface Props {
  /** compact: یک خط کوتاه زیر دکمه‌ی رزرو — card: جعبه‌ی کامل با پیام‌رسان‌ها */
  variant?: "compact" | "card";
  title?: string;
}

/**
 * «سؤالی دارید؟» — پیش از رزرو، زائر باید بتواند بدون جست‌وجو زنگ بزند.
 * شماره همیشه دیده می‌شود (نه فقط پشت یک آیکن) تا روی دسکتاپ هم که
 * لینک tel کاری نمی‌کند، بشود یادداشتش کرد.
 */
export default function ContactHelp({ variant = "compact", title }: Props) {
  if (variant === "compact") {
    return (
      <a
        href={SUPPORT_TEL_HREF}
        className="flex items-center justify-center gap-2 w-full min-h-11 rounded-xl border border-primary/25 bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors"
      >
        <Phone className="h-4 w-4" aria-hidden="true" />
        سؤالی دارید؟ تماس با ما
        <bdi dir="ltr" className="font-bold">{SUPPORT_PHONE_FA}</bdi>
      </a>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h3 className="font-heading font-bold text-sm text-foreground mb-1 flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-primary" aria-hidden="true" />
        {title ?? "مشاوره و راهنمایی پیش از رزرو"}
      </h3>
      <p className="text-xs text-muted-foreground leading-6 mb-4">
        اگر سؤالی دارید یا اطلاعات کاروان برایتان کامل نیست، پیش از ثبت‌نام با ما تماس بگیرید.
      </p>

      <a
        href={SUPPORT_TEL_HREF}
        className="flex items-center justify-center gap-2 w-full min-h-12 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors"
      >
        <Phone className="h-4 w-4" aria-hidden="true" />
        <bdi dir="ltr">{SUPPORT_PHONE_FA}</bdi>
      </a>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <a
          href={SUPPORT_EITAA}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 min-h-11 rounded-xl border border-border text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          ایتا
        </a>
        <a
          href={SUPPORT_BALE}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 min-h-11 rounded-xl border border-border text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          بله
        </a>
      </div>
    </div>
  );
}

import { ChevronLeft, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import ContactHelp from "@/components/ContactHelp";
import { toPersianDigits } from "@/lib/digits";
import { caravanFactRows, type CaravanFacts } from "@/lib/caravan";

type Tone = "open" | "soon" | "closed" | "full";

const TONE_STYLES: Record<Tone, string> = {
  open: "bg-emerald-100 text-emerald-800 border-emerald-200",
  soon: "bg-amber-100 text-amber-800 border-amber-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
  full: "bg-red-100 text-red-700 border-red-200",
};

export interface CaravanSummary extends CaravanFacts {
  id: number;
  name?: string | null;
  price?: number | null;
  remaining_capacity?: number | null;
  /** از بک‌اند: «دارای ظرفیت» / «ثبت‌نام به‌زودی» / «تکمیل شده» */
  availability_label?: string | null;
  availability_tone?: Tone | null;
  is_bookable?: boolean;
}

interface Props {
  caravan: CaravanSummary;
  /** عنوان کاروان بالای کارت (در صفحه‌ی خود کاروان لازم نیست، آنجا تیتر صفحه است) */
  showName?: boolean;
  onAction: () => void;
  actionLabel?: string;
  /** پیوند کم‌رنگ زیر دکمه‌ی اصلی (مثلاً «مشاهده جزئیات کامل») */
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/**
 * کارت خلاصه‌ی کاروان — همان چیزی که زائر برای تصمیم‌گیری لازم دارد و بس.
 * هم در فهرست مقصد (چندتا زیر هم) و هم در صفحه‌ی کاروان استفاده می‌شود تا
 * زائر دو جور چیدمان متفاوت نبیند.
 */
export default function CaravanSummaryCard({
  caravan,
  showName = false,
  onAction,
  actionLabel = "ثبت‌نام و رزرو",
  secondaryLabel,
  onSecondary,
}: Props) {
  const isFull = (caravan.remaining_capacity ?? 0) <= 0;
  const tone: Tone = caravan.availability_tone ?? (isFull ? "full" : "open");
  const statusLabel = caravan.availability_label ?? (isFull ? "تکمیل شده" : "دارای ظرفیت");
  // رزرو فقط وقتی باز است که بک‌اند هم تأیید کند؛ کاروان «به‌زودی» دیده می‌شود ولی دکمه‌اش قفل است
  const canBook = caravan.is_bookable ?? !isFull;
  const rows = caravanFactRows(caravan);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-md overflow-hidden h-full flex flex-col">
      {/* قیمت هر نفر */}
      <div className="bg-gradient-to-br from-primary to-primary/80 p-5 text-center">
        {showName && caravan.name && (
          <h3 className="font-heading font-bold text-white text-lg mb-2 leading-tight">{caravan.name}</h3>
        )}
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border mb-3 ${TONE_STYLES[tone]}`}
        >
          {tone === "soon" && <Clock className="h-3 w-3" aria-hidden="true" />}
          {statusLabel}
        </span>
        <p className="text-white/75 text-xs mb-1">قیمت هر نفر</p>
        <p className="font-heading text-3xl font-black text-white">
          {new Intl.NumberFormat("fa-IR").format(caravan.price ?? 0)}
          <span className="text-base font-normal mr-1">تومان</span>
        </p>
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <dl className="space-y-0 mb-4">
          {rows.map((row, i) => (
            <div
              key={i}
              className="flex items-baseline justify-between gap-4 text-sm border-b border-border py-2.5 first:pt-0 last:border-0 last:pb-0"
            >
              <dt className="text-muted-foreground shrink-0">{row.label}</dt>
              <dd
                className={`font-semibold text-left ${
                  row.highlight ? "text-amber-600" : "text-foreground"
                }`}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <Button
          onClick={onAction}
          disabled={!canBook}
          className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12 font-bold text-base mt-auto pt-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {canBook ? actionLabel : statusLabel}
          {canBook && <ChevronLeft className="mr-2 h-4 w-4" />}
        </Button>

        {/* پیش از زدن رزرو ممکن است سؤالی داشته باشد */}
        <div className="mt-2">
          <ContactHelp />
        </div>

        {canBook && (caravan.remaining_capacity ?? 0) < 5 && (
          <p className="text-amber-600 text-xs mt-2 text-center font-medium">
            فقط {toPersianDigits(caravan.remaining_capacity!)} جای خالی مانده است
          </p>
        )}

        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className="w-full text-center text-sm text-primary hover:underline mt-3 py-1"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

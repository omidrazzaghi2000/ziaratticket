import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toPersianDigits } from "@/lib/digits";
import { caravanFactRows, type CaravanFacts } from "@/lib/caravan";

export interface CaravanSummary extends CaravanFacts {
  id: number;
  name?: string | null;
  price?: number | null;
  remaining_capacity?: number | null;
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
  const rows = caravanFactRows(caravan);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-md overflow-hidden h-full flex flex-col">
      {/* قیمت هر نفر */}
      <div className="bg-gradient-to-br from-primary to-primary/80 p-5 text-center">
        {showName && caravan.name && (
          <h3 className="font-heading font-bold text-white text-lg mb-2 leading-tight">{caravan.name}</h3>
        )}
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
          disabled={isFull}
          className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12 font-bold text-base mt-auto pt-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isFull ? "ظرفیت تکمیل شده" : actionLabel}
          {!isFull && <ChevronLeft className="mr-2 h-4 w-4" />}
        </Button>

        {!isFull && (caravan.remaining_capacity ?? 0) < 5 && (
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

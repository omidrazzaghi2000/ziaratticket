/**
 * اطلاعاتی که در همه‌ی صفحه‌ها یکسان نمایش داده می‌شود (فهرست کاروان‌ها،
 * صفحه‌ی کاروان، فرم رزرو و رسید). یک جا تعریف شده تا عنوان‌ها همه‌جا یکی باشد.
 */
import { toPersianDigits } from "./digits";
import { jalaliReturnDate } from "./jalali";

export interface CaravanFacts {
  departure_date?: string | null;
  duration?: number | null;
  origin_city?: string | null;
  transportation_type?: string | null;
  transportation_display?: string | null;
  train_type?: string | null;
  train_type_display?: string | null;
  bus_type?: number | null;
  bus_type_display?: string | null;
  accommodation_display?: string | null;
  accommodation_type?: string | null;
  accommodation_name?: string | null;
  accommodation_distance?: number | null;
  meal_breakfast?: boolean;
  meal_lunch?: boolean;
  meal_dinner?: boolean;
  has_insurance?: boolean;
  remaining_capacity?: number | null;
  price?: number | null;
}

/**
 * «قطار» به‌تنهایی برای زائر معنی روشنی ندارد؛ نوع واگن یا ظرفیت اتوبوس
 * همان‌جا کنارش می‌آید: «قطار — ۴ تخته»، «اتوبوس — ۴۴ نفره».
 */
export function transportLabel(c: CaravanFacts): string {
  const base = c.transportation_display || c.transportation_type || "—";
  if (c.transportation_type === "train") {
    const t = c.train_type_display || "";
    return t ? `${base} — ${t}` : base;
  }
  if (c.transportation_type === "bus" || c.transportation_type === "combined") {
    if (c.bus_type) return `${base} — ${toPersianDigits(c.bus_type)} نفره`;
    if (c.bus_type_display) return `${base} — ${c.bus_type_display}`;
  }
  return base;
}

/** «هتل» و در صورت وجود نام و فاصله‌اش تا حرم */
export function accommodationLabel(c: CaravanFacts): string {
  const base = c.accommodation_display || c.accommodation_type || "—";
  return c.accommodation_name ? `${base} — ${c.accommodation_name}` : base;
}

/** خدماتی که کاروان ارائه می‌دهد: «صبحانه، ناهار، بیمه» */
export function servicesLabel(c: CaravanFacts): string {
  const items = [
    c.meal_breakfast && "صبحانه",
    c.meal_lunch && "ناهار",
    c.meal_dinner && "شام",
    c.has_insurance && "بیمه مسافرتی",
  ].filter(Boolean) as string[];
  return items.length ? items.join("، ") : "—";
}

export interface CaravanFactRow {
  label: string;
  value: string;
  highlight?: boolean;
}

/**
 * ردیف‌های خلاصه‌ی کاروان — همان مواردی که زائر برای تصمیم‌گیری لازم دارد.
 * مقصد عمداً نیامده: زائر از صفحه‌ی همان مقصد وارد شده و تکرارش بی‌فایده است.
 */
export function caravanFactRows(c: CaravanFacts): CaravanFactRow[] {
  const ret = jalaliReturnDate(c.departure_date, c.duration);
  const rows: CaravanFactRow[] = [
    { label: "مدت سفر", value: c.duration ? `${toPersianDigits(c.duration)} روز` : "—" },
    { label: "تاریخ رفت", value: toPersianDigits(c.departure_date || "") || "—" },
  ];
  if (ret) rows.push({ label: "تاریخ برگشت", value: ret });
  if (c.origin_city) rows.push({ label: "مبدأ حرکت", value: c.origin_city });
  rows.push(
    { label: "حمل‌ونقل", value: transportLabel(c) },
    { label: "اقامتگاه", value: accommodationLabel(c) },
    { label: "با خدمات", value: servicesLabel(c) },
    {
      label: "ظرفیت باقیمانده",
      value: (c.remaining_capacity ?? 0) > 0 ? `${toPersianDigits(c.remaining_capacity!)} نفر` : "تکمیل شده",
      highlight: (c.remaining_capacity ?? 0) > 0 && (c.remaining_capacity ?? 0) < 5,
    },
  );
  return rows;
}

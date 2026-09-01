/**
 * تبدیل ارقام بین فارسی/عربی و لاتین.
 *
 * قاعده‌ی سامانه: کاربر می‌تواند اعداد را فارسی یا انگلیسی وارد کند؛ هر ورودی
 * عددی پیش از اعتبارسنجی و ارسال به سرور به ارقام لاتین تبدیل می‌شود.
 * نمایش اعداد به کاربر اما فارسی است.
 */

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** ارقام فارسی/عربی → لاتین (و جداکننده اعشار عربی → نقطه) */
export function toLatinDigits(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/٫/g, ".");
}

/** ارقام لاتین → فارسی (فقط برای نمایش) */
export function toPersianDigits(value: string | number | null | undefined): string {
  return String(value ?? "").replace(/\d/g, (d) => FA_DIGITS[+d]);
}

/** عدد فارسی/انگلیسی → number (اگر عدد معتبر نبود NaN) */
export function toNumber(value: string | number | null | undefined): number {
  const cleaned = toLatinDigits(value).replace(/[\s,٬]/g, "");
  return cleaned === "" ? NaN : Number(cleaned);
}

/**
 * نرمال‌سازی مقدار یک ورودی عددی: ارقام لاتین می‌شوند و جداکننده‌های هزارگان
 * (کاما/ویرگول فارسی/فاصله) حذف می‌شوند.
 */
export function normalizeNumericInput(value: string): string {
  return toLatinDigits(value).replace(/[,٬\s]/g, "");
}

/** آیا این ورودی «عددی» است؟ (برای اعمال خودکار نرمال‌سازی) */
export function isNumericInput(opts: {
  type?: string;
  inputMode?: string;
  pattern?: string;
}): boolean {
  const { type, inputMode, pattern } = opts;
  return (
    type === "number" ||
    type === "tel" ||
    inputMode === "numeric" ||
    inputMode === "decimal" ||
    pattern === "[0-9]*"
  );
}

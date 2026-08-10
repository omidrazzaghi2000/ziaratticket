import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";
import TimePicker from "react-multi-date-picker/plugins/time_picker";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import "./date-time-picker.css";

const inputClass =
  "flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background " +
  "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export interface PersianDatePickerProps {
  /** مقدار شمسی به صورت رشته، مثال: ۱۴۰۳/۰۸/۱۵ */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** نمایش انتخاب ساعت در کنار تاریخ */
  withTime?: boolean;
  /** فقط تاریخ‌های بعد از امروز قابل انتخاب باشد */
  futureOnly?: boolean;
  /** حداکثر تاریخ قابل انتخاب امروز باشد (برای تاریخ تولد) */
  pastOnly?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * انتخابگر تاریخ شمسی (و در صورت نیاز ساعت).
 * خروجی همیشه رشته‌ی شمسی است: «۱۴۰۳/۰۸/۱۵» یا «۱۴۰۳/۰۸/۱۵ ۰۷:۳۰».
 */
export function PersianDatePicker({
  value,
  onChange,
  placeholder,
  withTime = false,
  futureOnly = false,
  pastOnly = false,
  disabled,
  className,
  id,
}: PersianDatePickerProps) {
  const format = withTime ? "YYYY/MM/DD HH:mm" : "YYYY/MM/DD";

  return (
    <div className={cn("relative", className)}>
      <DatePicker
        id={id}
        value={value || ""}
        onChange={(date) => {
          if (!date) return onChange("");
          const d = date as DateObject;
          onChange(d.format(format));
        }}
        calendar={persian}
        locale={persian_fa}
        format={format}
        calendarPosition="bottom-right"
        editable={false}
        disabled={disabled}
        minDate={futureOnly ? new DateObject({ calendar: persian }) : undefined}
        maxDate={pastOnly ? new DateObject({ calendar: persian }) : undefined}
        plugins={withTime ? [<TimePicker key="tp" position="bottom" hideSeconds />] : []}
        containerClassName="w-full"
        inputClass={cn(inputClass, "pr-9")}
        placeholder={placeholder || (withTime ? "انتخاب تاریخ و ساعت" : "انتخاب تاریخ")}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {withTime ? <Clock className="h-4 w-4" /> : <CalendarIcon className="h-4 w-4" />}
      </span>
    </div>
  );
}

/**
 * تبدیل رشته‌ی شمسی «۱۴۰۳/۰۸/۱۵ ۰۷:۳۰» به رشته‌ی میلادی ISO برای ارسال به سرور.
 */
export function jalaliToISO(value?: string): string {
  if (!value) return "";
  const normalized = value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const [datePart, timePart] = normalized.trim().split(" ");
  const [y, m, d] = datePart.split("/").map(Number);
  if (!y || !m || !d) return "";
  const [hh = 0, mm = 0] = (timePart || "").split(":").map(Number);
  const obj = new DateObject({ calendar: persian, year: y, month: m, day: d, hour: hh, minute: mm });
  return obj.convert(gregorian, gregorian_en).format("YYYY-MM-DDTHH:mm");
}

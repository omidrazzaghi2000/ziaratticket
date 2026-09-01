import * as React from "react"

import { cn } from "@/lib/utils"
import { isNumericInput, normalizeNumericInput } from "@/lib/digits"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * ورودی پایه‌ی سامانه.
 *
 * برای هر ورودی «عددی» (type=number/tel یا inputMode عددی یا pattern=[0-9]*)
 * ارقام فارسی و عربی به‌صورت خودکار به لاتین تبدیل می‌شوند؛ یعنی کاربر می‌تواند
 * «۰۹۱۲…» یا «0912…» بنویسد و هر دو یکسان در نظر گرفته می‌شوند.
 *
 * ورودی‌های type=number به text با صفحه‌کلید عددی تبدیل می‌شوند، چون مرورگر
 * ارقام فارسی را در type=number نامعتبر می‌داند و مقدار را دور می‌ریزد.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onChange, ...props }, ref) => {
    const numeric = isNumericInput({
      type,
      inputMode: props.inputMode,
      pattern: props.pattern,
    })

    const renderedType = numeric && type === "number" ? "text" : type
    const renderedInputMode =
      props.inputMode ?? (numeric ? (type === "number" ? "decimal" : "numeric") : undefined)

    const handleChange = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        if (numeric) {
          const normalized = normalizeNumericInput(event.target.value)
          if (normalized !== event.target.value) {
            // مقدار DOM را اصلاح می‌کنیم تا هم فرم و هم خود input مقدار لاتین ببینند
            event.target.value = normalized
          }
        }
        onChange?.(event)
      },
      [numeric, onChange]
    )

    return (
      <input
        type={renderedType}
        inputMode={renderedInputMode}
        onChange={handleChange}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

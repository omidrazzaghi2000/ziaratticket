/** راه‌های تماس زائر با ما — یک جا تعریف شده تا همه‌ی صفحه‌ها یکی باشند. */
export const SUPPORT_PHONE = "09378014934";

/** ۰۹۳۷۸۰۱۴۹۳۴ — برای نمایش، نه برای لینک tel: */
export const SUPPORT_PHONE_FA = SUPPORT_PHONE.replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[+d]);

export const SUPPORT_TEL_HREF = `tel:${SUPPORT_PHONE}`;

/** ایتا و بله شماره‌ی موبایل را مستقیم به‌عنوان شناسه قبول می‌کنند */
export const SUPPORT_EITAA = `https://eitaa.com/${SUPPORT_PHONE}`;
export const SUPPORT_BALE = `https://ble.ir/${SUPPORT_PHONE}`;

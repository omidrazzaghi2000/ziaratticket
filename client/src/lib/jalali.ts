/**
 * محاسبات تاریخ شمسی.
 *
 * تاریخ حرکت کاروان به‌صورت رشته‌ی شمسی ذخیره می‌شود (مثلاً «۱۴۰۵/۰۷/۲۷») و
 * تاریخ برگشت از روی آن و مدت سفر محاسبه می‌شود. برای این کار به تبدیل
 * شمسی↔میلادی نیاز داریم؛ الگوریتم استاندارد jalaali در ادامه آمده است.
 */
import { toLatinDigits, toPersianDigits } from "./digits";

const div = (a: number, b: number) => Math.trunc(a / b);
const mod = (a: number, b: number) => a - Math.trunc(a / b) * b;

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181,
  1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178,
];

function jalCal(jy: number) {
  let leapJ = -14;
  let jp = BREAKS[0];
  let jump = 0;
  const gy = jy + 621;

  if (jy < jp || jy >= BREAKS[BREAKS.length - 1]) throw new RangeError("سال شمسی نامعتبر");

  for (let i = 1; i < BREAKS.length; i += 1) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j += div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;

  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

export interface JalaliParts {
  jy: number;
  jm: number;
  jd: number;
}

/** «۱۴۰۵/۰۷/۲۷» یا «1405-7-27» → {jy:1405, jm:7, jd:27} */
export function parseJalali(value?: string | null): JalaliParts | null {
  if (!value) return null;
  const parts = toLatinDigits(String(value)).match(/\d+/g);
  if (!parts || parts.length < 3) return null;
  const [jy, jm, jd] = parts.map(Number);
  if (!jy || !jm || !jd || jm > 12 || jd > 31) return null;
  return { jy, jm, jd };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** {jy,jm,jd} → «۱۴۰۵/۰۷/۲۷» */
export function formatJalali(parts: JalaliParts): string {
  return toPersianDigits(`${parts.jy}/${pad(parts.jm)}/${pad(parts.jd)}`);
}

/**
 * تاریخ برگشت = تاریخ حرکت + (مدت سفر − ۱) روز.
 * سفر «۴ روزه» که روز اول حرکت می‌کند، روز چهارم برمی‌گردد.
 * اگر تاریخ حرکت قابل تفسیر نباشد null برمی‌گردد تا چیزی نمایش داده نشود.
 */
export function jalaliReturnDate(departure?: string | null, durationDays?: number | null): string | null {
  const start = parseJalali(departure);
  const days = Number(durationDays);
  if (!start || !Number.isFinite(days) || days < 1) return null;
  try {
    return formatJalali(d2j(j2d(start.jy, start.jm, start.jd) + Math.trunc(days) - 1));
  } catch {
    return null;
  }
}

/** امروز به‌صورت عدد روز تقویمی (برای تفریق تاریخ‌ها) */
function todayJdn(): number {
  const now = new Date();
  return g2d(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * چند روز تا حرکت مانده است.
 *  مثبت = مانده، ۰ = امروز، منفی = گذشته، null = تاریخ نامفهوم.
 * هر بار که صفحه باز شود از نو حساب می‌شود، پس نیازی به به‌روزرسانی دستی نیست.
 */
export function jalaliDaysUntil(departure?: string | null): number | null {
  const d = parseJalali(departure);
  if (!d) return null;
  try {
    return j2d(d.jy, d.jm, d.jd) - todayJdn();
  } catch {
    return null;
  }
}

export interface Countdown {
  label: string;
  /** هرچه نزدیک‌تر، پررنگ‌تر */
  tone: "urgent" | "soon" | "far" | "past";
  days: number;
}

/** متن «۷ روز مانده» و شدت رنگش */
export function departureCountdown(departure?: string | null): Countdown | null {
  const days = jalaliDaysUntil(departure);
  if (days === null) return null;
  if (days < 0) return { label: "تاریخ حرکت گذشته", tone: "past", days };
  if (days === 0) return { label: "امروز حرکت", tone: "urgent", days };
  if (days === 1) return { label: "فردا حرکت", tone: "urgent", days };
  const label = `${toPersianDigits(days)} روز مانده`;
  if (days <= 7) return { label, tone: "urgent", days };
  if (days <= 30) return { label, tone: "soon", days };
  return { label, tone: "far", days };
}

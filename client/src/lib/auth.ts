/**
 * لایه‌ی احراز هویت — تنها جایی که توکن‌ها خوانده، نوشته و تازه می‌شوند.
 *
 * مدل: یک توکن دسترسیِ کوتاه‌عمر و یک توکن تازه‌سازیِ هفتگی.
 * سرور با ROTATE_REFRESH_TOKENS هر بار که تازه‌سازی کنیم یک توکن هفت‌روزه‌ی
 * تازه می‌دهد، پس کاربری که هر هفته یک بار سر بزند همیشه وارد می‌ماند و اگر
 * یک هفته نیاید باید دوباره وارد شود. توکن قبلی هم بعد از چرخش بی‌اعتبار
 * می‌شود (BLACKLIST_AFTER_ROTATION) تا توکن لو‌رفته قابل استفاده نباشد.
 */
import { djangoURL } from "@/App";

const ACCESS_KEY = "AUTH_TOKEN_KEY";
const REFRESH_KEY = "AUTH_REFRESH_KEY";

/** چند ثانیه پیش از انقضا، توکن را زودتر تازه کن تا درخواست وسط راه ۴۰۱ نشود */
const EXPIRY_SKEW_SECONDS = 60;

export const AUTH_CHANGED_EVENT = "ziarat:auth-changed";

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // حالت مرور ناشناس یا مسدودبودن حافظه‌ی محلی
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* چیزی ذخیره نمی‌شود؛ کاربر این جلسه وارد می‌ماند ولی دفعه‌ی بعد نه */
  }
}

/** توکن بدون پیشوند. نسخه‌های قدیمی «Bearer x» ذخیره می‌کردند. */
export function getAccessToken(): string | null {
  const raw = readStorage(ACCESS_KEY);
  if (!raw) return null;
  return raw.startsWith("Bearer ") ? raw.slice(7) : raw;
}

export function getRefreshToken(): string | null {
  return readStorage(REFRESH_KEY);
}

export function setTokens(access: string, refresh?: string | null) {
  writeStorage(ACCESS_KEY, access);
  if (refresh) writeStorage(REFRESH_KEY, refresh);
  notifyAuthChanged();
}

export function clearTokens() {
  writeStorage(ACCESS_KEY, null);
  writeStorage(REFRESH_KEY, null);
  notifyAuthChanged();
}

function notifyAuthChanged() {
  try {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  } catch {
    /* محیط بدون window */
  }
}

/** هدر Authorization آماده، یا شیء خالی وقتی توکنی نیست */
export function authHeader(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** زمان انقضای یک JWT بر حسب میلی‌ثانیه، یا null اگر قابل خواندن نبود */
function expiryOf(token: string): number | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = JSON.parse(
      decodeURIComponent(
        atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
          .split("")
          .map(c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join("")
      )
    );
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isExpired(token: string, skewSeconds = EXPIRY_SKEW_SECONDS): boolean {
  const exp = expiryOf(token);
  if (exp === null) return false; // قابل خواندن نبود؛ بگذار سرور قضاوت کند
  return Date.now() >= exp - skewSeconds * 1000;
}

/** آیا توکن تازه‌سازی هنوز اعتبار دارد؟ مبنای «یک هفته وارد ماندن» همین است. */
export function hasValidSession(): boolean {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  const exp = expiryOf(refresh);
  return exp === null ? true : Date.now() < exp;
}

/**
 * چند درخواست هم‌زمان نباید چند بار تازه‌سازی کنند؛ همه منتظر یک وعده می‌مانند.
 */
let inFlightRefresh: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (inFlightRefresh) return inFlightRefresh;

  const refresh = getRefreshToken();
  if (!refresh) return Promise.resolve(null);

  inFlightRefresh = (async () => {
    try {
      const res = await fetch(`${djangoURL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) {
        // توکن تازه‌سازی منقضی یا باطل شده — باید دوباره وارد شود
        clearTokens();
        return null;
      }
      const data = await res.json();
      if (!data.access) {
        clearTokens();
        return null;
      }
      // با چرخش توکن، سرور یک refresh تازه هم می‌دهد؛ ذخیره‌اش پنجره را جلو می‌برد
      setTokens(data.access, data.refresh ?? null);
      return data.access as string;
    } catch {
      // خطای شبکه ≠ منقضی‌شدن؛ توکن‌ها را پاک نکن تا تلاش بعدی جواب بدهد
      return null;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

/** توکن معتبر برای ارسال؛ در صورت نیاز پیش از درخواست تازه می‌شود */
async function ensureAccessToken(): Promise<string | null> {
  const token = getAccessToken();
  if (token && !isExpired(token)) return token;
  if (!getRefreshToken()) return token; // مهمان
  return (await refreshAccessToken()) ?? null;
}

/**
 * fetch با احراز هویت: توکن را می‌چسباند، پیش از انقضا تازه می‌کند و اگر
 * سرور باز هم ۴۰۱ داد، یک بار (و فقط یک بار) تازه می‌کند و دوباره می‌فرستد.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await ensureAccessToken();

  const send = (bearer: string | null) =>
    fetch(input, {
      ...init,
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
    });

  const res = await send(token);
  if (res.status !== 401 || !getRefreshToken()) return res;

  const renewed = await refreshAccessToken();
  if (!renewed) return res;
  return send(renewed);
}

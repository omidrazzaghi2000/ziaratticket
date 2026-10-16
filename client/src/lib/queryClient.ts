import { QueryClient, QueryFunction } from "@tanstack/react-query";

import { authFetch } from "./auth";

// پیش‌فرض باید «همان مبدأ» باشد. اگر VITE_API_URL هنگام بیلد تعریف نشود،
// مقدار قبلی (http://localhost:8000) یعنی همه‌ی درخواست‌های کاربر به کامپیوتر
// خودش می‌رفت و سایت بی‌صدا از کار می‌افتاد.
const DJANGO_URL = import.meta.env.VITE_API_URL ?? "";

// هدر و تازه‌سازی توکن یک‌جا در lib/auth مدیریت می‌شود

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const fullUrl = url.startsWith("http") ? url : DJANGO_URL + url;
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};

  const res = await authFetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const rawUrl = queryKey[0] as string;
    const fullUrl = rawUrl.startsWith("http") ? rawUrl : DJANGO_URL + rawUrl;

    const res = await authFetch(fullUrl);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      // یک قطعی لحظه‌ای شبکه نباید کاربر را به صفحه‌ی خطا بیندازد.
      // ۴xx تکرار نمی‌شود چون پاسخ سرور درست بوده و تکرارش فایده‌ای ندارد.
      retry: (failureCount, error) => {
        const status = Number(String((error as Error)?.message || "").match(/^(\d{3}):/)?.[1]);
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 4000),
    },
    mutations: {
      // عمداً: تکرار خودکار یک POST رزرو می‌تواند رزرو تکراری بسازد
      retry: false,
    },
  },
});

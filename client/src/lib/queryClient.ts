import { QueryClient, QueryFunction } from "@tanstack/react-query";

const DJANGO_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("AUTH_TOKEN_KEY");
  return token ? { Authorization: token } : {};
}

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
  const headers: Record<string, string> = {
    ...getAuthHeader(),
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  const res = await fetch(fullUrl, {
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

    const res = await fetch(fullUrl, {
      headers: getAuthHeader(),
    });

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
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

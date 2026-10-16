import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

import { djangoURL } from "@/App";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CaravanSummaryCard, { type CaravanSummary } from "@/components/CaravanSummaryCard";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthModal, useAuth } from "@/components/auth";

const DESTINATION_TITLES: Record<string, string> = {
  mashhad: "کاروان‌های مشهد مقدس",
  karbala: "کاروان‌های کربلای معلا",
  hajj_umrah: "کاروان‌های حج و عمره",
  qom_jamkaran: "کاروان‌های قم و جمکران",
};

/**
 * کاروان‌های یک مقصد. هر کاروان همان کارت خلاصه‌ی صفحه‌ی کاروان را دارد؛
 * روی موبایل زیر هم و از تبلت به بالا کنار هم می‌آیند.
 */
export default function CaravanList() {
  const { destination } = useParams<{ destination: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  /** کاروانی که کاربر زده ولی هنوز وارد نشده؛ بعد از ورود به همان می‌رویم */
  const [pendingCaravanId, setPendingCaravanId] = useState<number | null>(null);

  // اگر هنوز وارد نشده، اول پنجره‌ی ورود؛ بعد مستقیم به صفحه‌ی رزرو.
  const startBooking = (id: number) => {
    if (!isAuthenticated) {
      setPendingCaravanId(id);
      return;
    }
    setLocation(`/booking/${id}`);
  };

  const { data: caravans, isLoading, isError } = useQuery<CaravanSummary[]>({
    queryKey: ["/api/caravans", destination],
    queryFn: async () => {
      const res = await fetch(`${djangoURL}/api/caravans?destination=${destination}`);
      if (!res.ok) throw new Error(`خطا: ${res.status}`);
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header solid />

      <main className="flex-grow container mx-auto px-4 pt-28 pb-16 max-w-5xl">
        <h1 className="font-heading text-3xl font-bold text-foreground mb-6">
          {DESTINATION_TITLES[destination ?? ""] ?? "کاروان‌ها"}
        </h1>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2].map(i => <Skeleton key={i} className="h-96 w-full rounded-2xl" />)}
          </div>
        ) : isError ? (
          <p className="text-red-600 text-sm py-10 text-center">خطا در دریافت اطلاعات.</p>
        ) : caravans && caravans.length > 0 ? (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-5 list-none p-0">
            {caravans.map(caravan => (
              <li key={caravan.id}>
                <CaravanSummaryCard
                  caravan={caravan}
                  showName
                  onAction={() => startBooking(caravan.id)}
                  secondaryLabel="مشاهده جزئیات کامل کاروان"
                  onSecondary={() => setLocation(`/caravan/${caravan.id}`)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm py-16 text-center">
            در حال حاضر کاروانی برای این مقصد ثبت نشده است.
          </p>
        )}
      </main>

      <Footer />

      <AuthModal
        isOpen={pendingCaravanId !== null}
        onClose={() => setPendingCaravanId(null)}
        title="برای رزرو وارد شوید"
        description="شماره موبایلتان را وارد کنید تا کد تأیید برایتان پیامک شود."
        onLoginSuccess={() => {
          const id = pendingCaravanId;
          setPendingCaravanId(null);
          if (id !== null) setLocation(`/booking/${id}`);
        }}
      />
    </div>
  );
}

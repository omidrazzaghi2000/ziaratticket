import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

import { djangoURL } from "@/App";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CaravanSummaryCard, { type CaravanSummary } from "@/components/CaravanSummaryCard";
import { Skeleton } from "@/components/ui/skeleton";

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
                  onAction={() => setLocation(`/booking/${caravan.id}`)}
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
    </div>
  );
}

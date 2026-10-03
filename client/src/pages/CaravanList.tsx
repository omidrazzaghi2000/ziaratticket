import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { djangoURL } from "@/App";
import { toPersianDigits } from "@/lib/digits";
import { Calendar, Clock, MapPin, ChevronLeft, Users } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";

interface Caravan {
  id: number;
  name: string;
  departure_date: string;
  duration: number;
  transportation_display?: string;
  destination_display?: string;
  price: number;
  remaining_capacity: number;
  accommodation_display?: string;
  accommodation_distance: number;
}

const DESTINATION_TITLES: Record<string, string> = {
  mashhad: "کاروان‌های مشهد مقدس",
  karbala: "کاروان‌های کربلای معلا",
  hajj_umrah: "کاروان‌های حج و عمره",
  qom_jamkaran: "کاروان‌های قم و جمکران",
};

const formatPrice = (price: number) => new Intl.NumberFormat("fa-IR").format(price);

/** Caravans for one destination — a plain list of rows, no imagery. */
export default function CaravanList() {
  const { destination } = useParams<{ destination: string }>();
  const [, setLocation] = useLocation();

  const { data: caravans, isLoading, isError } = useQuery<Caravan[]>({
    queryKey: ["/api/caravans", destination],
    queryFn: async () => {
      const res = await fetch(`${djangoURL}/api/caravans?destination=${destination}`);
      if (!res.ok) throw new Error(`خطا: ${res.status}`);
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 pt-28 pb-16 max-w-3xl">
        <h1 className="font-heading text-3xl font-bold text-foreground mb-6">
          {DESTINATION_TITLES[destination ?? ""] ?? "کاروان‌ها"}
        </h1>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
          </div>
        ) : isError ? (
          <p className="text-red-600 text-sm py-10 text-center">خطا در دریافت اطلاعات.</p>
        ) : caravans && caravans.length > 0 ? (
          <ul className="space-y-3">
            {caravans.map(caravan => (
              <li key={caravan.id}>
                <button
                  onClick={() => setLocation(`/caravan/${caravan.id}`)}
                  className="w-full text-right bg-card border border-border rounded-2xl p-4 sm:p-5 hover:border-primary/40 hover:shadow-card transition-all flex items-center gap-4"
                >
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="font-heading text-lg font-bold text-foreground truncate">{caravan.name}</h2>
                      {caravan.remaining_capacity <= 0 && (
                        <span className="text-xs text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full shrink-0">
                          تکمیل
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        {caravan.departure_date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {toPersianDigits(caravan.duration)} روز
                      </span>
                      {caravan.transportation_display && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          {caravan.transportation_display}
                        </span>
                      )}
                      {caravan.remaining_capacity > 0 && (
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-primary" />
                          {toPersianDigits(caravan.remaining_capacity)} جای خالی
                        </span>
                      )}
                    </div>

                    <div className="font-heading font-bold text-primary mt-2.5 text-lg">
                      {formatPrice(caravan.price)}
                      <span className="text-xs font-normal text-muted-foreground mr-1">تومان</span>
                    </div>
                  </div>

                  <ChevronLeft className="h-5 w-5 text-muted-foreground shrink-0" />
                </button>
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

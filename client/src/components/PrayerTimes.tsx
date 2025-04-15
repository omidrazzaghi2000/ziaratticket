import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";

interface PrayerTimesData {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  midnight: string;
}

export default function PrayerTimes() {
  const { data: prayerTimes, isLoading } = useQuery<PrayerTimesData>({
    queryKey: ['/api/prayer-times'],
  });

  return (
    <section className="bg-white py-4 shadow-sm sticky top-0 z-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center items-center">
          <div className="flex items-center ml-6 mb-2 md:mb-0">
            <Clock className="text-primary-500 ml-2 h-5 w-5" />
            <span className="text-sm font-medium">اوقات شرعی کربلا:</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-6 text-center">
            <div className="prayer-time relative px-3 py-1">
              <div className="text-xs text-gray-500">اذان صبح</div>
              <div className="text-sm font-semibold">
                {isLoading ? "..." : prayerTimes?.fajr || "۴:۳۰"}
              </div>
            </div>
            <div className="prayer-time relative px-3 py-1">
              <div className="text-xs text-gray-500">طلوع آفتاب</div>
              <div className="text-sm font-semibold">
                {isLoading ? "..." : prayerTimes?.sunrise || "۵:۵۳"}
              </div>
            </div>
            <div className="prayer-time relative px-3 py-1">
              <div className="text-xs text-gray-500">اذان ظهر</div>
              <div className="text-sm font-semibold">
                {isLoading ? "..." : prayerTimes?.dhuhr || "۱۲:۰۵"}
              </div>
            </div>
            <div className="prayer-time relative px-3 py-1">
              <div className="text-xs text-gray-500">اذان مغرب</div>
              <div className="text-sm font-semibold">
                {isLoading ? "..." : prayerTimes?.maghrib || "۱۸:۱۷"}
              </div>
            </div>
            <div className="prayer-time relative px-3 py-1">
              <div className="text-xs text-gray-500">نیمه شب شرعی</div>
              <div className="text-sm font-semibold">
                {isLoading ? "..." : prayerTimes?.midnight || "۲۳:۰۹"}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .prayer-time::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 1px;
          background: linear-gradient(to left, transparent, #E5E7EB, transparent);
        }
      `}</style>
    </section>
  );
}

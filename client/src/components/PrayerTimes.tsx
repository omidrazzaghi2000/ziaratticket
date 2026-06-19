import { useQuery } from "@tanstack/react-query";
import { Moon, Sunrise, Sun, Sunset, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { djangoURL } from "@/App";

interface PrayerTimesData {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  midnight: string;
}

const prayerConfig = [
  { key: "fajr", label: "اذان صبح", icon: Moon, color: "text-indigo-400" },
  { key: "sunrise", label: "طلوع آفتاب", icon: Sunrise, color: "text-amber-400" },
  { key: "dhuhr", label: "اذان ظهر", icon: Sun, color: "text-yellow-500" },
  { key: "maghrib", label: "اذان مغرب", icon: Sunset, color: "text-orange-400" },
  { key: "isha", label: "اذان عشاء", icon: Moon, color: "text-blue-400" },
];

export default function PrayerTimes() {
  const { data, isLoading } = useQuery<PrayerTimesData>({
    queryKey: [djangoURL + "/api/prayer-times"],
    staleTime: 1000 * 60 * 60,
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-40 bg-primary/95 backdrop-blur-md border-b border-white/10 shadow-lg"
    >
      <div className="container mx-auto px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-white/60" />
            <span className="text-white/70 text-xs font-medium">اوقات شرعی کربلا</span>
            <span className="h-3 w-px bg-white/20 mx-1" />
          </div>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">
            {prayerConfig.map((item) => (
              <div key={item.key} className="flex items-center gap-1.5">
                <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                <span className="text-white/60 text-xs">{item.label}:</span>
                <span className="text-white font-semibold text-xs tracking-wide">
                  {isLoading ? (
                    <span className="inline-block w-10 h-3 bg-white/20 rounded animate-pulse" />
                  ) : (
                    (data as Record<string, string>)?.[item.key] || "--:--"
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

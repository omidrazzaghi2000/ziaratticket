import { useQuery } from "@tanstack/react-query";
import { Moon, Sunrise, Sun, Sunset } from "lucide-react";
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
  { key: "fajr",    label: "صبح",    icon: Moon,    color: "text-indigo-300" },
  { key: "sunrise", label: "طلوع",   icon: Sunrise, color: "text-amber-300"  },
  { key: "dhuhr",   label: "ظهر",    icon: Sun,     color: "text-yellow-300" },
  { key: "maghrib", label: "مغرب",   icon: Sunset,  color: "text-orange-300" },
  { key: "isha",    label: "عشاء",   icon: Moon,    color: "text-blue-300"   },
];

export default function PrayerTimes() {
  const { data, isLoading } = useQuery<PrayerTimesData>({
    queryKey: [djangoURL + "/api/prayer-times"],
    staleTime: 1000 * 60 * 60,
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative z-40 bg-primary border-b border-white/8"
      style={{
        background: "linear-gradient(90deg, hsl(162 72% 10%) 0%, hsl(162 72% 13%) 50%, hsl(162 72% 10%) 100%)",
      }}
    >
      {/* Subtle gold border at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />

      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1.5">
          {/* Label */}
          <div className="flex items-center gap-2 ml-4">
            <div className="relative">
              <div className="w-1.5 h-1.5 rounded-full bg-gold-400" />
              <div className="absolute inset-0 rounded-full bg-gold-400 animate-ping opacity-60" />
            </div>
            <span className="text-white/60 text-xs font-medium tracking-wide">اوقات شرعی کربلا</span>
            <span className="h-3 w-px bg-white/15" />
          </div>

          {/* Prayer times */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            {prayerConfig.map((item, i) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                className="flex items-center gap-1.5 group"
              >
                <item.icon className={`h-3 w-3 ${item.color} shrink-0`} />
                <span className="text-white/45 text-xs">{item.label}:</span>
                <span className="text-white font-semibold text-xs tabular-nums tracking-wider">
                  {isLoading ? (
                    <span className="inline-block w-9 h-2.5 bg-white/15 rounded animate-pulse" />
                  ) : (
                    (data as unknown as Record<string, string>)?.[item.key] || "--:--"
                  )}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Gold border at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/30 to-transparent" />
    </motion.section>
  );
}

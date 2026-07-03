import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Clock, MapPin, Users, Phone, Bus, Train, Plane, Shuffle,
  CheckCircle2, XCircle, Utensils, Shield, ChevronLeft, Home, MessageCircle,
  Building2, Star, Info, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/Header";
import { djangoURL } from "@/App";
import { useState } from "react";

// Subtle Islamic star pattern (SVG)
function IslamicPattern({ opacity = 0.04, color = "currentColor" }: { opacity?: number; color?: string }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity }}
    >
      <defs>
        <pattern id="islamic-star" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <g fill={color} fillRule="evenodd">
            <polygon points="30,4 33,21 48,16 36,27 48,38 33,33 30,50 27,33 12,38 24,27 12,16 27,21" opacity="0.6" />
            <circle cx="30" cy="30" r="4" opacity="0.3" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#islamic-star)" />
    </svg>
  );
}

interface CaravanPhotoItem {
  id: number;
  photo_url: string;
  caption?: string;
  category?: string;
  category_display?: string;
}

function PhotoGallery({ photos }: { photos: CaravanPhotoItem[] }) {
  const [selected, setSelected] = useState<CaravanPhotoItem | null>(null);

  const categoryColors: Record<string, string> = {
    accommodation: "bg-blue-100 text-blue-700",
    transport: "bg-primary/10 text-primary",
    shrine: "bg-amber-100 text-amber-700",
    general: "bg-muted text-foreground/60",
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setSelected(photo)}
            className="relative group aspect-video rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-all shadow-sm hover:shadow-md"
          >
            <img
              src={photo.photo_url}
              alt={photo.caption || "تصویر کاروان"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            {photo.category_display && (
              <span className={`absolute bottom-1.5 right-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryColors[photo.category || 'general']}`}>
                {photo.category_display}
              </span>
            )}
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                {photo.caption}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="relative max-w-3xl w-full"
            >
              <img
                src={selected.photo_url}
                alt={selected.caption || ""}
                className="w-full rounded-2xl max-h-[80vh] object-contain"
              />
              {selected.caption && (
                <p className="text-white/80 text-sm text-center mt-3">{selected.caption}</p>
              )}
              <button
                onClick={() => setSelected(null)}
                className="absolute top-3 left-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                ✕
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function TransportIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    bus: <Bus className="h-5 w-5" />,
    train: <Train className="h-5 w-5" />,
    airplane: <Plane className="h-5 w-5" />,
    combined: <Shuffle className="h-5 w-5" />,
  };
  return <>{icons[type] || <Bus className="h-5 w-5" />}</>;
}

function MessagingAppBadge({ app }: { app: string }) {
  const styles: Record<string, string> = {
    whatsapp: "bg-green-100 text-green-800 border-green-200",
    bale: "bg-blue-100 text-blue-800 border-blue-200",
    eitaa: "bg-orange-100 text-orange-800 border-orange-200",
  };
  const labels: Record<string, string> = {
    whatsapp: "واتساپ",
    bale: "بله",
    eitaa: "ایتا",
  };
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[app] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {labels[app] || app}
    </span>
  );
}

interface ReviewItem {
  id: number;
  reviewer_name: string;
  rating: number;
  comment: string;
  submitted_at: string;
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className="w-4 h-4"
          fill={rating >= s ? "#f59e0b" : "none"}
          stroke={rating >= s ? "#f59e0b" : "#d1d5db"}
        />
      ))}
    </div>
  );
}

function CaravanReviews({ caravanId, caravanName }: { caravanId: number; caravanName: string }) {
  const { data: reviews = [], isLoading } = useQuery<ReviewItem[]>({
    queryKey: ["caravan-reviews", caravanId],
    queryFn: () => fetch(`${djangoURL}/api/caravans/${caravanId}/reviews`).then(r => r.json()),
  });

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="mt-8 bg-card rounded-2xl border border-border shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-400" fill="#fbbf24" />
          نظرات زائران
        </h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarDisplay rating={Math.round(avgRating)} />
            <span className="font-bold text-foreground text-sm">
              {avgRating.toFixed(1)}
            </span>
            <span className="text-muted-foreground text-xs">از {reviews.length} نظر</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Star className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">هنوز نظری برای این کاروان ثبت نشده است.</p>
          <p className="text-xs mt-1 opacity-70">پس از پایان سفر، زائران می‌توانند نظر خود را ثبت کنند.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-muted/40 rounded-xl p-4 border border-border/50"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <span className="font-semibold text-sm text-foreground">{review.reviewer_name || "زائر"}</span>
                  {review.submitted_at && (
                    <span className="text-xs text-muted-foreground mr-2">
                      {new Date(review.submitted_at).toLocaleDateString("fa-IR")}
                    </span>
                  )}
                </div>
                <StarDisplay rating={review.rating} />
              </div>
              {review.comment && (
                <p className="text-sm text-foreground/80 leading-6">{review.comment}</p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

interface CaravanDetailProps {
  params: { caravanId: string };
}

export default function CaravanDetail({ params }: CaravanDetailProps) {
  const caravanId = parseInt(params.caravanId);
  const [, navigate] = useLocation();
  const [imgError, setImgError] = useState(false);

  const { data: caravan, isLoading } = useQuery({
    queryKey: ['/api/caravans', caravanId],
    queryFn: async () => {
      const res = await fetch(`${djangoURL}/api/caravans/${caravanId}`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
    enabled: !isNaN(caravanId),
  });

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[60vh] pt-24">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
          <p className="text-muted-foreground text-sm">در حال بارگذاری اطلاعات کاروان...</p>
        </div>
      </div>
    );
  }

  if (!caravan) {
    return (
      <div className="bg-background min-h-screen">
        <Header />
        <div className="container py-24 text-center">
          <h2 className="font-heading text-2xl font-bold mb-4">کاروان یافت نشد</h2>
          <Button onClick={() => navigate("/")}>بازگشت به صفحه اصلی</Button>
        </div>
      </div>
    );
  }

  const heroImage = !imgError && (caravan.image_full_url || caravan.image_url);
  const isIntl = caravan.is_international;
  const isAir = caravan.is_air_travel;
  const hasImage = !!heroImage;

  const destinationLabels: Record<string, string> = {
    mashhad: "مشهد مقدس",
    karbala: "کربلای معلا",
    hajj_umrah: "حج / عمره",
    qom_jamkaran: "قم / جمکران",
  };

  const destinationColors: Record<string, string> = {
    mashhad: "from-emerald-900 to-emerald-700",
    karbala: "from-amber-900 to-amber-700",
    hajj_umrah: "from-violet-900 to-violet-700",
    qom_jamkaran: "from-sky-900 to-sky-700",
  };

  const gradientClass = destinationColors[caravan.destination] || "from-emerald-900 to-emerald-700";

  const handleBooking = () => navigate(`/booking/${caravanId}`);

  const FloatBookButton = () => (
    <motion.button
      onClick={handleBooking}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
      className="fixed left-5 top-1/2 -translate-y-1/2 z-40 bg-primary text-white rounded-2xl shadow-2xl flex flex-col items-center gap-1.5 px-3 py-4 hover:bg-primary/90 transition-colors group"
      style={{ writingMode: "vertical-rl" }}
    >
      <ChevronLeft className="h-4 w-4 rotate-90" />
      <span className="text-xs font-bold tracking-wide" style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
        رزرو کاروان
      </span>
    </motion.button>
  );

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <FloatBookButton />

      {/* Hero */}
      <div className={`relative bg-gradient-to-br ${gradientClass} overflow-hidden pt-20`}>
        <IslamicPattern opacity={0.06} color="white" />

        {hasImage && (
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt={caravan.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover opacity-20"
            />
          </div>
        )}

        <div className="relative container py-12 md:py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-6 transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
              بازگشت به کاروان‌ها
            </button>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge className="bg-white/20 text-white border-0 text-xs hover:bg-white/30">
                {destinationLabels[caravan.destination] || caravan.destination}
              </Badge>
              {caravan.popular && (
                <Badge className="bg-gold-500/80 text-white border-0 text-xs hover:bg-gold-500">
                  <Star className="h-3 w-3 ml-1 fill-white" /> محبوب
                </Badge>
              )}
              {caravan.special_tag && (
                <Badge className="bg-white/15 text-white border-white/30 text-xs">
                  {caravan.special_tag}
                </Badge>
              )}
            </div>

            <h1 className="font-heading text-3xl md:text-4xl font-black text-white mb-3 leading-tight">
              {caravan.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-white/75 text-sm">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {caravan.departure_date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {caravan.duration} روزه
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {caravan.origin_city || "ایران"}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {caravan.remaining_capacity} صندلی باقیمانده
              </span>
            </div>
          </motion.div>
        </div>

        {/* Gold bottom border */}
        <div className="h-px bg-gradient-to-r from-transparent via-gold-400/60 to-transparent" />
      </div>

      {/* Main content */}
      <div className="container py-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ─── Left column: details ─── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Description */}
            {caravan.description && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card rounded-2xl p-6 border border-border shadow-sm"
              >
                <h2 className="font-heading font-bold text-lg text-foreground mb-3 flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  درباره این کاروان
                </h2>
                <p className="text-muted-foreground leading-7 text-sm">{caravan.description}</p>
              </motion.div>
            )}

            {/* Photo Gallery */}
            {caravan.photos?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.13 }}
                className="bg-card rounded-2xl p-6 border border-border shadow-sm"
              >
                <h2 className="font-heading font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                  <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                  </svg>
                  تصاویر کاروان
                </h2>
                <PhotoGallery photos={caravan.photos} />
              </motion.div>
            )}

            {/* Transport & Route */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-card rounded-2xl p-6 border border-border shadow-sm"
            >
              <h2 className="font-heading font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                <TransportIcon type={caravan.transportation_type} />
                حمل‌ونقل و مسیر
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-muted/40 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">نوع حمل‌ونقل</p>
                  <p className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                    <TransportIcon type={caravan.transportation_type} />
                    {caravan.transportation_display || caravan.transportation_type}
                  </p>
                </div>
                <div className="bg-muted/40 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">مبدأ حرکت</p>
                  <p className="font-semibold text-foreground text-sm">{caravan.origin_city || "—"}</p>
                </div>
                {caravan.transit_cities?.length > 0 && (
                  <div className="sm:col-span-2 bg-muted/40 rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-2">مسیر عبوری</p>
                    <div className="flex flex-wrap gap-2">
                      {caravan.transit_cities.map((city: string, i: number) => (
                        <span key={i} className="bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-lg">
                          {city}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Accommodation */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl p-6 border border-border shadow-sm"
            >
              <h2 className="font-heading font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                اقامتگاه
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-muted/40 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">نوع اقامتگاه</p>
                  <p className="font-semibold text-foreground text-sm">
                    {caravan.accommodation_display || caravan.accommodation_type}
                  </p>
                </div>
                {caravan.accommodation_name && (
                  <div className="bg-muted/40 rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">نام اقامتگاه</p>
                    <p className="font-semibold text-foreground text-sm">{caravan.accommodation_name}</p>
                  </div>
                )}
                {caravan.accommodation_distance > 0 && (
                  <div className="bg-muted/40 rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">فاصله تا حرم</p>
                    <p className="font-semibold text-foreground text-sm">{caravan.accommodation_distance.toLocaleString("fa-IR")} متر</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Services */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-card rounded-2xl p-6 border border-border shadow-sm"
            >
              <h2 className="font-heading font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                <Utensils className="h-5 w-5 text-primary" />
                خدمات و امکانات
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "صبحانه", value: caravan.meal_breakfast },
                  { label: "ناهار", value: caravan.meal_lunch },
                  { label: "شام", value: caravan.meal_dinner },
                  { label: "بیمه مسافرتی", value: caravan.has_insurance, icon: Shield },
                ].map((item, i) => (
                  <div key={i} className={`rounded-xl p-3 flex flex-col items-center gap-1.5 border ${
                    item.value
                      ? "bg-primary/8 border-primary/20 text-primary"
                      : "bg-muted/40 border-border text-muted-foreground"
                  }`}>
                    {item.value
                      ? <CheckCircle2 className="h-5 w-5" />
                      : <XCircle className="h-5 w-5 opacity-40" />
                    }
                    <span className="text-xs font-medium text-center">{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Itinerary timeline */}
            {caravan.itinerary?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-card rounded-2xl p-6 border border-border shadow-sm"
              >
                <h2 className="font-heading font-bold text-lg text-foreground mb-5 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  برنامه سفر
                </h2>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute right-[9px] top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-5">
                    {caravan.itinerary.map((step: { day: number; title: string; description: string }, i: number) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.07 }}
                        className="flex gap-4 pr-6 relative"
                      >
                        {/* Dot */}
                        <div className="absolute right-0 top-1 w-[18px] h-[18px] rounded-full bg-primary border-2 border-background shadow-sm flex-shrink-0 z-10" />
                        <div className="pb-1">
                          <p className="text-xs text-primary font-bold mb-0.5">روز {step.day}</p>
                          <p className="font-semibold text-foreground text-sm mb-1">{step.title}</p>
                          {step.description && (
                            <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Rules */}
            {caravan.rules && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-amber-50 border border-amber-200 rounded-2xl p-6"
              >
                <h2 className="font-heading font-bold text-base text-amber-900 mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  قوانین و مقررات کاروان
                </h2>
                <p className="text-amber-800 text-sm leading-7 whitespace-pre-line">{caravan.rules}</p>
              </motion.div>
            )}

            {/* Disclaimer */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-muted/60 border border-border rounded-2xl p-5"
            >
              <p className="text-xs text-muted-foreground leading-6">
                <span className="font-bold text-foreground">تذکر مهم: </span>
                سایت زیارت تیکت صرفاً بستر ارتباطی بین زایرین و مدیران کاروان است و هیچ‌گونه مسئولیتی در قبال خدمات ارائه‌شده توسط کاروان‌ها ندارد. لطفاً پیش از رزرو، اطلاعات کاروان را بررسی و با مدیر کاروان در تماس باشید.
              </p>
            </motion.div>
          </div>

          {/* ─── Right column: sticky wrapper with both cards ─── */}
          <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl border border-border shadow-md overflow-hidden"
            >
              {/* Price banner */}
              <div className="relative bg-gradient-to-br from-primary to-primary/80 p-5 text-center overflow-hidden">
                <IslamicPattern opacity={0.08} color="white" />
                <p className="text-white/70 text-xs mb-1">قیمت هر نفر</p>
                <p className="font-heading text-3xl font-black text-white">
                  {caravan.price?.toLocaleString("fa-IR")}
                  <span className="text-base font-normal mr-1">تومان</span>
                </p>
                {caravan.remaining_capacity > 0 && caravan.remaining_capacity < 5 && (
                  <p className="text-amber-300 text-xs mt-2 font-medium">
                    ⚡ فقط {caravan.remaining_capacity} صندلی باقیمانده
                  </p>
                )}
                {caravan.remaining_capacity === 0 && (
                  <p className="text-red-300 text-xs mt-2 font-medium">ظرفیت تکمیل شده</p>
                )}
              </div>

              <div className="p-5 space-y-3">
                {[
                  { label: "مقصد", value: destinationLabels[caravan.destination] || caravan.destination },
                  { label: "تاریخ حرکت", value: caravan.departure_date },
                  { label: "مدت سفر", value: `${caravan.duration} روز` },
                  { label: "حمل‌ونقل", value: caravan.transportation_display || caravan.transportation_type },
                  { label: "اقامتگاه", value: caravan.accommodation_display || caravan.accommodation_type },
                  { label: "ظرفیت کل", value: `${caravan.capacity} نفر` },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b border-border pb-2.5 last:border-0 last:pb-0">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold text-foreground text-left">{item.value}</span>
                  </div>
                ))}

                <Button
                  onClick={handleBooking}
                  disabled={caravan.remaining_capacity === 0}
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-11 font-bold text-base mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {caravan.remaining_capacity === 0 ? "ظرفیت تکمیل شده" : "رزرو این کاروان"}
                  {caravan.remaining_capacity > 0 && <ChevronLeft className="mr-2 h-4 w-4" />}
                </Button>
              </div>
            </motion.div>

            {/* Contact card */}
            {(caravan.leader_name || caravan.manager || caravan.leader_phone || caravan.contact_phone) && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-card rounded-2xl border border-border shadow-sm p-5"
              >
                <h3 className="font-heading font-bold text-sm text-foreground mb-3 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  تماس با مدیر کاروان
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">نام مدیر</p>
                    <p className="font-semibold text-foreground text-sm">
                      {caravan.leader_name || caravan.manager || "—"}
                    </p>
                  </div>
                  {(caravan.leader_phone || caravan.contact_phone) && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">شماره تماس</p>
                      <a
                        href={`tel:${caravan.leader_phone || caravan.contact_phone}`}
                        className="inline-flex items-center gap-2 bg-primary/10 text-primary font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-primary/20 transition-colors w-full justify-center"
                      >
                        <Phone className="h-4 w-4" />
                        {caravan.leader_phone || caravan.contact_phone}
                      </a>
                    </div>
                  )}
                  {caravan.leader_messaging_apps?.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">پیام‌رسان‌ها</p>
                      <div className="flex flex-wrap gap-1.5">
                        {caravan.leader_messaging_apps.map((app: string) => (
                          <MessagingAppBadge key={app} app={app} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Reviews section */}
        <CaravanReviews caravanId={caravan.id} caravanName={caravan.name} />

        {/* Bottom booking CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div>
            <p className="font-heading font-bold text-lg text-foreground">آماده سفر معنوی هستید؟</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              همین حالا جای خود را در کاروان {caravan.name} رزرو کنید.
            </p>
          </div>
          <Button
            onClick={handleBooking}
            disabled={caravan.remaining_capacity === 0}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white rounded-xl px-8 font-bold shadow-lg"
          >
            {caravan.remaining_capacity === 0 ? "ظرفیت تکمیل" : "رزرو کاروان"}
            <ChevronLeft className="mr-2 h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

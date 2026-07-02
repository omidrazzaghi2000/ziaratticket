import { useState, FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar, Clock, Hotel, Search, MapPin, DollarSign,
  Users, Plane, Bus, PackageCheck, Star, ChevronLeft, SlidersHorizontal, Eye,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import lantern2 from "../assets/images/lantern2.jpg";

interface Caravan {
  id: number;
  name: string;
  departure_date: string;
  duration: number;
  transportation_type: string;
  transportation_display?: string;
  destination?: string;
  destination_display?: string;
  price: number;
  capacity: number;
  remaining_capacity: number;
  accommodation_type: string;
  accommodation_display?: string;
  accommodation_distance: number;
  manager: string;
  description?: string;
  popular?: boolean;
  special_tag?: string;
  image_url?: string;
  is_international?: boolean;
}

interface FilterState {
  departure_date: string;
  duration: string;
  transportation_type: string;
  price_range: string;
  destination: string;
}

const DESTINATIONS = [
  { key: "", label: "همه مقاصد", emoji: "🌍" },
  { key: "karbala", label: "کربلای معلا", emoji: "🕌" },
  { key: "mashhad", label: "مشهد مقدس", emoji: "🕌" },
  { key: "hajj_umrah", label: "حج / عمره", emoji: "🕋" },
  { key: "qom_jamkaran", label: "قم / جمکران", emoji: "🌙" },
];

const DESTINATION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  karbala:      { bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200" },
  mashhad:      { bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-200"    },
  hajj_umrah:   { bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200"   },
  qom_jamkaran: { bg: "bg-violet-50",   text: "text-violet-700",  border: "border-violet-200"  },
};

const TRANSPORT_CONFIG: Record<string, { label: string; icon: typeof Plane; color: string; bg: string; border: string }> = {
  airplane: { label: "هواپیما", icon: Plane,        color: "text-sky-600",    bg: "bg-sky-50",    border: "border-sky-100"    },
  bus:      { label: "اتوبوس", icon: Bus,          color: "text-primary",   bg: "bg-primary/8", border: "border-primary/12" },
  train:    { label: "قطار",   icon: PackageCheck, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
  combined: { label: "ترکیبی", icon: PackageCheck, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
  هوایی:  { label: "هوایی",  icon: Plane,        color: "text-sky-600",    bg: "bg-sky-50",    border: "border-sky-100"    },
  زمینی:  { label: "زمینی",  icon: Bus,          color: "text-primary",   bg: "bg-primary/8", border: "border-primary/12" },
  ترکیبی: { label: "ترکیبی", icon: PackageCheck, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
};

export const fetchCaravans = async (filters: FilterState): Promise<Caravan[]> => {
  const params = new URLSearchParams();
  if (filters.departure_date) params.append("departure_date", filters.departure_date);
  if (filters.duration && filters.duration !== "all") params.append("duration", filters.duration);
  if (filters.transportation_type && filters.transportation_type !== "all") params.append("transportation_type", filters.transportation_type);
  if (filters.price_range && filters.price_range !== "all") params.append("price_range", filters.price_range);
  if (filters.destination) params.append("destination", filters.destination);
  const response = await fetch(`/api/caravans?${params}`);
  if (!response.ok) throw new Error(`خطا: ${response.status}`);
  return response.json();
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("fa-IR").format(price);

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] },
  }),
};

function IslamicPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.035 }}>
      <defs>
        <pattern id="sf-star" x="0" y="0" width="64" height="64" patternUnits="userSpaceOnUse">
          <polygon points="32,4 35,26 52,18 38,30 52,42 35,34 32,56 29,34 12,42 26,30 12,18 29,26" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#sf-star)" />
    </svg>
  );
}

function CaravanCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden shadow-card border border-border">
      <Skeleton className="h-52 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-6 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-1/2 rounded-lg" />
        <div className="space-y-2 pt-1">{[1,2,3,4].map(i => <Skeleton key={i} className="h-4 w-full rounded-lg" />)}</div>
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-8 w-28 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function CapacityBadge({ remaining, capacity }: { remaining: number; capacity: number }) {
  const pct = capacity > 0 ? (remaining / capacity) * 100 : 0;
  const color = pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-red-500";
  if (remaining <= 0) return (
    <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">تکمیل ظرفیت</span>
  );
  return (
    <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1.5 rounded-full">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color}`} />
      <span className="text-xs font-semibold text-foreground/80">{remaining} جای خالی</span>
    </div>
  );
}

export default function SearchAndFilter() {
  const [filters, setFilters] = useState<FilterState>({
    departure_date: "", duration: "", transportation_type: "", price_range: "", destination: "",
  });
  const [, setLocation] = useLocation();
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: caravans, isLoading, isError, refetch } = useQuery<Caravan[]>({
    queryKey: ["/api/caravans", filters],
    queryFn: () => fetchCaravans(filters),
  });

  const handleFilterChange = (name: string, value: string) =>
    setFilters(prev => ({ ...prev, [name]: value }));

  const setDestination = (dest: string) => {
    setFilters(prev => ({ ...prev, destination: dest }));
  };

  const handleSearch = (e: FormEvent) => { e.preventDefault(); refetch(); };

  const redirectToDetail = (caravan: Caravan) => {
    setLocation(`/caravan/${caravan.id}`);
  };


  const getTransportInfo = (type: string) =>
    TRANSPORT_CONFIG[type] || { label: type, icon: PackageCheck, color: "text-muted-foreground", bg: "bg-muted", border: "border-border" };

  const hasActiveFilters = Object.values(filters).some(v => v !== "");

  return (
    <section id="caravans" className="py-24 bg-gradient-to-b from-background to-cream-200 relative overflow-hidden">
      <IslamicPattern />

      <div className="container mx-auto px-4 relative">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-10"
        >
          <span className="inline-flex items-center gap-2 bg-primary/8 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-5 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
            رزرو آنلاین
          </span>
          <h2 className="font-heading text-display-sm text-foreground mb-4">کاروان‌های زیارتی</h2>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-gold-400/60" />
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 0L10 6L16 8L10 10L8 16L6 10L0 8L6 6Z" fill="hsl(42 60% 52%)" opacity="0.8" />
            </svg>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-gold-400/60" />
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
            کاروان مورد نظر خود را از میان بهترین کاروان‌های معتمد انتخاب و با چند کلیک ساده رزرو کنید.
          </p>
        </motion.div>

        {/* Destination tabs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap gap-2 justify-center mb-8"
        >
          {DESTINATIONS.map(dest => (
            <button
              key={dest.key}
              onClick={() => setDestination(dest.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 border ${
                filters.destination === dest.key
                  ? "bg-primary text-white border-primary shadow-emerald-sm"
                  : "bg-card text-foreground/70 border-border hover:border-primary/40 hover:text-primary"
              }`}
            >
              <span>{dest.emoji}</span>
              {dest.label}
            </button>
          ))}
        </motion.div>

        {/* Mobile filter toggle */}
        <div className="flex items-center justify-between mb-5 md:hidden">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-2 bg-card border border-border px-4 py-2.5 rounded-xl text-sm font-medium shadow-card text-foreground/80"
          >
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            فیلتر جستجو
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />}
          </motion.button>
          {caravans && (
            <span className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
              {caravans.length} کاروان
            </span>
          )}
        </div>

        {/* Mobile filter panel */}
        <AnimatePresence>
          {filterOpen && (
            <motion.div
              key="mobile-filter"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="md:hidden overflow-hidden mb-6"
            >
              <div className="bg-card rounded-2xl border border-border shadow-card p-5">
                <form className="grid grid-cols-1 gap-4" onSubmit={handleSearch}>
                  <div>
                    <Label className="mb-2 font-medium flex items-center text-foreground/75 text-xs gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" />تاریخ حرکت
                    </Label>
                    <Input type="text" placeholder="مثال: ۱۴۰۳-۰۵-۰۱" value={filters.departure_date}
                      onChange={e => handleFilterChange("departure_date", e.target.value)}
                      className="border-border rounded-xl h-11 text-sm bg-background" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={filters.duration} onValueChange={v => handleFilterChange("duration", v)}>
                      <SelectTrigger className="border-border rounded-xl h-11 text-sm bg-background"><SelectValue placeholder="مدت سفر" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">همه</SelectItem>
                        {[3,4,5,6,7,8,9].map(d => <SelectItem key={d} value={String(d)}>{d} روز</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={filters.transportation_type} onValueChange={v => handleFilterChange("transportation_type", v)}>
                      <SelectTrigger className="border-border rounded-xl h-11 text-sm bg-background"><SelectValue placeholder="حمل‌ونقل" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">همه</SelectItem>
                        <SelectItem value="bus">اتوبوس</SelectItem>
                        <SelectItem value="airplane">هواپیما</SelectItem>
                        <SelectItem value="train">قطار</SelectItem>
                        <SelectItem value="combined">ترکیبی</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 rounded-xl text-sm font-semibold gap-2">
                    <Search className="h-4 w-4" />جستجو
                  </Button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop filter panel */}
        <div className="hidden md:block">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="bg-card rounded-2xl border border-border shadow-card p-6 md:p-7 mb-12 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-32 h-32 bg-primary/3 rounded-full -ml-16 -mt-16 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-gold-100/50 rounded-full -mr-12 -mb-12 pointer-events-none" />

            <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 relative" onSubmit={handleSearch}>
              <div>
                <Label className="mb-2 font-medium flex items-center text-foreground/75 text-xs gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />تاریخ حرکت
                </Label>
                <Input type="text" placeholder="مثال: ۱۴۰۳-۰۵-۰۱" value={filters.departure_date}
                  onChange={e => handleFilterChange("departure_date", e.target.value)}
                  className="border-border focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl h-11 text-sm bg-background" />
              </div>

              <div>
                <Label className="mb-2 font-medium flex items-center text-foreground/75 text-xs gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />مدت سفر
                </Label>
                <Select value={filters.duration} onValueChange={v => handleFilterChange("duration", v)}>
                  <SelectTrigger className="border-border rounded-xl h-11 text-sm bg-background"><SelectValue placeholder="همه" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    {[3,4,5,6,7,8,9].map(d => <SelectItem key={d} value={String(d)}>{d} روز</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 font-medium flex items-center text-foreground/75 text-xs gap-1.5">
                  <Bus className="h-3.5 w-3.5 text-primary" />نوع حمل‌ونقل
                </Label>
                <Select value={filters.transportation_type} onValueChange={v => handleFilterChange("transportation_type", v)}>
                  <SelectTrigger className="border-border rounded-xl h-11 text-sm bg-background"><SelectValue placeholder="همه" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    <SelectItem value="bus">اتوبوس</SelectItem>
                    <SelectItem value="airplane">هواپیما</SelectItem>
                    <SelectItem value="train">قطار</SelectItem>
                    <SelectItem value="combined">ترکیبی</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 font-medium flex items-center text-foreground/75 text-xs gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-primary" />محدوده قیمت
                </Label>
                <Select value={filters.price_range} onValueChange={v => handleFilterChange("price_range", v)}>
                  <SelectTrigger className="border-border rounded-xl h-11 text-sm bg-background"><SelectValue placeholder="همه" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    <SelectItem value="1">تا ۱۰ میلیون</SelectItem>
                    <SelectItem value="2">۱۰–۱۵ میلیون</SelectItem>
                    <SelectItem value="3">۱۵–۲۰ میلیون</SelectItem>
                    <SelectItem value="4">بالای ۲۰ میلیون</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2">
                <motion.div className="flex-1" whileTap={{ scale: 0.97 }}>
                  <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 rounded-xl shadow-emerald-sm text-sm font-semibold gap-2">
                    <Search className="h-4 w-4" />جستجو
                  </Button>
                </motion.div>
                {hasActiveFilters && (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setFilters({ departure_date: "", duration: "", transportation_type: "", price_range: "", destination: "" }); refetch(); }}
                    className="h-11 px-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors text-xs"
                  >
                    پاک
                  </motion.button>
                )}
              </div>
            </form>
          </motion.div>
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <div className="h-8 w-0.5 bg-gradient-to-b from-primary to-gold-500 rounded-full" />
            <h3 className="font-heading text-2xl font-bold text-foreground">
              {filters.destination
                ? DESTINATIONS.find(d => d.key === filters.destination)?.label ?? "کاروان‌ها"
                : "کاروان‌های فعال"}
            </h3>
            {caravans && (
              <span className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                {caravans.length} کاروان
              </span>
            )}
          </div>
        </div>

        {/* Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <CaravanCardSkeleton key={i} />)}
          </div>
        ) : isError ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-16 bg-red-50 rounded-2xl border border-red-100">
            <p className="text-red-600 font-semibold mb-2">خطا در دریافت اطلاعات</p>
            <p className="text-red-400 text-sm mb-6">لطفاً اتصال اینترنت خود را بررسی کنید.</p>
            <Button onClick={() => refetch()} variant="outline" className="border-red-200 text-red-500 rounded-xl">تلاش مجدد</Button>
          </motion.div>
        ) : caravans && caravans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {caravans.map((caravan, index) => {
                const transport = getTransportInfo(caravan.transportation_type);
                const TransportIcon = transport.icon;
                const isFull = caravan.remaining_capacity <= 0;
                const destKey = caravan.destination ?? "";
                const destColors = DESTINATION_COLORS[destKey] ?? { bg: "bg-muted", text: "text-foreground/60", border: "border-border" };

                return (
                  <motion.div
                    key={caravan.id}
                    custom={index}
                    variants={cardVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-30px" }}
                    whileHover={{ y: -8, transition: { duration: 0.25, ease: "easeOut" } }}
                    className="group"
                  >
                    <div className={`bg-card rounded-2xl border ${isFull ? "border-border/50 opacity-75" : "border-border"} shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden flex flex-col h-full`}>
                      {/* Image */}
                      <div className="relative h-52 overflow-hidden">
                        <img
                          src={caravan.image_url || lantern2}
                          alt={caravan.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-600"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

                        {/* Top badges */}
                        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                          {caravan.destination_display && (
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${destColors.bg} ${destColors.text} ${destColors.border}`}>
                              {caravan.destination_display}
                            </span>
                          )}
                          {caravan.popular && (
                            <span className="inline-flex items-center gap-1 bg-gold-500 text-gold-foreground text-xs font-bold px-2.5 py-1 rounded-full shadow-gold-sm">
                              <Star className="h-3 w-3" fill="currentColor" />پرطرفدار
                            </span>
                          )}
                          {caravan.special_tag && (
                            <span className="bg-violet-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">{caravan.special_tag}</span>
                          )}
                        </div>

                        {/* Bottom overlay */}
                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                          <CapacityBadge remaining={caravan.remaining_capacity} capacity={caravan.capacity} />
                          <div className={`flex items-center text-xs font-semibold px-2.5 py-1.5 rounded-full gap-1.5 ${transport.bg} ${transport.color} ${transport.border} border`}>
                            <TransportIcon className="h-3 w-3" />
                            {caravan.transportation_display || transport.label}
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex flex-col flex-grow">
                        <h4 className="font-heading text-xl font-bold text-foreground mb-3 leading-tight">{caravan.name}</h4>

                        <div className="space-y-2.5 mb-4 flex-grow">
                          {[
                            { icon: Calendar, label: "تاریخ حرکت",  value: caravan.departure_date },
                            { icon: Clock,    label: "مدت سفر",     value: `${caravan.duration} روز` },
                            { icon: MapPin,   label: "فاصله تا حرم", value: `${caravan.accommodation_distance} متر` },
                            { icon: Hotel,    label: "اقامت",         value: caravan.accommodation_display || caravan.accommodation_type },
                          ].map((item, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <div className="w-6 h-6 bg-primary/8 rounded-lg flex items-center justify-center shrink-0">
                                <item.icon className="h-3 w-3 text-primary" />
                              </div>
                              <span className="text-muted-foreground text-xs">{item.label}:</span>
                              <span className="font-medium text-foreground/85 text-xs">{item.value}</span>
                            </div>
                          ))}
                        </div>

                        {/* Price + CTAs */}
                        <div className="border-t border-border pt-4">
                          <div className="flex justify-between items-center mb-3">
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">هر نفر</p>
                              <div className="font-heading font-bold text-primary" style={{ fontSize: "1.3rem", lineHeight: 1.1 }}>
                                {formatPrice(caravan.price)}
                                <span className="text-xs font-normal text-muted-foreground mr-1">تومان</span>
                              </div>
                            </div>
                            <motion.button
                              whileTap={{ scale: 0.96 }}
                              onClick={() => setLocation(`/caravan/${caravan.id}`)}
                              className="flex items-center gap-1.5 text-xs font-medium text-primary/80 hover:text-primary border border-primary/20 hover:border-primary/40 px-3 py-1.5 rounded-xl transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              مشاهده
                            </motion.button>
                          </div>
                          <motion.div whileTap={{ scale: 0.96 }}>
                            <Button
                              onClick={() => redirectToDetail(caravan)}
                              className="w-full rounded-xl gap-1.5 font-semibold text-sm h-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-emerald-sm hover:shadow-emerald transition-all"
                            >
                              {isFull ? (
                                <>مشاهده جزییات<Eye className="h-3.5 w-3.5" /></>
                              ) : (
                                <>مشاهده و رزرو<ChevronLeft className="h-3.5 w-3.5" /></>
                              )}
                            </Button>
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-card rounded-2xl border border-border">
            <div className="w-16 h-16 bg-primary/8 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-primary/50" />
            </div>
            <p className="font-heading text-xl text-foreground mb-2">کاروانی یافت نشد</p>
            <p className="text-muted-foreground text-sm mb-6">فیلترها را تغییر دهید یا همه را پاک کنید.</p>
            <Button
              onClick={() => { setFilters({ departure_date: "", duration: "", transportation_type: "", price_range: "", destination: "" }); refetch(); }}
              variant="outline" className="rounded-xl border-border"
            >
              پاک کردن فیلترها
            </Button>
          </motion.div>
        )}
      </div>

    </section>
  );
}

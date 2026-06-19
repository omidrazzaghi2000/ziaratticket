import { useState, FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Hotel, Search, MapPin, DollarSign, Users, Plane, Bus, PackageCheck, Star, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import lantern2 from "../assets/images/lantern2.jpg";
import { useAuth } from "@/components/auth";
import { AuthModal } from "@/components/auth";

interface Caravan {
  id: number;
  name: string;
  departure_date: string;
  duration: number;
  transportation_type: string;
  price: number;
  capacity: number;
  remaining_capacity: number;
  accommodation_type: string;
  accommodation_distance: number;
  manager: string;
  description?: string;
  popular?: boolean;
  special_tag?: string;
  image_url?: string;
}

interface FilterInterface {
  departure_date: string;
  duration: string;
  transportation_type: string;
  price_range: string;
}

export const fetchCaravans = async (filters: FilterInterface = {
  departure_date: "", duration: "", transportation_type: "", price_range: "",
}): Promise<Caravan[]> => {
  const params = new URLSearchParams();
  if (filters.departure_date) params.append("departure_date", filters.departure_date);
  if (filters.duration) params.append("duration", filters.duration);
  if (filters.transportation_type) params.append("transportation_type", filters.transportation_type);
  if (filters.price_range) params.append("price_range", filters.price_range);
  const response = await fetch(`/api/caravans?${params}`);
  if (!response.ok) throw new Error(`خطا: ${response.status}`);
  return response.json();
};

const transportConfig: Record<string, { label: string; icon: typeof Plane; color: string; bg: string }> = {
  هوایی: { label: "هوایی", icon: Plane, color: "text-sky-600", bg: "bg-sky-100" },
  زمینی: { label: "زمینی", icon: Bus, color: "text-emerald-600", bg: "bg-emerald-100" },
  ترکیبی: { label: "ترکیبی", icon: PackageCheck, color: "text-violet-600", bg: "bg-violet-100" },
};

const formatPrice = (price: number) =>
  price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" },
  }),
};

function CaravanCardSkeleton() {
  return (
    <Card className="overflow-hidden border-0 shadow-md">
      <Skeleton className="h-52 w-full" />
      <CardContent className="p-6 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex justify-between items-center pt-3">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function SearchAndFilter() {
  const [filters, setFilters] = useState<FilterInterface>({
    departure_date: "", duration: "", transportation_type: "", price_range: "",
  });
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingCaravanId, setPendingCaravanId] = useState<number | null>(null);

  const { data: caravans, isLoading, isError, refetch } = useQuery<Caravan[]>({
    queryKey: ["/api/caravans", filters],
    queryFn: () => fetchCaravans(filters),
  });

  const handleFilterChange = (name: string, value: string) =>
    setFilters((prev) => ({ ...prev, [name]: value }));

  const handleSearch = (e: FormEvent) => { e.preventDefault(); refetch(); };

  const redirectToBooking = (caravan: Caravan) => {
    if (caravan.remaining_capacity <= 0) {
      toast({ title: "ظرفیت تکمیل", description: "متأسفانه ظرفیت این کاروان تکمیل شده است.", variant: "destructive" });
      return;
    }
    if (!isAuthenticated) {
      setPendingCaravanId(caravan.id);
      setShowAuthModal(true);
      return;
    }
    setLocation(`/booking/${caravan.id}`);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    if (pendingCaravanId !== null) {
      setLocation(`/booking/${pendingCaravanId}`);
      setPendingCaravanId(null);
    }
  };

  const transportInfo = (type: string) =>
    transportConfig[type] || { label: type, icon: PackageCheck, color: "text-gray-600", bg: "bg-gray-100" };

  return (
    <section id="caravans" className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <span className="inline-block bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            رزرو آنلاین
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            جستجو و رزرو کاروان
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            کاروان مورد نظر خود را جستجو کنید و با چند کلیک ساده، سفر معنوی خود را رزرو نمایید.
          </p>
        </motion.div>

        {/* Search Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white p-6 md:p-8 rounded-2xl shadow-lg mb-12 border border-gray-100 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -mt-24 -mr-24 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-emerald-50 rounded-full -mb-18 -ml-18 pointer-events-none" />

          <form
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 relative"
            onSubmit={handleSearch}
          >
            <div>
              <Label className="mb-2 font-medium flex items-center text-gray-700 text-sm">
                <Calendar className="ml-1.5 h-3.5 w-3.5 text-primary" />
                تاریخ حرکت
              </Label>
              <Input
                type="text"
                placeholder="مثال: 1403-05-01"
                value={filters.departure_date}
                onChange={(e) => handleFilterChange("departure_date", e.target.value)}
                className="border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl h-11"
              />
            </div>

            <div>
              <Label className="mb-2 font-medium flex items-center text-gray-700 text-sm">
                <Clock className="ml-1.5 h-3.5 w-3.5 text-primary" />
                مدت سفر
              </Label>
              <Select value={filters.duration} onValueChange={(v) => handleFilterChange("duration", v)}>
                <SelectTrigger className="border-gray-200 focus:border-primary rounded-xl h-11">
                  <SelectValue placeholder="همه" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="7">۷ روزه</SelectItem>
                  <SelectItem value="10">۱۰ روزه</SelectItem>
                  <SelectItem value="14">۱۴ روزه</SelectItem>
                  <SelectItem value="21">۲۱ روزه</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 font-medium flex items-center text-gray-700 text-sm">
                <Bus className="ml-1.5 h-3.5 w-3.5 text-primary" />
                نوع حمل و نقل
              </Label>
              <Select value={filters.transportation_type} onValueChange={(v) => handleFilterChange("transportation_type", v)}>
                <SelectTrigger className="border-gray-200 focus:border-primary rounded-xl h-11">
                  <SelectValue placeholder="همه" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="هوایی">هوایی</SelectItem>
                  <SelectItem value="زمینی">زمینی</SelectItem>
                  <SelectItem value="ترکیبی">ترکیبی</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 font-medium flex items-center text-gray-700 text-sm">
                <DollarSign className="ml-1.5 h-3.5 w-3.5 text-primary" />
                محدوده قیمت
              </Label>
              <Select value={filters.price_range} onValueChange={(v) => handleFilterChange("price_range", v)}>
                <SelectTrigger className="border-gray-200 focus:border-primary rounded-xl h-11">
                  <SelectValue placeholder="همه" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="1">تا ۱۰ میلیون</SelectItem>
                  <SelectItem value="2">۱۰ تا ۱۵ میلیون</SelectItem>
                  <SelectItem value="3">۱۵ تا ۲۰ میلیون</SelectItem>
                  <SelectItem value="4">بالای ۲۰ میلیون</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <motion.div className="w-full" whileTap={{ scale: 0.97 }}>
                <Button
                  type="submit"
                  className="w-full h-11 bg-primary hover:bg-primary/90 rounded-xl shadow-md text-sm font-semibold gap-2"
                >
                  <Search className="h-4 w-4" />
                  جستجوی کاروان
                </Button>
              </motion.div>
            </div>
          </form>
        </motion.div>

        {/* Caravans Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-gradient-to-b from-primary to-emerald-400 rounded-full" />
            <h3 className="text-2xl font-bold text-gray-800">کاروان‌های فعال</h3>
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
            {[1, 2, 3].map((i) => <CaravanCardSkeleton key={i} />)}
          </div>
        ) : isError ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-red-50 rounded-2xl border border-red-100"
          >
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-red-600 font-semibold mb-2">خطا در دریافت اطلاعات</p>
            <p className="text-red-400 text-sm mb-6">لطفاً اتصال اینترنت خود را بررسی کنید.</p>
            <Button onClick={() => refetch()} variant="outline" className="border-red-200 text-red-500">
              تلاش مجدد
            </Button>
          </motion.div>
        ) : caravans && caravans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {caravans.map((caravan, index) => {
                const transport = transportInfo(caravan.transportation_type);
                const TransportIcon = transport.icon;
                const isFull = caravan.remaining_capacity <= 0;

                return (
                  <motion.div
                    key={caravan.id}
                    custom={index}
                    variants={cardVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-40px" }}
                    whileHover={{ y: -6 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Card className="overflow-hidden border-0 shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col h-full group">
                      {/* Image */}
                      <div className="relative h-52 overflow-hidden">
                        <img
                          src={caravan.image_url || lantern2}
                          alt={caravan.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                        {/* Tags */}
                        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                          {caravan.popular && (
                            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                              <Star className="h-3 w-3" fill="white" />
                              پرطرفدار
                            </span>
                          )}
                          {caravan.special_tag && (
                            <span className="bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
                              {caravan.special_tag}
                            </span>
                          )}
                        </div>

                        {/* Bottom info */}
                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                          <div className="flex items-center bg-white/90 backdrop-blur-sm text-primary-700 text-xs px-2.5 py-1.5 rounded-full font-bold gap-1">
                            <Users className="h-3 w-3" />
                            {caravan.remaining_capacity} جای خالی
                          </div>
                          <div className={`flex items-center text-xs font-bold px-2.5 py-1.5 rounded-full gap-1 ${transport.bg} ${transport.color}`}>
                            <TransportIcon className="h-3 w-3" />
                            {transport.label}
                          </div>
                        </div>
                      </div>

                      <CardContent className="p-5 flex-grow flex flex-col">
                        <h4 className="text-lg font-bold text-gray-800 mb-3">{caravan.name}</h4>

                        <div className="space-y-2.5 mb-4 text-sm flex-grow">
                          {[
                            { icon: Calendar, label: "تاریخ حرکت", value: caravan.departure_date },
                            { icon: Clock, label: "مدت سفر", value: `${caravan.duration} روز` },
                            { icon: MapPin, label: "فاصله تا حرم", value: `${caravan.accommodation_distance} متر` },
                            { icon: Hotel, label: "اقامت", value: caravan.accommodation_type },
                          ].map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                                <item.icon className="text-primary h-3.5 w-3.5" />
                              </div>
                              <span className="text-gray-500">{item.label}:</span>
                              <span className="font-medium text-gray-700">{item.value}</span>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">قیمت هر نفر</p>
                            <div className="text-xl font-bold text-primary">
                              {formatPrice(caravan.price)}
                              <span className="text-xs font-normal text-gray-400 mr-1">تومان</span>
                            </div>
                          </div>
                          <motion.div whileTap={{ scale: 0.95 }}>
                            <Button
                              onClick={() => redirectToBooking(caravan)}
                              disabled={isFull}
                              className={`rounded-xl gap-1.5 font-semibold text-sm px-4 ${isFull ? "bg-gray-200 text-gray-500" : "bg-primary hover:bg-primary/90 text-white shadow-md"}`}
                            >
                              {isFull ? "تکمیل ظرفیت" : (
                                <>
                                  رزرو کنید
                                  <ChevronLeft className="h-4 w-4" />
                                </>
                              )}
                            </Button>
                          </motion.div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-200"
          >
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Search className="h-9 w-9 text-gray-300" />
            </div>
            <p className="text-gray-600 font-semibold mb-2">کاروانی یافت نشد</p>
            <p className="text-gray-400 text-sm mb-6">فیلترها را تغییر دهید یا همه را پاک کنید.</p>
            <Button
              onClick={() => {
                setFilters({ departure_date: "", duration: "", transportation_type: "", price_range: "" });
                refetch();
              }}
              variant="outline"
              className="rounded-xl border-gray-300"
            >
              پاک کردن فیلترها
            </Button>
          </motion.div>
        )}
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => { setShowAuthModal(false); setPendingCaravanId(null); }}
        title="ورود به حساب کاربری"
        description="برای رزرو کاروان ابتدا وارد حساب کاربری خود شوید یا ثبت‌نام کنید."
        onLoginSuccess={handleAuthSuccess}
      />
    </section>
  );
}

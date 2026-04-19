import { useState, FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Hotel, User, Search, MapPin, DollarSign, Users, Plane, Bus, PackageCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import lantern2 from "../assets/images/lantern2.jpg"
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


export const fetchCaravans = async (
  filters: FilterInterface ={
    departure_date:"",
    duration: "",
    transportation_type: "",
    price_range: "",
  }
): Promise<Caravan[]> => {
  const params = new URLSearchParams();

  if (filters.departure_date) params.append('departure_date', filters.departure_date);
  if (filters.duration) params.append('duration', filters.duration);
  if (filters.transportation_type) params.append('transportation_type', String(filters.transportation_type));
  if (filters.price_range) params.append('price_range', String(filters.price_range));

  const response = await fetch(`/api/caravans?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.status}`);
  }

  return response.json();
};

interface FilterInterface {
  departure_date: string,
  duration: string,
  transportation_type: string,
  price_range: string,
}

export default function SearchAndFilter() {
  const [filters, setFilters] = useState<FilterInterface>({
    departure_date: "",
    duration: "",
    transportation_type: "",
    price_range: "",
  });

  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const {
    data: caravans,
    isLoading,
    isError,
    refetch
  } = useQuery<Caravan[]>({
    queryKey: ['/api/caravans', filters],
    queryFn: ()=>fetchCaravans(filters)
  });

  // Handle filter change
  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Handle search form submission
  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    refetch();
  };

  // هدایت به صفحه رزرو کاروان
  const redirectToBooking = (caravan: Caravan) => {
    if (caravan.remaining_capacity <= 0) {
      toast({
        title: "خطا در رزرو",
        description: "متأسفانه ظرفیت این کاروان تکمیل شده است.",
        variant: "destructive"
      });
      return;
    }

    // هدایت به صفحه رزرو کاروان
    setLocation(`/booking/${caravan.id}`);
  };

  // Format price to Persian format with commas
  const formatPrice = (price: number): string => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const getTransportIcon = (type: string) => {
    switch (type) {
      case 'هوایی': return <Plane className="h-4 w-4" />;
      case 'زمینی': return <Bus className="h-4 w-4" />;
      case 'ترکیبی': return <PackageCheck className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <section id="caravans" className="py-16 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        <div className="animate-fade-in text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-heading bg-gradient-to-r from-primary-600 to-primary bg-clip-text text-transparent mb-4">
            جستجو و رزرو کاروان
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            کاروان مورد نظر خود را جستجو کنید و با چند کلیک ساده، سفر معنوی خود را رزرو نمایید.
          </p>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-md mb-12 animate-slide-up relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mt-32 -mr-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full -mb-24 -ml-24"></div>

          <form className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 relative" onSubmit={handleSearch}>
            <div className="group">
              <Label className="mb-2 font-medium flex items-center text-primary-700">
                <Calendar className="ml-1.5 h-4 w-4" />
                تاریخ حرکت
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="انتخاب تاریخ"
                  value={filters.departure_date}
                  onChange={(e) => handleFilterChange("departure_date", e.target.value)}
                  className="border-gray-300 focus:border-primary focus:ring-primary transition-all duration-200 pr-3 hover:border-primary"
                />
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 group-hover:text-primary" />
              </div>
            </div>

            <div className="group">
              <Label className="mb-2 font-medium flex items-center text-primary-700">
                <Clock className="ml-1.5 h-4 w-4" />
                مدت سفر
              </Label>
              <Select
                value={filters.duration}
                onValueChange={(value) => handleFilterChange("duration", value)}
              >
                <SelectTrigger className="border-gray-300 focus:border-primary focus:ring-primary hover:border-primary transition-all duration-200">
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

            <div className="group">
              <Label className="mb-2 font-medium flex items-center text-primary-700">
                <Bus className="ml-1.5 h-4 w-4" />
                نوع حمل و نقل
              </Label>
              <Select
                value={filters.transportation_type}
                onValueChange={(value) => handleFilterChange("transportation_type", value)}
              >
                <SelectTrigger className="border-gray-300 focus:border-primary focus:ring-primary hover:border-primary transition-all duration-200">
                  <SelectValue placeholder="همه" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="هوایی" className="flex items-center">
                    <Plane className="ml-2 h-4 w-4 text-green-600" />
                    هوایی
                  </SelectItem>
                  <SelectItem value="زمینی" className="flex items-center">
                    <Bus className="ml-2 h-4 w-4 text-blue-600" />
                    زمینی
                  </SelectItem>
                  <SelectItem value="ترکیبی" className="flex items-center">
                    <PackageCheck className="ml-2 h-4 w-4 text-purple-600" />
                    ترکیبی
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="group">
              <Label className="mb-2 font-medium flex items-center text-primary-700">
                <DollarSign className="ml-1.5 h-4 w-4" />
                محدوده قیمت (تومان)
              </Label>
              <Select
                value={filters.price_range}
                onValueChange={(value) => handleFilterChange("price_range", value)}
              >
                <SelectTrigger className="border-gray-300 focus:border-primary focus:ring-primary hover:border-primary transition-all duration-200">
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
              <Button
                type="submit"
                className="w-full bg-green-800 hover:opacity-90 transition-all shadow-md text-base py-6"
              >
                <Search className="h-5 w-5 ml-2" strokeWidth={2} />
                جستجوی کاروان
              </Button>
            </div>
          </form>
        </div>

        <div className="mb-8">
          <div className="flex items-center mb-6">
            <div className="h-8 w-1 bg-primary rounded-full ml-3"></div>
            <h3 className="text-2xl font-bold font-heading">کاروان‌های فعال</h3>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden bg-white border-0 shadow-md">
                  <Skeleton className="h-52 w-full" />
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <div className="pt-3 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                      <div className="pt-4 border-t border-gray-200 mt-4">
                        <div className="flex justify-between">
                          <Skeleton className="h-8 w-20" />
                          <Skeleton className="h-10 w-32" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-12 bg-red-50 rounded-lg">
              <p className="text-red-500 font-medium">خطایی در دریافت اطلاعات کاروان‌ها رخ داده است. لطفاً دوباره تلاش کنید.</p>
              <Button
                onClick={() => refetch()}
                variant="outline"
                className="mt-4 border-red-300 text-red-500 hover:bg-red-50"
              >
                تلاش مجدد
              </Button>
            </div>
          ) : caravans && caravans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {caravans.map((caravan, index) => (
                <Card
                  key={caravan.id}
                  className={`overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col animate-fade-in delay-${(index % 3) * 100}`}
                >
                  <div className="relative">
                    {caravan.image_url ? (
                      <div className="h-48 w-full bg-center bg-cover" style={{ backgroundImage: `url(${caravan.image_url})` }} />
                    ) : (
                      <div className="h-48 w-full bg-gradient-to-r from-primary-100 to-primary-200 flex items-center justify-center"
                        style={{ backgroundImage: `url(${lantern2})` }}>
                        <span className="text-primary-700 font-medium text-white">کاروان {caravan.name}</span>
                      </div>
                    )}

                    {/* برچسب‌های کاروان */}
                    <div className="absolute top-0 right-0 p-3 flex flex-col gap-2 items-end">
                      {caravan.popular && (
                        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center">
                          <span className="animate-pulse mr-1">●</span>
                          پرطرفدار
                        </div>
                      )}
                      {caravan.special_tag && (
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                          {caravan.special_tag}
                        </div>
                      )}
                    </div>

                    {/* ظرفیت کاروان */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 flex justify-between items-center">
                      <div className="flex items-center bg-white/90 text-primary-700 text-xs px-2.5 py-1.5 rounded-full font-bold">
                        <Users className="ml-1 h-3.5 w-3.5" />
                        ظرفیت: {caravan.remaining_capacity} نفر
                      </div>
                      <div className={`
                        flex items-center text-xs font-bold px-2.5 py-1.5 rounded-full shadow-sm
                        ${caravan.transportation_type === 'هوایی' ? 'bg-green-500 text-white' : ''}
                        ${caravan.transportation_type === 'زمینی' ? 'bg-blue-500 text-white' : ''}
                        ${caravan.transportation_type === 'ترکیبی' ? 'bg-purple-500 text-white' : ''}
                      `}>
                        {getTransportIcon(caravan.transportation_type)}
                        <span className="mr-1">{caravan.transportation_type}</span>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-5 flex-grow flex flex-col">
                    <div className="mb-3">
                      <h4 className="text-xl font-bold font-heading text-gray-800">{caravan.name}</h4>
                    </div>

                    <div className="space-y-3 mb-4 text-sm">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center ml-2">
                          <Calendar className="text-primary-600 w-4 h-4" strokeWidth={2} />
                        </div>
                        <span>تاریخ حرکت: <span className="font-medium">{caravan.departure_date}</span></span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center ml-2">
                          <Clock className="text-primary-600 w-4 h-4" strokeWidth={2} />
                        </div>
                        <span>مدت سفر: <span className="font-medium">{caravan.duration} روز</span></span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center ml-2">
                          <MapPin className="text-primary-600 w-4 h-4" strokeWidth={2} />
                        </div>
                        <span>فاصله تا حرم: <span className="font-medium">{caravan.accommodation_distance} متر</span></span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center ml-2">
                          <Hotel className="text-primary-600 w-4 h-4" strokeWidth={2} />
                        </div>
                        <span>اقامت: <span className="font-medium">{caravan.accommodation_type}</span></span>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4 mt-auto">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs">قیمت هر نفر</span>
                          <div className="text-2xl font-bold text-primary-700 font-heading">
                            {formatPrice(caravan.price)} <span className="text-sm">تومان</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => redirectToBooking(caravan)}
                          className={`
                            ${caravan.remaining_capacity <= 0
                              ? 'bg-gray-400 hover:bg-gray-500'
                              : 'bg-green-800 hover:bg-green-700'} 
                            transition-all shadow-md text-white font-medium`
                          }
                          disabled={caravan.remaining_capacity <= 0}
                        >
                          مشاهده و رزرو
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium mb-2">هیچ کاروانی با فیلترهای انتخاب شده یافت نشد.</p>
              <p className="text-gray-400 text-sm mb-4">لطفاً فیلترهای جستجو را تغییر دهید.</p>
              <Button
                onClick={() => {
                  setFilters({
                    departure_date: "",
                    duration: "",
                    transportation_type: "",
                    price_range: "",
                  });
                  refetch();
                }}
                variant="outline"
                className="border-gray-300"
              >
                پاک کردن فیلترها
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

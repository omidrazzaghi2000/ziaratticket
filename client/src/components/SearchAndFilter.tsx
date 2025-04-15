import { useState, FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Hotel, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface Caravan {
  id: number;
  name: string;
  departureDate: string;
  duration: number;
  transportationType: string;
  price: number;
  capacity: number;
  remainingCapacity: number;
  accommodationType: string;
  accommodationDistance: number;
  manager: string;
  description?: string;
  popular?: boolean;
  specialTag?: string;
  imageUrl?: string;
}

export default function SearchAndFilter() {
  const [filters, setFilters] = useState({
    departureDate: "",
    duration: "",
    transportationType: "",
    priceRange: "",
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
    if (caravan.remainingCapacity <= 0) {
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
  
  return (
    <section id="caravans" className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">جستجو و رزرو کاروان</h2>
        
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm mb-8">
          <form className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4" onSubmit={handleSearch}>
            <div>
              <Label className="mb-1">تاریخ حرکت</Label>
              <div className="relative">
                <Input 
                  type="text" 
                  placeholder="انتخاب تاریخ" 
                  value={filters.departureDate}
                  onChange={(e) => handleFilterChange("departureDate", e.target.value)}
                />
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              </div>
            </div>
            
            <div>
              <Label className="mb-1">مدت سفر</Label>
              <Select 
                value={filters.duration} 
                onValueChange={(value) => handleFilterChange("duration", value)}
              >
                <SelectTrigger>
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
              <Label className="mb-1">نوع حمل و نقل</Label>
              <Select 
                value={filters.transportationType} 
                onValueChange={(value) => handleFilterChange("transportationType", value)}
              >
                <SelectTrigger>
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
              <Label className="mb-1">محدوده قیمت (تومان)</Label>
              <Select 
                value={filters.priceRange} 
                onValueChange={(value) => handleFilterChange("priceRange", value)}
              >
                <SelectTrigger>
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
              <Button type="submit" className="w-full bg-primary-500 hover:bg-primary-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                جستجو
              </Button>
            </div>
          </form>
        </div>
        
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-4">کاروان‌های فعال</h3>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-5">
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <div className="pt-4 border-t border-gray-200 mt-4">
                        <div className="flex justify-between">
                          <Skeleton className="h-8 w-20" />
                          <Skeleton className="h-10 w-28" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-8">
              <p className="text-red-500">خطایی در دریافت اطلاعات کاروان‌ها رخ داده است. لطفاً دوباره تلاش کنید.</p>
            </div>
          ) : caravans && caravans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {caravans.map((caravan) => (
                <Card key={caravan.id} className="overflow-hidden border border-gray-200 flex flex-col transition hover:shadow-lg">
                  <div className="relative">
                    {caravan.imageUrl ? (
                      <div className="h-48 w-full bg-center bg-cover" style={{ backgroundImage: `url(${caravan.imageUrl})` }} />
                    ) : (
                      <div className="h-48 w-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500">تصویر موجود نیست</span>
                      </div>
                    )}
                    {caravan.popular && (
                      <div className="absolute top-3 right-3 bg-accent-700 text-white text-xs px-2 py-1 rounded-full">پرطرفدار</div>
                    )}
                    {caravan.specialTag && (
                      <div className="absolute top-3 right-3 bg-secondary-500 text-white text-xs px-2 py-1 rounded-full">{caravan.specialTag}</div>
                    )}
                    <div className="absolute top-3 left-3 bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
                      ظرفیت: {caravan.remainingCapacity} نفر
                    </div>
                  </div>
                  
                  <CardContent className="p-5 flex-grow flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-lg font-bold">{caravan.name}</h4>
                      <span className={`
                        text-xs px-2 py-1 rounded
                        ${caravan.transportationType === 'هوایی' ? 'bg-green-100 text-green-700' : ''}
                        ${caravan.transportationType === 'زمینی' ? 'bg-blue-100 text-blue-700' : ''}
                        ${caravan.transportationType === 'ترکیبی' ? 'bg-purple-100 text-purple-700' : ''}
                      `}>
                        {caravan.transportationType}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm">
                        <Calendar className="text-gray-500 ml-2 w-5 h-5" />
                        <span>تاریخ حرکت: {caravan.departureDate}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Clock className="text-gray-500 ml-2 w-5 h-5" />
                        <span>مدت سفر: {caravan.duration} روز</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Hotel className="text-gray-500 ml-2 w-5 h-5" />
                        <span>اقامت: {caravan.accommodationType} (فاصله تا حرم: {caravan.accommodationDistance} متر)</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <User className="text-gray-500 ml-2 w-5 h-5" />
                        <span>مدیر کاروان: {caravan.manager}</span>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-4 mt-auto">
                      <div className="flex justify-between items-center">
                        <div className="text-xl font-bold text-accent-700">
                          {formatPrice(caravan.price)} <span className="text-sm">تومان</span>
                        </div>
                        <Button 
                          onClick={() => redirectToBooking(caravan)}
                          className="bg-primary-500 hover:bg-primary-600 text-white"
                          disabled={caravan.remainingCapacity <= 0}
                        >
                          مشاهده و رزرو کاروان
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">هیچ کاروانی با فیلترهای انتخاب شده یافت نشد.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

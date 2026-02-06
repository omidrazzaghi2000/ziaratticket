import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { faCalendarAlt, faMapMarkerAlt, faUsers, faBed, faBus, faPlane, faUtensils, faPray, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface CaravanCardProps {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  price: number;
  capacity: number;
  availableSpots: number;
  image: string;
  features: {
    accommodation: string;
    transportation: string;
    meals: string;
    guide: string;
  };
}

export default function CaravanCard({
  id,
  title,
  description,
  startDate,
  endDate,
  price,
  capacity,
  availableSpots,
  image,
  features,
}: CaravanCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();

  const { mutate: reserveCaravan, isPending } = useMutation({
    mutationFn: (data: { caravanId: string }) => 
      apiRequest("POST", "/api/reservations", data),
    onSuccess: () => {
      toast({
        title: "رزرو موفق",
        description: "درخواست رزرو شما با موفقیت ثبت شد. کارشناسان ما به زودی با شما تماس خواهند گرفت.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطا در رزرو",
        description: error.message || "خطایی در ثبت رزرو رخ داده است. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      });
    },
  });

  const handleReserve = () => {
    reserveCaravan({ caravanId: id });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="relative h-48">
        <img 
          src={image} 
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm">
          {availableSpots} نفر باقیمانده
        </div>
      </div>
      
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{description}</p>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex items-center text-gray-600">
            <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4 ml-2" />
            <span className="text-sm">
              {format(new Date(startDate), "dd MMM yyyy")} تا{" "}
              {format(new Date(endDate), "dd MMM yyyy")}
            </span>
          </div>
          <div className="flex items-center text-gray-600">
            <FontAwesomeIcon icon={faMapMarkerAlt} className="w-4 h-4 ml-2" />
            <span className="text-sm">کربلا و نجف</span>
          </div>
          <div className="flex items-center text-gray-600">
            <FontAwesomeIcon icon={faUsers} className="w-4 h-4 ml-2" />
            <span className="text-sm">{capacity} نفر</span>
          </div>
          <div className="flex items-center text-gray-600">
            <FontAwesomeIcon icon={faBed} className="w-4 h-4 ml-2" />
            <span className="text-sm">{features.accommodation}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <div className="text-2xl font-bold text-green-600">
            {price.toLocaleString()} تومان
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center"
          >
            <FontAwesomeIcon icon={faInfoCircle} className="w-4 h-4 ml-1" />
            {showDetails ? "پنهان کردن جزئیات" : "مشاهده جزئیات"}
          </button>
        </div>
        
        {showDetails && (
          <div className="border-t border-gray-200 pt-4 mb-6">
            <h4 className="font-bold text-gray-900 mb-3">امکانات کاروان:</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center text-gray-600">
                <FontAwesomeIcon icon={faBus} className="w-4 h-4 ml-2" />
                <span className="text-sm">{features.transportation}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <FontAwesomeIcon icon={faPlane} className="w-4 h-4 ml-2" />
                <span className="text-sm">پرواز مستقیم</span>
              </div>
              <div className="flex items-center text-gray-600">
                <FontAwesomeIcon icon={faUtensils} className="w-4 h-4 ml-2" />
                <span className="text-sm">{features.meals}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <FontAwesomeIcon icon={faPray} className="w-4 h-4 ml-2" />
                <span className="text-sm">{features.guide}</span>
              </div>
            </div>
          </div>
        )}
        
        <button
          onClick={handleReserve}
          disabled={isPending || availableSpots === 0}
          className={`w-full py-3 px-4 rounded-lg text-white font-medium transition ${
            availableSpots === 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isPending ? "در حال ثبت..." : availableSpots === 0 ? "تکمیل ظرفیت" : "رزرو کاروان"}
        </button>
      </div>
    </div>
  );
} 
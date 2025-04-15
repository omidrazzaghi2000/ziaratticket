import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertTriangle, CreditCard } from "lucide-react";
import { useLocation } from "wouter";

interface PaymentStepProps {
  bookingId: number;
  totalPrice: number;
}

export default function PaymentStep({ bookingId, totalPrice }: PaymentStepProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [paymentMethod, setPaymentMethod] = useState<"online" | "inPerson">("online");

  // دریافت اطلاعات رزرو
  const { data: booking, isLoading: isLoadingBooking } = useQuery({
    queryKey: ['/api/bookings', bookingId],
    enabled: !!bookingId,
  });

  // تکمیل رزرو (بدون پرداخت آنلاین)
  const completeBookingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/bookings/${bookingId}/complete`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "رزرو تکمیل شد",
        description: "رزرو شما با موفقیت ثبت شد. جزئیات آن را در پنل کاربری می‌توانید مشاهده کنید.",
        variant: "default",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings', bookingId] });
      
      // هدایت به صفحه تایید نهایی
      setLocation("/booking-confirmation");
    },
    onError: (error: Error) => {
      toast({
        title: "خطا در تکمیل رزرو",
        description: error.message || "خطایی در تکمیل رزرو رخ داده است. لطفا دوباره تلاش کنید.",
        variant: "destructive",
      });
    },
  });

  // تغییر روش پرداخت
  const handlePaymentMethodChange = (method: "online" | "inPerson") => {
    setPaymentMethod(method);
  };

  // تکمیل فرآیند رزرو
  const handleCompleteBooking = () => {
    completeBookingMutation.mutate();
  };

  if (isLoadingBooking) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-gray-500">در حال بارگذاری اطلاعات رزرو...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-8">مرحله پرداخت</h2>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 ml-2 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-yellow-800">پرداخت آنلاین موقتا غیرفعال است</h3>
            <p className="text-yellow-700 text-sm mt-1">
              در حال حاضر سیستم پرداخت آنلاین غیرفعال است. شما می‌توانید رزرو خود را ثبت کنید و هزینه را به صورت حضوری پرداخت نمایید.
            </p>
          </div>
        </div>
      </div>

      <Card className="p-6 mb-6">
        <h3 className="font-bold text-lg mb-4">روش پرداخت</h3>
        
        <div className="space-y-4">
          <div 
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              paymentMethod === "online" 
                ? "border-primary/50 bg-primary/5" 
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => handlePaymentMethodChange("online")}
          >
            <div className="flex items-center">
              <div className={`w-5 h-5 rounded-full border mr-2 flex items-center justify-center ${
                paymentMethod === "online" ? "border-primary" : "border-gray-300"
              }`}>
                {paymentMethod === "online" && (
                  <div className="w-3 h-3 rounded-full bg-primary" />
                )}
              </div>
              <div className="flex items-center ml-2">
                <CreditCard className="w-5 h-5 text-gray-500 ml-2" />
                <span className="font-medium">پرداخت آنلاین</span>
              </div>
              <div className="text-gray-500 text-sm mr-auto">
                (غیرفعال)
              </div>
            </div>
          </div>
          
          <div 
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              paymentMethod === "inPerson" 
                ? "border-primary/50 bg-primary/5" 
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => handlePaymentMethodChange("inPerson")}
          >
            <div className="flex items-center">
              <div className={`w-5 h-5 rounded-full border mr-2 flex items-center justify-center ${
                paymentMethod === "inPerson" ? "border-primary" : "border-gray-300"
              }`}>
                {paymentMethod === "inPerson" && (
                  <div className="w-3 h-3 rounded-full bg-primary" />
                )}
              </div>
              <span className="font-medium">پرداخت حضوری</span>
            </div>
            <p className="text-gray-500 text-sm mt-2 mr-7">
              رزرو خود را اکنون ثبت کنید و هزینه را به صورت حضوری در دفتر کاروان پرداخت نمایید.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <h3 className="font-bold text-lg mb-4">خلاصه فاکتور</h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">هزینه کل سفر:</span>
            <span className="font-medium">{new Intl.NumberFormat('fa-IR').format(totalPrice)} تومان</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">تخفیف:</span>
            <span className="font-medium">۰ تومان</span>
          </div>
          <div className="border-t my-2"></div>
          <div className="flex justify-between font-bold">
            <span>مبلغ قابل پرداخت:</span>
            <span className="text-primary">{new Intl.NumberFormat('fa-IR').format(totalPrice)} تومان</span>
          </div>
        </div>
      </Card>

      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={() => setLocation(`/booking/${bookingId}/step3`)}
        >
          بازگشت به مرحله قبل
        </Button>
        
        <Button 
          onClick={handleCompleteBooking}
          disabled={completeBookingMutation.isPending}
          className="min-w-32"
        >
          {completeBookingMutation.isPending ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              در حال ثبت...
            </>
          ) : (
            <>
              <CheckCircle className="ml-2 h-4 w-4" />
              تکمیل رزرو
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
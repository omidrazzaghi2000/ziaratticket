import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus } from "lucide-react";

// Form validation schema
const bookingFormSchema = z.object({
  mainPassengerName: z.string().min(3, { message: "نام و نام خانوادگی الزامی است" }),
  mainPassengerId: z.string().min(10, { message: "کد ملی معتبر نیست" }),
  mainPassengerPhone: z.string().min(10, { message: "شماره موبایل معتبر نیست" }),
  mainPassengerBirthdate: z.string().min(5, { message: "تاریخ تولد الزامی است" }),
  address: z.string().min(10, { message: "آدرس الزامی است" }),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "پذیرش قوانین و مقررات الزامی است" }),
  }),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

export default function BookingModal() {
  const { isOpen, caravan, companions, closeModal, addCompanion, removeCompanion, updateCompanion, resetCompanions } = useBookingModal();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form setup
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      mainPassengerName: "",
      mainPassengerId: "",
      mainPassengerPhone: "",
      mainPassengerBirthdate: "",
      address: "",
      termsAccepted: false,
    },
  });
  
  // Handle form submission
  const { mutate: submitBooking, isPending } = useMutation({
    mutationFn: async (data: BookingFormValues) => {
      // Filter out empty companions
      const validCompanions = companions.filter(
        c => c.name && c.nationalId && c.relationship && c.birthdate
      );
      
      // Calculate total price
      const totalPeople = validCompanions.length + 1; // Main passenger + companions
      const totalPrice = caravan ? caravan.price * totalPeople : 0;
      
      // Format companions data for API
      const companionsData = validCompanions.map(c => 
        JSON.stringify({
          name: c.name,
          nationalId: c.nationalId,
          relationship: c.relationship,
          birthdate: c.birthdate
        })
      );
      
      if (!caravan) throw new Error("اطلاعات کاروان یافت نشد");
      
      return apiRequest("POST", "/api/bookings", {
        caravanId: caravan.id,
        mainPassengerName: data.mainPassengerName,
        mainPassengerId: data.mainPassengerId,
        mainPassengerPhone: data.mainPassengerPhone,
        mainPassengerBirthdate: data.mainPassengerBirthdate,
        address: data.address,
        companions: companionsData,
        totalPrice: totalPrice
      });
    },
    onSuccess: async () => {
      toast({
        title: "رزرو موفق",
        description: "رزرو شما با موفقیت ثبت شد.",
        variant: "default",
      });
      
      // Reset form and close modal
      form.reset();
      resetCompanions();
      closeModal();
      
      // Invalidate caravans query to refresh data
      await queryClient.invalidateQueries({ queryKey: ['/api/caravans'] });
    },
    onError: (error: Error) => {
      toast({
        title: "خطا در رزرو",
        description: error.message || "خطایی در ثبت رزرو رخ داده است. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submit
  const onSubmit = (data: BookingFormValues) => {
    // Validate companions if there are any
    const validCompanions = companions.filter(
      c => c.name && c.nationalId && c.relationship && c.birthdate
    );
    
    const invalidCompanions = companions.filter(
      c => (c.name || c.nationalId || c.relationship || c.birthdate) && 
      !(c.name && c.nationalId && c.relationship && c.birthdate)
    );
    
    if (invalidCompanions.length > 0) {
      toast({
        title: "اطلاعات همراهان ناقص است",
        description: "لطفاً اطلاعات تمام همراهان را کامل کنید یا همراهان ناقص را حذف نمایید.",
        variant: "destructive",
      });
      return;
    }
    
    submitBooking(data);
  };
  
  // Calculate total price
  const calculateTotalPrice = () => {
    if (!caravan) return 0;
    
    const validCompanions = companions.filter(
      c => c.name && c.nationalId && c.relationship && c.birthdate
    ).length;
    
    const totalPeople = validCompanions + 1; // Main passenger + companions
    return caravan.price * totalPeople;
  };
  
  // Format price with commas
  const formatPrice = (price: number): string => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="max-w-2xl text-right overflow-y-auto max-h-[90vh] sm:max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-primary-500 mb-4">
            رزرو کاروان «{caravan?.name}»
          </DialogTitle>
        </DialogHeader>
        
        {caravan && (
          <>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">تاریخ حرکت:</span>
                <span className="font-medium">{caravan.departureDate}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">مدت سفر:</span>
                <span className="font-medium">{caravan.duration} روز</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">نوع سفر:</span>
                <span className="font-medium">{caravan.transportationType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">هزینه هر نفر:</span>
                <span className="font-bold text-accent-700">{formatPrice(caravan.price)} تومان</span>
              </div>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <h4 className="font-bold text-gray-700 mb-3">اطلاعات سرپرست</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="mainPassengerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نام و نام خانوادگی</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="mainPassengerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>کد ملی</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="mainPassengerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>شماره موبایل</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="mainPassengerBirthdate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تاریخ تولد</FormLabel>
                          <FormControl>
                            <Input placeholder="مثال: ۱۳۶۵/۰۶/۱۰" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-gray-700">همراهان</h4>
                    <Button
                      type="button"
                      variant="outline"
                      className="text-primary-500 text-sm flex items-center p-0 h-auto bg-transparent border-0 hover:bg-transparent hover:text-primary-600"
                      onClick={addCompanion}
                    >
                      <Plus className="h-4 w-4 ml-1" />
                      افزودن همراه
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {companions.map((companion, index) => (
                      <div key={index} className="companion-item bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between mb-2">
                          <h5 className="font-medium text-gray-700">همراه {index + 1}</h5>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-red-500 text-sm h-auto p-0 bg-transparent border-0 hover:bg-transparent"
                            onClick={() => removeCompanion(index)}
                            disabled={companions.length === 1}
                          >
                            <X className="h-4 w-4 ml-1" />
                            حذف
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>نام و نام خانوادگی</Label>
                            <Input
                              value={companion.name}
                              onChange={(e) => updateCompanion(index, { name: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>کد ملی</Label>
                            <Input
                              value={companion.nationalId}
                              onChange={(e) => updateCompanion(index, { nationalId: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>نسبت</Label>
                            <Select
                              value={companion.relationship}
                              onValueChange={(value) => updateCompanion(index, { relationship: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="انتخاب کنید" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="spouse">همسر</SelectItem>
                                <SelectItem value="child">فرزند</SelectItem>
                                <SelectItem value="parent">والدین</SelectItem>
                                <SelectItem value="sibling">خواهر/برادر</SelectItem>
                                <SelectItem value="other">سایر</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>تاریخ تولد</Label>
                            <Input
                              placeholder="مثال: ۱۳۷۰/۰۴/۲۰"
                              value={companion.birthdate}
                              onChange={(e) => updateCompanion(index, { birthdate: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-bold text-gray-700 mb-3">اطلاعات تکمیلی</h4>
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>آدرس محل سکونت</FormLabel>
                        <FormControl>
                          <Textarea className="h-20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="termsAccepted"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-reverse space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="mr-2 text-sm">
                            قوانین و مقررات سفر زیارتی را مطالعه کرده و می‌پذیرم.
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <span className="block text-sm font-medium text-gray-500">
                        مجموع هزینه ({companions.filter(c => c.name && c.nationalId && c.relationship && c.birthdate).length + 1} نفر):
                      </span>
                      <span className="text-xl font-bold text-accent-700">
                        {formatPrice(calculateTotalPrice())} <span className="text-sm">تومان</span>
                      </span>
                    </div>
                    <div className="flex space-x-reverse space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeModal}
                      >
                        انصراف
                      </Button>
                      <Button
                        type="submit"
                        className="bg-primary-500 hover:bg-primary-600 text-white"
                        disabled={isPending}
                      >
                        {isPending ? "در حال ثبت..." : "تأیید و پرداخت"}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

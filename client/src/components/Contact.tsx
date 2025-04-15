import { useState, FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PhoneCall, MapPin, Mail, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Form validation schema
const contactFormSchema = z.object({
  name: z.string().min(3, { message: "نام و نام خانوادگی الزامی است" }),
  phone: z.string().min(10, { message: "شماره تماس معتبر نیست" }),
  email: z.string().email({ message: "ایمیل معتبر نیست" }).optional().or(z.literal("")),
  subject: z.string().min(1, { message: "انتخاب موضوع الزامی است" }),
  message: z.string().min(10, { message: "پیام باید حداقل ۱۰ کاراکتر باشد" }),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

// Form for newsletter subscription
const newsletterSchema = z.object({
  email: z.string().email({ message: "ایمیل معتبر نیست" }),
});

type NewsletterFormValues = z.infer<typeof newsletterSchema>;

export default function Contact() {
  const { toast } = useToast();
  
  // Contact form setup
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      subject: "",
      message: "",
    },
  });
  
  // Newsletter form setup
  const [newsletterEmail, setNewsletterEmail] = useState("");
  
  // Contact form submission
  const { mutate: submitContact, isPending: isContactPending } = useMutation({
    mutationFn: (data: ContactFormValues) => 
      apiRequest("POST", "/api/contacts", data),
    onSuccess: () => {
      toast({
        title: "پیام ارسال شد",
        description: "پیام شما با موفقیت ارسال شد. با تشکر از شما.",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "خطا در ارسال پیام",
        description: error.message || "خطایی در ارسال پیام رخ داده است. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      });
    },
  });
  
  // Newsletter subscription
  const { mutate: subscribeNewsletter, isPending: isNewsletterPending } = useMutation({
    mutationFn: (data: NewsletterFormValues) => 
      apiRequest("POST", "/api/newsletters", data),
    onSuccess: () => {
      toast({
        title: "عضویت موفق",
        description: "عضویت شما در خبرنامه با موفقیت انجام شد.",
      });
      setNewsletterEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "خطا در عضویت",
        description: error.message || "خطایی در ثبت عضویت در خبرنامه رخ داده است. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      });
    },
  });
  
  // Handle contact form submission
  const onSubmitContact = (data: ContactFormValues) => {
    submitContact(data);
  };
  
  // Handle newsletter form submission
  const handleNewsletterSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    try {
      const data = newsletterSchema.parse({ email: newsletterEmail });
      subscribeNewsletter(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "خطا در فرم",
          description: "لطفاً یک ایمیل معتبر وارد کنید.",
          variant: "destructive",
        });
      }
    }
  };
  
  return (
    <section id="contact" className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">تماس با ما</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-primary-100 text-primary-500 rounded-full flex items-center justify-center mb-4">
              <PhoneCall className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-3">تلفن پشتیبانی</h3>
            <p className="text-gray-700">۰۲۱-۸۸۹۹۷۷۶۶</p>
            <p className="text-gray-700">۰۹۱۲۳۴۵۶۷۸۹</p>
            <p className="text-gray-500 mt-2">هر روز از ساعت ۸ صبح تا ۸ شب</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-primary-100 text-primary-500 rounded-full flex items-center justify-center mb-4">
              <MapPin className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-3">دفتر مرکزی</h3>
            <p className="text-gray-700">تهران، خیابان ولیعصر، بالاتر از میدان ونک، ساختمان نور، طبقه ۵، واحد ۲۰</p>
            <p className="text-gray-500 mt-2">کد پستی: ۱۹۹۴۷۳۴۵۵۹</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-primary-100 text-primary-500 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-3">ارتباط آنلاین</h3>
            <p className="text-gray-700">info@karbala-caravan.com</p>
            <div className="flex items-center justify-center space-x-reverse space-x-4 mt-4">
              <a href="#" className="w-10 h-10 bg-primary-100 text-primary-500 rounded-full flex items-center justify-center hover:bg-primary-200 transition">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.05 1.577c-.393-.016-.784.08-1.117.235-.484.186-4.92 1.902-9.41 3.64-2.26.873-4.518 1.746-6.256 2.415-1.737.67-3.045 1.168-3.114 1.192-.46.16-.868.51-1.1.896-.24.394-.25.842-.14 1.24.32 1.09 1.472 6.32 1.556 6.65.065.254.222.496.46.643.24.152.485.187.726.17.24-.05.48-.226 2.43-1.26.654-.348 1.437-.765 1.778-.95.69-.36 1.924.243 2.004.315.243.216.462.38 1.06.21.194-.057.422-.15.673-.233.63-.197 1.47-.42 2.107-.583.507-.143.98-.276 1.052-.215.11.09.134.35.134.66.006.417.05.865.322 1.08.27.215.664.096 1.04-.07.376-.165 2.312-1.346 3.113-1.804l.424-.23c.19-.106.297-.237.362-.386.064-.148.112-.332.112-.522.007-.515-.176-.855-.36-1.1-.317-.422-.846-.673-1.194-.823-.153-.065-3.642-1.535-4.03-1.7-.393-.164-.678-.118-1.02.002-.55.194-1.2.964-1.548 1.277-.346.313-.707.103-1.246-.21-.54-.312-5.097-3.01-7.054-4.187-.36-.217-.565-.364-.51-.567.107-.352.672-.835 1.07-1.174.34-.29 5.855-5.05 6.076-5.262.253-.244.493-.498.532-.84.047-.355-.118-.792-.633-1.04-.119-.046-.726-.132-.9-.156z"/>
                </svg>
              </a>
              <a href="#" className="w-10 h-10 bg-primary-100 text-primary-500 rounded-full flex items-center justify-center hover:bg-primary-200 transition">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                </svg>
              </a>
              <a href="#" className="w-10 h-10 bg-primary-100 text-primary-500 rounded-full flex items-center justify-center hover:bg-primary-200 transition">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.498 24c-.266 0-.5-.093-.746-.28l-7.83-6.635-3.05 1.72c-.432.276-.992.163-1.292-.24-.125-.168-.192-.376-.192-.59V4.62c0-.213.067-.423.192-.597.184-.242.45-.38.724-.38.176 0 .352.05.506.14l11.744 7.5c.595.368.775 1.127.404 1.712-.115.176-.27.328-.445.437-.264.166-.252.148-.017.284.413.237.626.72.504 1.184-.08.295-.295.55-.57.68l-4.506 2.334c-.12.061-.182.193-.15.32.08.324-.124.658-.45.778-.09.033-.183.05-.276.05-.226 0-.444-.1-.596-.28l-2.125-2.142c-.048-.05-.12-.067-.184-.043-.063.024-.104.083-.104.15v4.48c0 .568-.46 1.03-1.028 1.03-.283 0-.55-.115-.748-.318-.198-.203-.308-.472-.308-.754 0-1.16.748-8.622.832-9.583.02-.205.148-.39.338-.484.346-.173.753-.078.963.234l1.99 2.97c.066.1.196.197.312.225.117.028.238-.012.318-.103l2.414-2.736c.062-.135.19-.24.34-.252.15-.04.38-.05.73.232l5.09 5.1c.202.204.312.473.312.754C18.525 23.54 18.064 24 17.498 24zM1.798 3.838c-.102 0-.203-.033-.284-.1-.11-.092-.173-.228-.173-.372V.922c0-.247.104-.37.284-.437.06-.023.12-.038.18-.038.12 0 .235.052.313.14l1.985 2.228c.086.096.092.235.046.345-.045.108-.146.183-.266.195l-1.802.46c-.093.023-.189.023-.282.023z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-12 bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-bold mb-6 text-center">ارسال پیام</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitContact)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <FormField
                  control={form.control}
                  name="name"
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
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>شماره تماس</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ایمیل</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>موضوع</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="انتخاب کنید" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="booking">رزرو کاروان</SelectItem>
                          <SelectItem value="info">اطلاعات بیشتر</SelectItem>
                          <SelectItem value="support">پشتیبانی</SelectItem>
                          <SelectItem value="suggestion">پیشنهادات</SelectItem>
                          <SelectItem value="complaint">شکایات</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>پیام شما</FormLabel>
                    <FormControl>
                      <Textarea className="h-32" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-center">
                <Button 
                  type="submit" 
                  className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-3"
                  disabled={isContactPending}
                >
                  {isContactPending ? "در حال ارسال..." : "ارسال پیام"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </section>
  );
}

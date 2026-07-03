import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth";
import { AuthModal } from "@/components/auth";
import { djangoURL } from "@/App";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, ArrowRight, Users, CheckCircle2, Bus } from "lucide-react";

const MESSAGING_APPS = [
  { id: "whatsapp", label: "واتساپ" },
  { id: "bale", label: "بله" },
  { id: "eitaa", label: "ایتا" },
];

const schema = z.object({
  full_name: z.string().min(3, "نام و نام خانوادگی الزامی است"),
  national_id: z.string().min(10, "کد ملی صحیح نیست").max(10, "کد ملی ۱۰ رقمی است"),
  birth_certificate_no: z.string().min(1, "شماره شناسنامه الزامی است"),
  address: z.string().min(10, "آدرس کامل وارد کنید"),
  messaging_apps: z.array(z.string()).min(1, "حداقل یک پیام‌رسان انتخاب کنید"),
  leader_bio: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function IslamicPattern({ opacity = 0.04 }: { opacity?: number }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg" style={{ opacity }}>
      <defs>
        <pattern id="pattern-leader" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <polygon points="30,4 33,21 48,16 36,27 48,38 33,33 30,50 27,33 12,38 24,27 12,16 27,21" fill="currentColor" opacity="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#pattern-leader)" />
    </svg>
  );
}

export default function CaravanLeaderRegister() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [success, setSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      national_id: "",
      birth_certificate_no: "",
      address: "",
      messaging_apps: [],
      leader_bio: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await fetch(`${djangoURL}/api/leader/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("AUTH_TOKEN_KEY") || "",
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "خطا در ثبت اطلاعات");
      }
      return res.json();
    },
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (err: Error) => {
      toast({ title: "خطا", description: err.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: FormValues) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    mutation.mutate(data);
  };

  if (success) {
    return (
      <div className="bg-background min-h-screen">
        <Header />
        <div className="container max-w-lg mx-auto py-24 pt-32 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-3xl p-10 shadow-lg"
          >
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground mb-3">ثبت‌نام کامل شد!</h1>
            <p className="text-muted-foreground text-sm leading-6 mb-6">
              ثبت‌نام شما به عنوان مدیر کاروان با موفقیت انجام شد. همین الان می‌توانید کاروان‌های خود را ثبت کنید.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => navigate("/leader/add-caravan")} className="flex-1 rounded-xl">
                ثبت کاروان جدید
              </Button>
              <Button onClick={() => navigate("/leader/dashboard")} variant="outline" className="flex-1 rounded-xl">
                داشبورد
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <Header />

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-primary to-primary/70 pt-20">
        <IslamicPattern opacity={0.06} />
        <div className="container px-4 py-8 relative">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-white/15 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-3">
              <Bus className="h-3.5 w-3.5 shrink-0" />
              ثبت‌نام مدیر کاروان
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-black text-white mb-2">به خانواده زیارت تیکت بپیوندید</h1>
            <p className="text-white/70 text-sm max-w-xl">
              کاروان‌های خود را ثبت کنید، مسافرانتان را مدیریت کنید و تجربه زیارتی بهتری بسازید.
            </p>
          </motion.div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />
      </div>

      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Steps */}
        <div className="flex items-center mb-8">
          {["ورود به سایت", "تکمیل اطلاعات", "ثبت کاروان"].map((step, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 ${
                  i < 2 ? "bg-primary border-primary text-white" : "bg-background border-border text-muted-foreground"
                }`}>
                  {i < 2 ? "✓" : i + 1}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-center hidden sm:block whitespace-nowrap">{step}</p>
              </div>
              {i < 2 && <div className={`h-px flex-1 mx-1 ${i < 1 ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border shadow-sm"
        >
          <div className="px-4 sm:px-6 py-5 border-b border-border">
            <h2 className="font-heading font-bold text-lg sm:text-xl text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary shrink-0" />
              اطلاعات مدیر کاروان
            </h2>
            <p className="text-muted-foreground text-sm mt-1">لطفاً اطلاعات خود را با دقت وارد کنید.</p>
          </div>

          <div className="px-4 sm:px-6 py-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>نام و نام خانوادگی *</FormLabel>
                        <FormControl><Input className="rounded-xl" placeholder="علی احمدی" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="national_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>کد ملی *</FormLabel>
                        <FormControl><Input className="rounded-xl" placeholder="۱۲۳۴۵۶۷۸۹۰" maxLength={10} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birth_certificate_no"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>شماره شناسنامه *</FormLabel>
                        <FormControl><Input className="rounded-xl" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>آدرس *</FormLabel>
                      <FormControl>
                        <Textarea className="rounded-xl resize-none" rows={2} placeholder="استان، شهر، خیابان، کوچه، پلاک" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="messaging_apps"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>پیام‌رسان‌های فعال *</FormLabel>
                      <div className="flex gap-4 flex-wrap mt-1">
                        {MESSAGING_APPS.map((app) => (
                          <label key={app.id} className="flex items-center gap-2 cursor-pointer select-none">
                            <Checkbox
                              checked={field.value?.includes(app.id)}
                              onCheckedChange={(checked) => {
                                const next = checked
                                  ? [...(field.value || []), app.id]
                                  : (field.value || []).filter((v) => v !== app.id);
                                field.onChange(next);
                              }}
                            />
                            <span className="text-sm font-medium">{app.label}</span>
                          </label>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="leader_bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>معرفی کوتاه (اختیاری)</FormLabel>
                      <FormControl>
                        <Textarea className="rounded-xl resize-none" rows={3}
                          placeholder="سابقه برگزاری کاروان، تعداد سفرهای انجام‌شده و هر اطلاعات مفیدی درباره کاروان‌داری خود..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 leading-6">
                  با ثبت این فرم، بلافاصله می‌توانید کاروان‌های خود را ثبت کنید. کاروان‌های ثبت‌شده پس از بررسی ادمین برای عموم نمایش داده می‌شوند.
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl flex-1"
                    onClick={() => navigate("/")}
                  >
                    <ArrowRight className="ml-2 h-4 w-4" />
                    انصراف
                  </Button>
                  <Button
                    type="submit"
                    disabled={mutation.isPending}
                    className="rounded-xl flex-1 bg-primary hover:bg-primary/90 text-white"
                  >
                    {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                    ثبت درخواست
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </motion.div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="ورود برای ثبت‌نام مدیر کاروان"
        description="لطفاً ابتدا وارد حساب کاربری خود شوید."
      />
    </div>
  );
}

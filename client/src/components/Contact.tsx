import { useState, FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PhoneCall, MapPin, Mail, Send, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

const contactFormSchema = z.object({
  name: z.string().min(3, { message: "نام و نام خانوادگی الزامی است" }),
  phone: z.string().min(10, { message: "شماره تماس معتبر نیست" }),
  email: z.string().email({ message: "ایمیل معتبر نیست" }).optional().or(z.literal("")),
  subject: z.string().min(1, { message: "انتخاب موضوع الزامی است" }),
  message: z.string().min(10, { message: "پیام باید حداقل ۱۰ کاراکتر باشد" }),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const contactItems = [
  {
    icon: PhoneCall,
    title: "تلفن پشتیبانی",
    lines: ["۰۲۱-۸۸۹۹۷۷۶۶", "۰۹۱۲-۳۴۵-۶۷۸۹"],
    note: "هر روز ۸ صبح تا ۸ شب",
    color: "text-primary",
    bg: "bg-primary/8",
    border: "border-primary/15",
  },
  {
    icon: MapPin,
    title: "دفتر مرکزی",
    lines: ["تهران، خیابان ولیعصر، بالاتر از میدان ونک"],
    note: "ساختمان نور، طبقه ۵، واحد ۲۰",
    color: "text-gold-700",
    bg: "bg-gold-50",
    border: "border-gold-100",
  },
  {
    icon: Mail,
    title: "ایمیل",
    lines: ["info@karbala-caravan.com"],
    note: "پاسخگویی ظرف ۲۴ ساعت",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-100",
  },
];

export default function Contact() {
  const { toast } = useToast();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: "", phone: "", email: "", subject: "", message: "" },
  });

  const { mutate: submitContact, isPending } = useMutation({
    mutationFn: (data: ContactFormValues) => apiRequest("POST", "/api/contacts", data),
    onSuccess: () => {
      toast({ title: "پیام ارسال شد", description: "پیام شما با موفقیت ارسال شد. به زودی پاسخ می‌دهیم." });
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "خطا در ارسال", description: error.message, variant: "destructive" });
    },
  });

  return (
    <section id="contact" className="py-24 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-geometric opacity-25 pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <span className="inline-flex items-center gap-2 bg-primary/8 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-5 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
            ارتباط با ما
          </span>
          <h2 className="font-heading text-display-sm text-foreground mb-4">تماس با ما</h2>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-gold-400/60" />
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 0L10 6L16 8L10 10L8 16L6 10L0 8L6 6Z" fill="hsl(42 60% 52%)" opacity="0.8" />
            </svg>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-gold-400/60" />
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
            هر سوالی دارید، آماده‌ایم پاسخ دهیم. از طریق راه‌های ارتباطی زیر با ما در تماس باشید.
          </p>
        </motion.div>

        {/* Contact info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          {contactItems.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className={`bg-card rounded-2xl p-6 border ${item.border} shadow-card hover:shadow-card-hover transition-shadow text-center flex flex-col items-center group`}
            >
              <div className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <item.icon className={`h-5 w-5 ${item.color}`} strokeWidth={1.5} />
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground mb-2">{item.title}</h3>
              {item.lines.map((line, j) => (
                <p key={j} className="text-foreground/80 text-sm font-medium">{line}</p>
              ))}
              <p className="text-muted-foreground text-xs mt-2">{item.note}</p>
            </motion.div>
          ))}
        </div>

        {/* Contact form */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, delay: 0.15 }}
          className="bg-card rounded-2xl border border-border shadow-card p-7 md:p-10 relative overflow-hidden"
        >
          {/* Decorative */}
          <div className="absolute top-0 left-0 w-40 h-40 bg-primary/3 rounded-full -ml-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-gold-100/40 rounded-full -mr-16 -mb-16 pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-3 mb-7">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-heading text-xl font-bold text-foreground">ارسال پیام</h3>
                <p className="text-muted-foreground text-xs">پیام شما ظرف ۲۴ ساعت پاسخ داده می‌شود</p>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => submitContact(d))} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground/80">نام و نام خانوادگی</FormLabel>
                        <FormControl>
                          <Input {...field} className="rounded-xl border-border bg-background h-11 focus:border-primary focus:ring-primary/20" />
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
                        <FormLabel className="text-sm font-medium text-foreground/80">شماره تماس</FormLabel>
                        <FormControl>
                          <Input {...field} className="rounded-xl border-border bg-background h-11 focus:border-primary focus:ring-primary/20" />
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
                        <FormLabel className="text-sm font-medium text-foreground/80">ایمیل <span className="text-muted-foreground font-normal">(اختیاری)</span></FormLabel>
                        <FormControl>
                          <Input {...field} className="rounded-xl border-border bg-background h-11 focus:border-primary focus:ring-primary/20" />
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
                        <FormLabel className="text-sm font-medium text-foreground/80">موضوع</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl border-border bg-background h-11">
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
                      <FormLabel className="text-sm font-medium text-foreground/80">پیام شما</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={4}
                          className="rounded-xl border-border bg-background resize-none focus:border-primary focus:ring-primary/20"
                          placeholder="پیام خود را بنویسید..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-8 h-11 font-semibold gap-2 shadow-emerald-sm hover:shadow-emerald transition-all"
                    >
                      {isPending ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          در حال ارسال...
                        </span>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          ارسال پیام
                        </>
                      )}
                    </Button>
                  </motion.div>
                </div>
              </form>
            </Form>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

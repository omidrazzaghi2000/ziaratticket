import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const phoneSchema = z.object({
  phone: z.string()
    .min(11, { message: "شماره موبایل باید حداقل ۱۱ رقم باشد" })
    .max(11, { message: "شماره موبایل باید حداکثر ۱۱ رقم باشد" })
    .regex(/^09\d{9}$/, { message: "فرمت شماره موبایل صحیح نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)" })
});

const verifySchema = z.object({
  phone: z.string().min(11),
  code: z.string()
    .min(4, { message: "کد تایید باید حداقل ۴ رقم باشد" })
    .max(5, { message: "کد تایید باید حداکثر ۵ رقم باشد" })
});

type PhoneFormData = z.infer<typeof phoneSchema>;
type VerifyFormData = z.infer<typeof verifySchema>;

interface LoginFormProps {
  onLoginSuccess?: () => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [step, setStep] = useState<"phone" | "verify">("phone");
  const [phone, setPhone] = useState("");
  const { toast } = useToast();

  // فرم ارسال کد تایید به شماره موبایل
  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phone: "",
    },
  });

  // فرم تایید کد دریافتی
  const verifyForm = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      phone: "",
      code: "",
    },
  });

  // ارسال کد تایید به شماره موبایل
  const sendCodeMutation = useMutation({
    mutationFn: async (data: PhoneFormData) => {
      const response = await apiRequest("POST", "/api/auth/send-code", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "ارسال کد تایید",
        description: "کد تایید با موفقیت به شماره موبایل شما ارسال شد.",
      });
      setPhone(data.phone);
      setStep("verify");
      verifyForm.setValue("phone", data.phone);
    },
    onError: (error: Error) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در ارسال کد تایید. لطفا دوباره تلاش کنید.",
        variant: "destructive",
      });
    },
  });

  // تایید کد و ورود
  const verifyCodeMutation = useMutation({
    mutationFn: async (data: VerifyFormData) => {
      const response = await apiRequest("POST", "/api/auth/verify", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "ورود موفق",
        description: "شما با موفقیت وارد شدید.",
      });
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "خطا",
        description: error.message || "کد تایید نامعتبر است. لطفا دوباره تلاش کنید.",
        variant: "destructive",
      });
    },
  });

  // ارسال فرم شماره موبایل
  const onSubmitPhone = (data: PhoneFormData) => {
    sendCodeMutation.mutate(data);
  };

  // ارسال فرم کد تایید
  const onSubmitVerify = (data: VerifyFormData) => {
    verifyCodeMutation.mutate(data);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-6">
      {step === "phone" ? (
        <>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-primary mb-2">ورود با شماره موبایل</h2>
            <p className="text-gray-500 text-sm">
              لطفا شماره موبایل خود را وارد کنید تا کد تایید برای شما ارسال شود.
            </p>
          </div>

          <Form {...phoneForm}>
            <form onSubmit={phoneForm.handleSubmit(onSubmitPhone)} className="space-y-4">
              <FormField
                control={phoneForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>شماره موبایل</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹"
                        {...field}
                        disabled={sendCodeMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={sendCodeMutation.isPending}
              >
                {sendCodeMutation.isPending ? "در حال ارسال..." : "ارسال کد تایید"}
              </Button>
            </form>
          </Form>
        </>
      ) : (
        <>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-primary mb-2">تایید شماره موبایل</h2>
            <p className="text-gray-500 text-sm">
              کد تایید ارسال شده به شماره {phone} را وارد کنید.
            </p>
          </div>

          <Form {...verifyForm}>
            <form onSubmit={verifyForm.handleSubmit(onSubmitVerify)} className="space-y-4">
              <FormField
                control={verifyForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>کد تایید</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="کد تایید را وارد کنید"
                        {...field}
                        disabled={verifyCodeMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={verifyCodeMutation.isPending}
                >
                  {verifyCodeMutation.isPending ? "در حال بررسی..." : "تایید و ورود"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setStep("phone")}
                  disabled={sendCodeMutation.isPending || verifyCodeMutation.isPending}
                >
                  بازگشت
                </Button>
              </div>
            </form>
          </Form>
        </>
      )}
    </div>
  );
}
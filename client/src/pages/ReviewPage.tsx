import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Star, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { djangoURL } from "@/App";

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-2 justify-center" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110 focus:outline-none"
        >
          <Star
            className="w-10 h-10 transition-colors"
            fill={(hovered || value) >= star ? "#f59e0b" : "none"}
            stroke={(hovered || value) >= star ? "#f59e0b" : "#d1d5db"}
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewPage() {
  const [, params] = useRoute("/review/:token");
  const token = params?.token ?? "";

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const { data, isLoading, isError } = useQuery<{
    caravan_name: string;
    reviewer_name: string;
    is_submitted: boolean;
  }>({
    queryKey: ["review-token", token],
    queryFn: () => fetch(`${djangoURL}/api/review/${token}`).then(r => {
      if (!r.ok) throw new Error("invalid");
      return r.json();
    }),
    enabled: !!token,
    retry: false,
  });

  const submit = useMutation({
    mutationFn: () =>
      fetch(`${djangoURL}/api/review/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      }).then(async r => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.message || "خطا");
        return j;
      }),
  });

  const ratingLabels = ["", "خیلی بد", "بد", "متوسط", "خوب", "عالی"];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-amber-50">
        <div className="animate-pulse text-muted-foreground">در حال بارگذاری...</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-amber-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="font-heading font-bold text-lg mb-2">لینک معتبر نیست</h2>
          <p className="text-muted-foreground text-sm">این لینک نظرسنجی وجود ندارد یا منقضی شده است.</p>
        </div>
      </div>
    );
  }

  if (data.is_submitted || submit.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-amber-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center"
        >
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
          <h2 className="font-heading font-bold text-xl mb-2 text-emerald-800">ممنون از نظر شما</h2>
          <p className="text-muted-foreground text-sm">
            {data.is_submitted && !submit.isSuccess
              ? "نظر شما برای این کاروان قبلاً ثبت شده است."
              : "نظر شما با موفقیت ثبت شد و به زائران دیگر کمک می‌کند."}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-amber-50 p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-3xl mb-3">🕌</div>
          <h1 className="font-heading font-bold text-xl text-foreground mb-1">نظرسنجی کاروان</h1>
          <p className="text-primary font-semibold text-base">{data.caravan_name}</p>
          {data.reviewer_name && (
            <p className="text-muted-foreground text-sm mt-1">
              {data.reviewer_name} عزیز، تجربه سفر خود را با ما در میان بگذارید
            </p>
          )}
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            if (rating === 0) return;
            submit.mutate();
          }}
          className="space-y-6"
        >
          {/* Star rating */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">امتیاز شما به این کاروان</p>
            <StarRating value={rating} onChange={setRating} />
            <AnimatePresence mode="wait">
              {rating > 0 && (
                <motion.p
                  key={rating}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-amber-600 font-semibold text-sm mt-2"
                >
                  {ratingLabels[rating]}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Comment */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              نظر و توضیحات <span className="text-muted-foreground font-normal">(اختیاری)</span>
            </label>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="تجربه سفر، کیفیت خدمات، برخورد مدیر کاروان و... را بنویسید"
              rows={4}
              className="resize-none text-sm"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground mt-1 text-left">{comment.length}/۱۰۰۰</p>
          </div>

          {submit.isError && (
            <p className="text-red-500 text-sm text-center">{(submit.error as Error).message}</p>
          )}

          <Button
            type="submit"
            disabled={rating === 0 || submit.isPending}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-xl h-11"
          >
            {submit.isPending ? "در حال ثبت..." : "ثبت نظر"}
          </Button>

          {rating === 0 && (
            <p className="text-xs text-muted-foreground text-center">برای ثبت نظر ابتدا یک ستاره انتخاب کنید</p>
          )}
        </form>
      </motion.div>
    </div>
  );
}

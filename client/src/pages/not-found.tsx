import { Link } from "wouter";
import { AlertCircle, Home as HomeIcon, ArrowRight } from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <Header solid />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" aria-hidden="true" />

            <h1 className="text-2xl font-bold text-foreground mb-2">صفحه پیدا نشد</h1>

            <p className="text-sm text-muted-foreground leading-7 mb-6">
              نشانی‌ای که وارد کرده‌اید وجود ندارد یا صفحه جابه‌جا شده است.
              از صفحه اصلی می‌توانید کاروان‌های فعال را ببینید.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="min-h-11">
                <Link href="/">
                  <HomeIcon className="h-4 w-4 ml-2" aria-hidden="true" />
                  صفحه اصلی
                </Link>
              </Button>
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => window.history.back()}
              >
                <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
                بازگشت به صفحه قبل
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import BookingStepOne from "@/pages/BookingStepOne";
import BookingStepTwo from "@/pages/BookingStepTwo";
import BookingStepThree from "@/pages/BookingStepThree";
import BookingSuccess from "@/pages/BookingSuccess";
import "./lib/fonts.css";
export const djangoURL = "http://localhost:8000";
function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/booking/:caravanId" component={BookingStepOne} />
      <Route path="/booking/:bookingId/step2" component={BookingStepTwo} />
      <Route path="/booking/:bookingId/step3" component={BookingStepThree} />
      <Route path="/booking/:bookingId/success" component={BookingSuccess} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

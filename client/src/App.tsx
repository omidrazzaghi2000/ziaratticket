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
import CaravanDetail from "@/pages/CaravanDetail";
import CaravanLeaderRegister from "@/pages/CaravanLeaderRegister";
import CaravanLeaderDashboard from "@/pages/CaravanLeaderDashboard";
import CaravanLeaderAddCaravan from "@/pages/CaravanLeaderAddCaravan";
import ReviewPage from "@/pages/ReviewPage";
import "./lib/fonts.css";
export const djangoURL = import.meta.env.VITE_API_URL ?? "";
function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/caravan/:caravanId" component={CaravanDetail} />
      <Route path="/booking/:caravanId" component={BookingStepOne} />
      <Route path="/booking/:bookingId/step2" component={BookingStepTwo} />
      <Route path="/booking/:bookingId/step3" component={BookingStepThree} />
      <Route path="/booking/:bookingId/success" component={BookingSuccess} />
      <Route path="/leader/register" component={CaravanLeaderRegister} />
      <Route path="/leader/dashboard" component={CaravanLeaderDashboard} />
      <Route path="/leader/add-caravan" component={CaravanLeaderAddCaravan} />
      <Route path="/review/:token" component={ReviewPage} />
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

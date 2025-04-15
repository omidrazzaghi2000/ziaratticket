import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import BookingStepOne from "@/pages/BookingStepOne";
import BookingConfirmation from "@/pages/BookingConfirmation";
import "./lib/fonts.css";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/booking/:caravanId" component={BookingStepOne} />
      <Route path="/booking-confirmation" component={BookingConfirmation} />
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

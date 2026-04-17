import Header from "@/components/Header";
import Hero from "@/components/Hero";
import PrayerTimes from "@/components/PrayerTimes";
import Features from "@/components/Features";
import SearchAndFilter from "@/components/SearchAndFilter";
import PilgrimageGuide from "@/components/PilgrimageGuide";
import FAQ from "@/components/FAQ";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import BookingModal from "@/components/BookingModal";

export default function Home() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      <Hero />
      {/* <PrayerTimes /> */}
      <Features />
      <SearchAndFilter />
      <PilgrimageGuide />
      <FAQ />
      <Contact />
      <Footer />
      <BookingModal />
    </div>
  );
}

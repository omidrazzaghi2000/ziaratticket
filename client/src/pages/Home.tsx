import Header from "@/components/Header";
import Hero from "@/components/Hero";
import PrayerTimes from "@/components/PrayerTimes";
import Features from "@/components/Features";
import SearchAndFilter from "@/components/SearchAndFilter";
import Gallery from "@/components/Gallery";
import LanternStrip from "@/components/LanternStrip";
import PilgrimageGuide from "@/components/PilgrimageGuide";
import FAQ from "@/components/FAQ";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import BookingModal from "@/components/BookingModal";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <PrayerTimes />
      <Features />
      <SearchAndFilter />
      <Gallery />
      <LanternStrip />
      <PilgrimageGuide />
      <FAQ />
      <Contact />
      <Footer />
      <BookingModal />
    </div>
  );
}

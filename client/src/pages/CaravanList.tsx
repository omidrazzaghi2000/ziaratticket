import { useParams } from "wouter";
import Header from "@/components/Header";
import SearchAndFilter from "@/components/SearchAndFilter";
import Footer from "@/components/Footer";

/** Caravans for a single destination, reached from the hero's shrine buttons. */
export default function CaravanList() {
  const { destination } = useParams<{ destination: string }>();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-20">
        <SearchAndFilter initialDestination={destination ?? ""} />
      </div>
      <Footer />
    </div>
  );
}

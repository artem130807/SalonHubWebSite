import { BookingProvider } from "@/components/BookingProvider";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { Barbershops } from "@/components/Barbershops";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <BookingProvider>
      <div className="min-h-screen">
        <Navbar />
        <main>
          <Hero />
          <Services />
          <Barbershops />
        </main>
        <Footer />
      </div>
    </BookingProvider>
  );
}

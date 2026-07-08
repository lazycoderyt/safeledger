import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustCarousel from "@/components/Trustbanner";
import HeroCarousel from "@/components/HeroCarousel";
import AboutServices from "@/components/Aboutservice";
import CustomerSatisfaction from "@/components/Customer";
import Footer from "@/components/Footer";

/**
 * ApexGlobalLanding — composes the standalone Navbar and Hero sections.
 * Stack: Next.js + Tailwind CSS + lucide-react
 */
export default function ApexGlobalLanding() {
  return (
    <main className="min-h-screen bg-white font-sans antialiased">
      <Navbar />
      <HeroCarousel />
      <TrustCarousel />
      <Hero />
      <AboutServices />
      <CustomerSatisfaction />
      <Footer />
    </main>
  );
}

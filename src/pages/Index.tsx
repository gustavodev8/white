import Header from "@/components/Header";
import QuickAccessIcons from "@/components/QuickAccessIcons";
import HeroBanner from "@/components/HeroBanner";
import BenefitsStrip from "@/components/BenefitsStrip";
import ProductCarousel from "@/components/ProductCarousel";
import CategoryHighlight from "@/components/CategoryHighlight";
import HealthServices from "@/components/HealthServices";
import SiteFooter from "@/components/SiteFooter";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <QuickAccessIcons />
      <HeroBanner />
      <BenefitsStrip />
      <ProductCarousel title="Mais comprados" />
      <ProductCarousel title="Ofertas imperdiveis do mes" />
      <CategoryHighlight />
      <ProductCarousel title="Mais Vistos" />
      <HealthServices />
      <ProductCarousel title="Tendencias de skincare asiatico" />
      <SiteFooter />
    </div>
  );
};

export default Index;

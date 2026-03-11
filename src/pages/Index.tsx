import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import QuickAccessIcons from "@/components/QuickAccessIcons";
import ProductCarousel from "@/components/ProductCarousel";
import CategoryHighlight from "@/components/CategoryHighlight";
import SiteFooter from "@/components/SiteFooter";
import { useActiveSections } from "@/hooks/useSections";
import { Fragment } from "react";

const Index = () => {
  const sections = useActiveSections();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroBanner />
      <QuickAccessIcons />

      {sections.map((section, index) => (
        <Fragment key={section.id}>
          <ProductCarousel title={section.name} />
          {index === 1 && <CategoryHighlight />}
        </Fragment>
      ))}

      <SiteFooter />
    </div>
  );
};

export default Index;

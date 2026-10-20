import HeroSection from "@/components/sections/HeroSection";
import RoleWorkflowsSection from "@/components/sections/RoleWorkflowsSection";
import KeyFeaturesSection from "@/components/sections/KeyFeaturesSection";
import WhyCampusSection from "@/components/sections/WhyCampusSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import FAQSection from "@/components/sections/FAQSection";
import CTABanner from "@/components/sections/CTABanner";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <RoleWorkflowsSection />
      <KeyFeaturesSection />
      <WhyCampusSection />
      <HowItWorksSection />
      <FAQSection />
      <CTABanner variant="teal" />
    </>
  );
}

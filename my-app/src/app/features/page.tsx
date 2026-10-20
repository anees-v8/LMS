import type { Metadata } from "next";
import DetailedFeaturesGrid from "@/components/sections/DetailedFeaturesGrid";
import WhyCampusSection from "@/components/sections/WhyCampusSection";
import CTABanner from "@/components/sections/CTABanner";

export const metadata: Metadata = {
  title: "Features — CampusWeb",
  description:
    "Explore all the powerful features of CampusWeb: Live Dashboard, Attendance, WhatsApp Fees, Online Tests, Live Classes, and Student App.",
};

export default function FeaturesPage() {
  return (
    <>
      <DetailedFeaturesGrid />
      <WhyCampusSection />
      <CTABanner
        variant="dark"
        title="Ready to See CampusWeb in Action?"
        subtitle="Book a personalized live demo and see how these features can streamline your coaching operations."
      />
    </>
  );
}

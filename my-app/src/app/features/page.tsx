import type { Metadata } from "next";
import DetailedFeaturesGrid from "@/components/sections/DetailedFeaturesGrid";
import WhyCampusSection from "@/components/sections/WhyCampusSection";
import CTABanner from "@/components/sections/CTABanner";

export const metadata: Metadata = {
  title: "Features — CampusWeb | Complete Coaching Operating System",
  description:
    "Explore all the powerful features of CampusWeb: Real-time Attendance, Automated Fee Reminders, Online Tests, Live Classes, and Dedicated Mobile Apps.",
  alternates: {
    canonical: "/features",
  },
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

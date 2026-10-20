import React from "react";
import Image from "next/image";
import type { Metadata } from "next";
import {
  Calendar,
  Sparkles,
  MessageSquare,
  Play,
  LayoutDashboard,
  Users,
  CreditCard,
  Video,
  FileText,
  Settings,
  Phone,
  Mail,
  CheckCircle2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { TRUST_BADGES } from "@/utils/constants";
import DemoBookingForm from "@/components/sections/DemoBookingForm";

export const metadata: Metadata = {
  title: "Book a Free 1-on-1 Demo — CampusWeb",
  description:
    "See CampusWeb in action with a personalized 1-on-1 walkthrough tailored to your institute's batches, fees, and attendance.",
  alternates: {
    canonical: "/demo",
  },
};

const DEMO_FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Institute Dashboard",
    description: "Get a complete overview of your institute.",
  },
  {
    icon: Users,
    title: "Students & Attendance",
    description: "Manage students and track attendance easily.",
  },
  {
    icon: CreditCard,
    title: "Fees Management",
    description: "Collect fees online and manage payments.",
  },
  {
    icon: Video,
    title: "Live Classes",
    description: "Conduct and manage live classes seamlessly.",
  },
  {
    icon: FileText,
    title: "Tests & Reports",
    description: "Create tests and analyze performance.",
  },
  {
    icon: Settings,
    title: "Settings & Customization",
    description: "Customize your institute the way you want.",
  },
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="pt-6 pb-14 md:pt-10 md:pb-20 bg-gradient-to-b from-white via-white to-[#F4F6F3] border-b border-black/[0.06] flex flex-col justify-center overflow-hidden">
        <div className="container-main flex-grow flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left Content */}
            <div className="max-w-xl">
              <span className="badge-gold inline-flex items-center gap-1.5 mb-3 font-semibold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-brass-gold" />
                Personalized Institute Walkthrough
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-display font-bold text-ink-green leading-[1.1] mb-2">
                See Campus in Action
              </h1>
              <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-display font-bold text-brass-gold leading-[1.1] mb-6">
                A Quick Demo for You.
              </h2>
              <p className="text-base sm:text-lg text-ink-green/70 font-body leading-relaxed mb-8">
                Explore how CampusWeb simplifies daily batch management, attendance, and fee collection 100% from your mobile.
              </p>

              {/* Bullet Points */}
              <div className="space-y-4 mb-8">
                <div className="flex gap-3.5 items-start p-3 rounded-2xl bg-white border border-black/[0.05] shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-chalk-teal/10 flex items-center justify-center flex-shrink-0 text-chalk-teal">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-display font-bold text-ink-green mb-0.5">
                      Live Platform Walkthrough
                    </h3>
                    <p className="text-xs sm:text-sm text-ink-green/65 font-body">
                      See dynamic QR attendance, fee receipts, and test creation in real-time.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3.5 items-start p-3 rounded-2xl bg-white border border-black/[0.05] shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-chalk-teal/10 flex items-center justify-center flex-shrink-0 text-chalk-teal">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-display font-bold text-ink-green mb-0.5">
                      Tailored to Your Needs
                    </h3>
                    <p className="text-xs sm:text-sm text-ink-green/65 font-body">
                      Discuss your batch schedules, fee structure, and teacher allocations.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3.5 items-start p-3 rounded-2xl bg-white border border-black/[0.05] shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-chalk-teal/10 flex items-center justify-center flex-shrink-0 text-chalk-teal">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-display font-bold text-ink-green mb-0.5">
                      Ask Questions, Get Answers
                    </h3>
                    <p className="text-xs sm:text-sm text-ink-green/65 font-body">
                      Direct Q&A with our onboarding specialist with zero pressure.
                    </p>
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="primary" size="lg" href="#demo-form" withArrow>
                  Book a Free Demo
                </Button>
                <a
                  href="#demo-features"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-black/10 bg-white hover:bg-paper hover:border-black/20 text-sm font-bold text-ink-green transition-all shadow-xs"
                >
                  <Play className="w-4 h-4 text-chalk-teal" />
                  <span>Explore Features</span>
                </a>
              </div>
            </div>

            {/* Right Dashboard Mockup */}
            <div className="relative">
              <div className="relative w-full aspect-[4/3] max-w-[700px] mx-auto lg:ml-auto">
                <Image
                  src="/demo-page.png"
                  alt="Campus Dashboard"
                  fill
                  className="object-contain drop-shadow-2xl mix-blend-multiply"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Guarantees Strip (Replaces fake coaching logos) */}
      <section className="border-b border-black/[0.06] bg-white py-8">
        <div className="container-main">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {TRUST_BADGES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-[#F8F9F7] border border-black/[0.05] hover:border-chalk-teal/20 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-chalk-teal/10 flex items-center justify-center text-chalk-teal shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-display font-bold text-ink-green leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-ink-green/60 font-body mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Split Section: Features & Form */}
      <section id="demo-features" className="py-16 md:py-24 bg-[#F8F9F7] border-b border-black/[0.06] scroll-mt-20">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-14">
            {/* Left: Included Features */}
            <div>
              <span className="badge-teal inline-block mb-3">Live Walkthrough Agenda</span>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-ink-green mb-8">
                What&apos;s Included in the Demo?
              </h2>
              <div className="space-y-4">
                {DEMO_FEATURES.map((feature) => (
                  <div
                    key={feature.title}
                    className="flex gap-4 items-start p-4 rounded-2xl bg-white border border-black/[0.05] shadow-xs hover:border-chalk-teal/20 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-chalk-teal/10 flex items-center justify-center flex-shrink-0 text-chalk-teal">
                      <feature.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-display font-bold text-ink-green mb-0.5">
                        {feature.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-ink-green/65 font-body">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Booking Form */}
            <div id="demo-form" className="relative scroll-mt-24">
              <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-card border border-black/[0.07]">
                <h3 className="text-2xl font-display font-bold text-ink-green mb-2">
                  Book Your Free Demo
                </h3>
                <p className="text-sm text-ink-green/60 font-body mb-8">
                  Fill in your details and our expert will connect with you.
                </p>

                <DemoBookingForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner (Clean brand theme, NO external cubes.png) */}
      <section className="bg-white py-16 md:py-24">
        <div className="container-main">
          <div className="bg-gradient-to-br from-ink-green via-[#23352C] to-chalk-teal rounded-3xl p-8 sm:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl border border-white/10 text-white">
            {/* Subtle glow orb */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-chalk-teal/30 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-6 z-10 w-full md:w-auto">
              {/* Avatar Illustration */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden flex-shrink-0 bg-chalk-teal/30 border-2 border-emerald-400/30 hidden sm:block relative shadow-xl">
                <Image
                  src="/support_avatar.png"
                  alt="Campus Support Expert"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2">
                  Still have questions?
                </h2>
                <p className="text-sm sm:text-base text-white/80 font-body max-w-sm leading-relaxed">
                  Talk to our onboarding specialists and find the perfect workflow for your coaching institute.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 z-10 w-full md:w-auto">
              <a
                href="tel:+918080161421"
                className="group flex items-center gap-3 px-6 py-4 bg-brass-gold rounded-2xl text-ink-green hover:bg-brass-gold/90 transition-all duration-300 shadow-md hover:-translate-y-1 w-full sm:w-auto justify-center font-bold"
              >
                <div className="p-2 bg-ink-green/10 rounded-lg group-hover:scale-110 transition-transform">
                  <Phone className="w-5 h-5 text-ink-green" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[11px] text-ink-green/70 font-body uppercase tracking-wider font-semibold">Instant Helpline</span>
                  <span className="text-sm font-bold font-body">+91 80801 61421</span>
                </div>
              </a>
              <a
                href="mailto:support@campusweb.co.in"
                className="group flex items-center gap-3 px-6 py-4 bg-white/10 border border-white/20 rounded-2xl text-white hover:bg-white/20 transition-all duration-300 backdrop-blur-sm shadow-lg hover:-translate-y-1 w-full sm:w-auto justify-center"
              >
                <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                  <Mail className="w-5 h-5 text-brass-gold" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[11px] text-white/70 font-body uppercase tracking-wider">Direct Email</span>
                  <span className="text-sm font-semibold font-body">support@campusweb.co.in</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

import React from "react";
import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Smartphone,
  ShieldCheck,
  Zap,
  MessageSquare,
  CheckCircle2,
  Lock,
  Headphones,
  ArrowRight,
  Sparkles,
  RefreshCw,
  QrCode,
  FileCheck,
  Building2,
} from "lucide-react";
import Button from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "About Us — CampusWeb",
  description:
    "Learn about CampusWeb's mission: building the next-generation, mobile-first operating system for Indian coaching institutes.",
};

const PILLARS = [
  {
    icon: Smartphone,
    title: "100% Mobile Native",
    subtitle: "Built for Smartphones",
    description: "Manage classes, attendance, and tests directly from your phone — zero computers needed.",
  },
  {
    icon: ShieldCheck,
    title: "Bank-Grade Privacy",
    subtitle: "Your Data Stays Yours",
    description: "We never sell, share, or advertise to your students. Your database is strictly encrypted.",
  },
  {
    icon: Zap,
    title: "Zero Commission",
    subtitle: "Direct to Your Bank",
    description: "100% of student fee payments go straight to your bank account with no middleman cuts.",
  },
];

const PROBLEMS_SOLVED = [
  {
    icon: QrCode,
    title: "The Register Nightmare",
    problem: "Calling roll numbers for 15 minutes per lecture and manually compiling monthly registers.",
    solution: "Dynamic QR codes and 1-tap batch rosters log 50 students in 5 seconds with automated absent WhatsApp alerts.",
  },
  {
    icon: MessageSquare,
    title: "Awkward Fee Follow-Ups",
    problem: "Calling parents repeatedly for dues or writing paper receipts by hand that often get lost.",
    solution: "Parents receive automated, official PDF receipts and gentle due reminders directly on WhatsApp.",
  },
  {
    icon: Smartphone,
    title: "The 'Desktop-Only' Trap",
    problem: "Traditional software requires expensive desktop computers at reception and weeks of staff training.",
    solution: "CampusWeb runs natively on Android phones — intuitive, fast, and as easy to use as WhatsApp.",
  },
  {
    icon: FileCheck,
    title: "Hours Spent Checking Tests",
    problem: "Printing paper test question sheets and spending hours checking MCQ answers by hand.",
    solution: "Teachers schedule tests in 30 seconds; submissions are auto-graded with instant scorecards and ranks.",
  },
];

const COMMITMENTS = [
  {
    icon: Headphones,
    title: "Direct Technical Support",
    badge: "No Bot Loops",
    badgeColor: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    description:
      "When you need help, you connect directly with our engineering and support specialists on WhatsApp, not an automated chatbot.",
  },
  {
    icon: RefreshCw,
    title: "Free 24-Hour Guided Setup",
    badge: "Zero Friction",
    badgeColor: "bg-chalk-teal/10 text-chalk-teal border-chalk-teal/20",
    description:
      "Send us your student list or register photo — our technical team imports your data, configures your batches, and gets you live in 24 hours.",
  },
  {
    icon: Sparkles,
    title: "Continuous Weekly Evolution",
    badge: "Active Devs",
    badgeColor: "bg-brass-gold/15 text-brass-gold border-brass-gold/30",
    description:
      "We build in close collaboration with coaching directors. Feedback from our partner institutes directly shapes our weekly feature updates.",
  },
  {
    icon: Lock,
    title: "Transparent & Fair Pricing",
    badge: "100% Honest",
    badgeColor: "bg-chalk-teal/10 text-chalk-teal border-chalk-teal/20",
    description:
      "Flat, straightforward pricing. No hidden setup charges, no surprise renewal fees, and zero percentage commissions on student fees.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F8F9F7] overflow-hidden">
      {/* Hero Section */}
      <section className="pt-6 pb-14 md:pt-10 md:pb-20 min-h-[calc(100vh-140px)] flex flex-col justify-center">
        <div className="container-main flex-grow flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left Content */}
            <div className="max-w-xl">
              <div className="mb-6">
                <span className="badge-gold inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brass-gold" />
                  Our Purpose & Mission
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-display font-bold text-ink-green leading-[1.1] mb-3">
                Built for Indian Coaching,
              </h1>
              <h2 className="text-4xl sm:text-5xl lg:text-[52px] font-display font-bold text-gradient-gold leading-[1.1] mb-6">
                Crafted for Speed.
              </h2>
              <p className="text-base sm:text-lg text-ink-green/75 font-body leading-relaxed mb-8 max-w-lg">
                We founded CampusWeb with a clear mission: Indian coaching centres deserve a modern, lightweight, mobile-first operating system. No bulky computers, no 15% commissions, and no complicated staff training.
              </p>

              {/* Pillars Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-black/10">
                {PILLARS.map((pillar, i) => {
                  const Icon = pillar.icon;
                  return (
                    <div key={i} className="flex flex-col">
                      <div className="w-10 h-10 rounded-xl bg-chalk-teal/10 text-chalk-teal flex items-center justify-center mb-3">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-display font-bold text-ink-green text-sm">
                        {pillar.title}
                      </span>
                      <span className="font-body text-ink-green/60 text-xs mt-0.5">
                        {pillar.description}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Graphic Card: Operations Transformation Blueprint */}
            <div className="relative">
              {/* Subtle ambient brand glow */}
              <div className="absolute -top-10 -right-10 w-72 h-72 bg-chalk-teal/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-brass-gold/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-black/8 bg-white p-6 sm:p-7 flex flex-col justify-between">
                {/* Card Header: Live Operating Standard */}
                <div className="flex items-center justify-between pb-5 border-b border-black/5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-ink-green to-chalk-teal text-white flex items-center justify-center font-display font-bold text-base shadow-sm">
                      CW
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-ink-green text-base">
                          The Coaching Operating Standard
                        </h3>
                      </div>
                      <p className="text-xs text-ink-green/60 font-body">
                        Daily Operational Transformation for Indian Institutes
                      </p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    100% Mobile
                  </span>
                </div>

                {/* Transformation Rows (Old Reality vs With CampusWeb) */}
                <div className="py-5 space-y-3">
                  {/* Item 1: Attendance */}
                  <div className="p-3.5 rounded-2xl bg-[#F8F9F7] border border-black/[0.04] hover:border-chalk-teal/20 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-chalk-teal font-display flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5" />
                        Lecture Attendance
                      </span>
                      <span className="text-[11px] font-semibold text-ink-green/45 line-through">
                        15 mins per lecture
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-semibold text-ink-green">
                        5-Second Dynamic QR Scan
                      </p>
                      <span className="text-[11px] text-chalk-teal font-medium shrink-0">
                        Auto WhatsApp absent alert to parents
                      </span>
                    </div>
                  </div>

                  {/* Item 2: Fee Collections */}
                  <div className="p-3.5 rounded-2xl bg-[#F8F9F7] border border-black/[0.04] hover:border-chalk-teal/20 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-brass-gold font-display flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" />
                        Fee Management
                      </span>
                      <span className="text-[11px] font-semibold text-ink-green/45 line-through">
                        Lost paper slips & calls
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-semibold text-ink-green">
                        Instant UPI & WhatsApp Receipts
                      </p>
                      <span className="text-[11px] text-emerald-700 font-semibold shrink-0">
                        0% Commission (Direct to bank)
                      </span>
                    </div>
                  </div>

                  {/* Item 3: Hardware & Daily Operations */}
                  <div className="p-3.5 rounded-2xl bg-[#F8F9F7] border border-black/[0.04] hover:border-chalk-teal/20 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-green font-display flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5" />
                        Institute Operations
                      </span>
                      <span className="text-[11px] font-semibold text-ink-green/45 line-through">
                        Bulky reception PC needed
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-semibold text-ink-green">
                        100% Native Smartphone App
                      </p>
                      <span className="text-[11px] text-ink-green/70 font-medium shrink-0">
                        Manage batches & tests anywhere
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Guarantees Strip */}
                <div className="pt-4 border-t border-black/5 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-chalk-teal/5 border border-chalk-teal/10">
                    <div className="text-[11px] font-bold text-ink-green font-display">100% Private</div>
                    <div className="text-[10px] text-ink-green/60 font-body">Encrypted Data</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-brass-gold/10 border border-brass-gold/15">
                    <div className="text-[11px] font-bold text-ink-green font-display">24-Hr Migration</div>
                    <div className="text-[10px] text-ink-green/60 font-body">Free Guided Setup</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/15">
                    <div className="text-[11px] font-bold text-ink-green font-display">Zero Cut</div>
                    <div className="text-[10px] text-ink-green/60 font-body">Direct Settlement</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why We Built CampusWeb: Problems We Solve */}
      <section className="py-20 bg-white">
        <div className="container-main">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="badge-teal inline-flex items-center gap-1.5 mb-3">
              <Zap className="w-3.5 h-3.5 text-chalk-teal" />
              Real Problems, Real Solutions
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-ink-green">
              Why We Built CampusWeb
            </h2>
            <p className="text-base text-ink-green/70 font-body mt-3">
              We observed the daily friction coaching institutes face while managing hundreds of students using outdated methods. Here is how we fixed it:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {PROBLEMS_SOLVED.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="bg-[#F8F9F7] rounded-2xl p-6 sm:p-7 border border-black/5 flex flex-col justify-between hover:shadow-lg hover:border-chalk-teal/30 transition-all duration-300"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-chalk-teal/10 text-chalk-teal flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-display font-bold text-ink-green mb-3">
                      {item.title}
                    </h3>
                    <div className="mb-4 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 text-xs text-rose-900/80 font-body">
                      <span className="font-bold text-rose-700">The Problem: </span>
                      {item.problem}
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-xs text-emerald-950 font-body">
                      <span className="font-bold text-emerald-700">Our Solution: </span>
                      {item.solution}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Our 4 Core Commitments */}
      <section className="py-20 bg-[#F8F9F7] border-t border-black/[0.05]">
        <div className="container-main">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="badge-gold inline-flex items-center gap-1.5 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-brass-gold" />
              Our Promise
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-ink-green">
              Our Commitments to Every Coaching Partner
            </h2>
            <p className="text-base text-ink-green/70 font-body mt-3">
              We don&apos;t just sell software. We partner with coaching institutes to ensure everyday operations run smoothly.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {COMMITMENTS.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-chalk-teal/10 text-chalk-teal flex items-center justify-center">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <h3 className="text-base font-display font-bold text-ink-green mb-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-ink-green/70 font-body leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container-main">
          <div className="bg-gradient-to-r from-ink-green to-chalk-teal rounded-3xl p-8 sm:p-12 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl text-white">
            <div className="max-w-xl">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-brass-gold border border-white/20 inline-block mb-3">
                Early Adopter Launch Program
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold mb-3">
                Experience CampusWeb in Your Institute
              </h2>
              <p className="text-sm sm:text-base text-white/80 font-body">
                Get a personalized 1-on-1 walkthrough tailored to your batches, subjects, and fee schedule. Zero setup charges.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full lg:w-auto shrink-0">
              <Button
                variant="primary"
                size="lg"
                href="/demo"
                className="w-full sm:w-auto justify-center"
              >
                Book a Free Demo <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Link
                href="/contact"
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors w-full sm:w-auto"
              >
                <span>Talk to Technical Team</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  IndianRupee,
  Video,
  FileText,
  BookOpen,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Check,
} from "lucide-react";
import { cn } from "@/utils/cn";

type FeatureCategory = "all" | "finance" | "attendance" | "academics" | "app";

interface DetailedFeatureItem {
  id: string;
  category: "finance" | "attendance" | "academics" | "app";
  icon: React.ElementType;
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  capabilities: string[];
  impactMetric: string;
}

const ALL_FEATURES: DetailedFeatureItem[] = [
  {
    id: "fees-due",
    category: "finance",
    icon: IndianRupee,
    title: "Live Fee Tracking & Pending Dues",
    badge: "Zero Leakage",
    badgeColor: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    description:
      "Get complete visibility into total collections, partial balances, and overdue fees across all batches without manual registers.",
    capabilities: [
      "Real-time due balance calculation per student",
      "Partial payment tracking with receipt history",
      "1-Click batch-wide fee payment reports",
    ],
    impactMetric: "Saves 4+ hours of weekly accounting",
  },
  {
    id: "whatsapp-receipts",
    category: "finance",
    icon: MessageCircle,
    title: "Automated WhatsApp Fee Receipts",
    badge: "Instant Delivery",
    badgeColor: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    description:
      "Whenever a fee payment is recorded, parents receive an automated, official receipt with a secure download link directly on WhatsApp.",
    capabilities: [
      "Official downloadable PDF receipt links",
      "Customizable institute branding on receipts",
      "Automated WhatsApp due reminders before due dates",
    ],
    impactMetric: "Cuts fee payment delays by up to 60%",
  },
  {
    id: "zero-commission",
    category: "finance",
    icon: Zap,
    title: "0% Commission Online Payments",
    badge: "Direct to Bank",
    badgeColor: "bg-brass-gold/15 text-brass-gold border-brass-gold/30",
    description:
      "Accept payments directly via UPI, NetBanking, and credit/debit cards straight into your institute's bank account with zero middleman cuts.",
    capabilities: [
      "Direct integration with institute Razorpay / UPI",
      "Instant settlement with zero platform cuts",
      "Automated invoice and transaction ID stamping",
    ],
    impactMetric: "100% of your student fees stay yours",
  },
  {
    id: "qr-attendance",
    category: "attendance",
    icon: QrCode,
    title: "Dynamic Anti-Proxy QR Attendance",
    badge: "5-Sec Scan",
    badgeColor: "bg-chalk-teal/10 text-chalk-teal border-chalk-teal/20",
    description:
      "Teachers generate an auto-refreshing QR session on their phone. Students scan using their app, recording attendance within seconds.",
    capabilities: [
      "Time-restricted dynamic QR code sessions",
      "Prevents student proxy & offsite scanning",
      "Instant attendance status synced to database",
    ],
    impactMetric: "Logs 50 students in under 10 seconds",
  },
  {
    id: "batch-attendance",
    category: "attendance",
    icon: ClipboardCheck,
    title: "1-Tap Batch Roster Attendance",
    badge: "Absent SMS / WA",
    badgeColor: "bg-chalk-teal/10 text-chalk-teal border-chalk-teal/20",
    description:
      "For quick manual roll calls, teachers can mark students present, absent, or late in 1 tap, automatically triggering parent notifications.",
    capabilities: [
      "Batch-wise student roster with quick toggles",
      "Automated absent notifications sent to parents",
      "Monthly student attendance rate calculation",
    ],
    impactMetric: "Eliminates attendance paper registers",
  },
  {
    id: "google-meet",
    category: "attendance",
    icon: Video,
    title: "Integrated Google Meet Live Classes",
    badge: "1-Tap Launch",
    badgeColor: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    description:
      "Teachers schedule and launch Google Meet live classes directly from the app without sharing raw links that could get leaked.",
    capabilities: [
      "One-click Google Meet lecture launch",
      "Automated push notifications 10 mins before class",
      "Live status tag visible in student app",
    ],
    impactMetric: "Zero unverified attendees or link leaks",
  },
  {
    id: "online-tests",
    category: "academics",
    icon: FileText,
    title: "30-Second Online Test Creator",
    badge: "Live / Upcoming",
    badgeColor: "bg-brass-gold/15 text-brass-gold border-brass-gold/30",
    description:
      "Teachers create tests strictly for their assigned batch subjects. Compact unified time pickers default deadlines to start + 30 mins.",
    capabilities: [
      "Subject-restricted teacher test creation",
      "Live Now, Upcoming, and Completed status badges",
      "Online MCQ tests or offline score entry",
    ],
    impactMetric: "Create quizzes in under 30 seconds",
  },
  {
    id: "auto-grading",
    category: "academics",
    icon: Sparkles,
    title: "Automated Grading & Scorecards",
    badge: "Instant Results",
    badgeColor: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    description:
      "Online tests evaluate student submissions instantly upon completion, calculating percentage scores, negative marking, and rank lists.",
    capabilities: [
      "Instant answer key reveal with explanations",
      "Negative marking calculation support",
      "Subject-wise performance breakdowns",
    ],
    impactMetric: "Zero manual paper checking required",
  },
  {
    id: "whatsapp-doubts",
    category: "academics",
    icon: MessageCircle,
    title: "Assigned Subject Doubt Routing",
    badge: "Private & Safe",
    badgeColor: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    description:
      "Students select their batch teacher from a clean dropdown and route doubts directly on WhatsApp with topic pre-filled, without group spam.",
    capabilities: [
      "Dynamic dropdown of teachers assigned to student batch",
      "Pre-filled chapter & student details in WhatsApp",
      "Teacher's private phone number stays hidden",
    ],
    impactMetric: "3x faster doubt resolution for students",
  },
  {
    id: "video-library",
    category: "app",
    icon: BookOpen,
    title: "Organized Chapter Video Library",
    badge: "Revision Hub",
    badgeColor: "bg-chalk-teal/10 text-chalk-teal border-chalk-teal/20",
    description:
      "Upload and categorize recorded lectures by subject and chapter so absent or revising students can review lessons anytime on mobile.",
    capabilities: [
      "Structured subject and chapter organization",
      "Secure student-only playback streaming",
      "Tracks student video watch progress",
    ],
    impactMetric: "Helps absent students catch up quickly",
  },
  {
    id: "student-app",
    category: "app",
    icon: Smartphone,
    title: "Dedicated Android Mobile App",
    badge: "Native Flutter",
    badgeColor: "bg-chalk-teal/10 text-chalk-teal border-chalk-teal/20",
    description:
      "A fast, distraction-free native Android app for students and parents to check schedules, take tests, review scores, and download fee receipts.",
    capabilities: [
      "Clean, modern UI designed for high engagement",
      "Real-time push notifications for classes & tests",
      "Lightweight build that runs smoothly on all devices",
    ],
    impactMetric: "Rated 4.8+ by students for simplicity",
  },
  {
    id: "excel-import",
    category: "finance",
    icon: Users,
    title: "1-Click Bulk Excel Student Importer",
    badge: "Fast Setup",
    badgeColor: "bg-brass-gold/15 text-brass-gold border-brass-gold/30",
    description:
      "Import your entire institute roster from an existing Excel sheet in seconds. Automatically maps roll numbers, parent phone numbers, and batches.",
    capabilities: [
      "Pre-formatted sample template download",
      "Automatic duplicate detection & validation",
      "Instant batch assignment upon upload",
    ],
    impactMetric: "Migrate 500+ students in 1 minute",
  },
];

const CATEGORIES = [
  { key: "all", label: "All Features" },
  { key: "finance", label: "Fees & Finance" },
  { key: "attendance", label: "Attendance & Classes" },
  { key: "academics", label: "Tests & Doubts" },
  { key: "app", label: "Student App" },
] as const;

export default function DetailedFeaturesGrid() {
  const [activeCategory, setActiveCategory] = useState<FeatureCategory>("all");

  const filteredFeatures =
    activeCategory === "all"
      ? ALL_FEATURES
      : ALL_FEATURES.filter((f) => f.category === activeCategory);

  return (
    <section className="bg-gradient-to-b from-white to-[#F4F6F3] pt-6 pb-16 md:pt-10 md:pb-24">
      <div className="container-main">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-14">
          <span className="badge-gold inline-flex items-center gap-1.5 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-brass-gold" />
            Complete Operating Suite
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-ink-green leading-tight">
            Every Feature Built for
            <br />
            <span className="text-gradient-gold">Real Coaching Workflows.</span>
          </h1>
          <p className="mt-4 text-base text-ink-green/70 font-body max-w-xl mx-auto">
            From 1-tap QR attendance to instant WhatsApp fee receipts and auto-graded online tests — explore how CampusWeb powers your daily operations.
          </p>

          {/* Category Filter Chips */}
          <div className="w-full mt-8 overflow-x-auto overscroll-x-contain touch-pan-x scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-4 sm:px-0 py-1">
            <div className="flex sm:flex-wrap items-center justify-start sm:justify-center w-max sm:w-auto mx-auto gap-2">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={(e) => {
                      setActiveCategory(cat.key);
                      (e.currentTarget as HTMLElement).scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                        inline: "center",
                      });
                    }}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 border shrink-0",
                      isActive
                        ? "bg-chalk-teal text-white border-chalk-teal shadow-md"
                        : "bg-white text-ink-green/70 border-black/5 hover:text-ink-green hover:border-black/15 shadow-sm"
                    )}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Features Grid with Clean Immediate Fade-Up */}
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
            {filteredFeatures.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-xl transition-all duration-300 border border-black/[0.06] flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Row */}
                    <div className="flex items-center justify-between gap-3 mb-5">
                      <div className="w-12 h-12 rounded-xl bg-chalk-teal/10 flex items-center justify-center text-chalk-teal group-hover:scale-110 transition-transform duration-300 shadow-sm">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[11px] font-bold border tracking-wide",
                          item.badgeColor
                        )}
                      >
                        {item.badge}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-lg font-display font-bold text-ink-green mb-2.5 group-hover:text-chalk-teal transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-ink-green/70 font-body leading-relaxed mb-6">
                      {item.description}
                    </p>

                    {/* Capabilities Checkpoints */}
                    <div className="bg-paper rounded-xl p-4 mb-6 border border-black/5">
                      <ul className="space-y-2">
                        {item.capabilities.map((cap, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2.5 text-xs sm:text-[13px] text-ink-green/80 font-medium font-body"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <span>{cap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Bottom Footer Row */}
                  <div className="pt-4 border-t border-paper flex items-center justify-between gap-3 mt-auto">
                    <span className="text-[11px] font-semibold text-brass-gold font-body">
                      {item.impactMetric}
                    </span>
                    <Link
                      href="/demo"
                      className="inline-flex items-center gap-1 text-xs font-bold text-chalk-teal hover:text-brass-gold transition-colors"
                    >
                      <span>See in Demo</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </motion.div>

        {/* Feature Guarantee Strip */}
        <div className="mt-14 p-6 sm:p-8 rounded-2xl bg-white border border-black/5 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-chalk-teal/10 text-chalk-teal flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-display font-bold text-ink-green">
                Need a specific workflow for your institute?
              </h4>
              <p className="text-sm text-ink-green/70 font-body mt-0.5">
                We configure batches, subjects, fee structures, and attendance rules to match your exact coaching routine.
              </p>
            </div>
          </div>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-chalk-teal text-white text-sm font-bold shadow-md hover:bg-ink-green transition-colors shrink-0"
          >
            <span>Book a Personalized Walkthrough</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

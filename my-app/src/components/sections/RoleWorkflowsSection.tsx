"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  GraduationCap,
  Users,
  IndianRupee,
  QrCode,
  FileCheck,
  MessageSquare,
  Smartphone,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/utils/cn";

type RoleKey = "admin" | "teacher" | "student";

interface WorkflowCard {
  icon: React.ElementType;
  badge: string;
  badgeColor: string;
  title: string;
  description: string;
  points: string[];
}

const ROLE_DATA: Record<
  RoleKey,
  {
    title: string;
    subtitle: string;
    cards: WorkflowCard[];
  }
> = {
  admin: {
    title: "Complete Control for Coaching Directors",
    subtitle:
      "Monitor fee collections, track student enrollment, and organize teachers across batches without opening a spreadsheet.",
    cards: [
      {
        icon: IndianRupee,
        badge: "Zero Leakage",
        badgeColor: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
        title: "Live Fee Tracking & Instant Receipts",
        description:
          "Track paid, partial, and pending student fees with 1-click WhatsApp payment reminders. 100% of collections go directly to your bank account.",
        points: [
          "Zero commission on fee collections",
          "Automated GST & non-GST PDF receipts",
          "Exportable financial accounting reports",
        ],
      },
      {
        icon: Building2,
        badge: "Smart Scheduling",
        badgeColor: "bg-chalk-teal/10 text-chalk-teal border-chalk-teal/20",
        title: "Batches, Subjects & Teacher Allocation",
        description:
          "Assign teachers only to their designated subjects per batch. Prevent scheduling conflicts and manage multiple branches effortlessly.",
        points: [
          "Restricted subject-teacher mapping",
          "Real-time timetable synchronization",
          "Multi-branch & hybrid batch support",
        ],
      },
      {
        icon: Users,
        badge: "1-Click Setup",
        badgeColor: "bg-brass-gold/15 text-brass-gold border-brass-gold/30",
        title: "Bulk Student Import & Roll Numbers",
        description:
          "Migrate your entire student database from Excel in less than 60 seconds with roll numbers, parent contact info, and assigned batches.",
        points: [
          "One-click Excel / CSV import",
          "Student suspension & status toggle",
          "Centralized student academic profile",
        ],
      },
    ],
  },
  teacher: {
    title: "Save 2+ Hours Daily for Teachers",
    subtitle:
      "No more manual register marking or paper test grading. Teachers manage everything right from their mobile phone in the classroom.",
    cards: [
      {
        icon: QrCode,
        badge: "5-Second Attendance",
        badgeColor: "bg-chalk-teal/10 text-chalk-teal border-chalk-teal/20",
        title: "Dynamic QR & 1-Tap Attendance",
        description:
          "Display a dynamic QR code on the teacher's phone for students to scan, or mark the entire batch in 1 tap with absent SMS alerts.",
        points: [
          "Anti-proxy dynamic QR code session",
          "Batch-wise student attendance rosters",
          "Instant automated parent alerts",
        ],
      },
      {
        icon: FileCheck,
        badge: "Auto-Scoring",
        badgeColor: "bg-brass-gold/15 text-brass-gold border-brass-gold/30",
        title: "30-Second Online Test Creator",
        description:
          "Teachers create tests strictly for their assigned subjects. Set start & deadline with smart 30-min auto sync and instant automated scorecards.",
        points: [
          "Live Now / Upcoming / Completed status tags",
          "Auto-prefills assigned batch subjects",
          "Instant MCQ grading & rank leaderboard",
        ],
      },
      {
        icon: MessageSquare,
        badge: "Direct Routing",
        badgeColor: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
        title: "WhatsApp Doubt Clearing Channel",
        description:
          "Students route doubts directly to the relevant subject teacher on WhatsApp without revealing personal phone numbers or spamming groups.",
        points: [
          "Student doubts routed by assigned subject",
          "Supports photo & voice note questions",
          "Personalized 1-on-1 student guidance",
        ],
      },
    ],
  },
  student: {
    title: "Transparency & Engagement for Students & Parents",
    subtitle:
      "A dedicated Android mobile app where students attend classes, solve tests, and parents view fee receipts and attendance reports.",
    cards: [
      {
        icon: Smartphone,
        badge: "Student App",
        badgeColor: "bg-chalk-teal/10 text-chalk-teal border-chalk-teal/20",
        title: "Dedicated Android Learning App",
        description:
          "Students access upcoming tests, Google Meet live class links, organized recorded video lectures, and performance analytics.",
        points: [
          "1-Tap Google Meet live class launch",
          "Chapter-wise recorded video revisions",
          "Live test attempt & review portal",
        ],
      },
      {
        icon: MessageSquare,
        badge: "Parent Peace of Mind",
        badgeColor: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
        title: "Instant WhatsApp Fee Receipts & Notices",
        description:
          "Parents receive official digital fee receipts, attendance alerts, and exam report cards directly on their WhatsApp without installing extra apps.",
        points: [
          "Downloadable PDF fee receipts on WhatsApp",
          "Immediate absent alert notifications",
          "Online UPI fee payment links",
        ],
      },
      {
        icon: TrendingUp,
        badge: "Progress Analytics",
        badgeColor: "bg-brass-gold/15 text-brass-gold border-brass-gold/30",
        title: "Subject-Wise Score Breakdown",
        description:
          "Visual performance analytics allow students and parents to spot weak chapters, review answer keys, and track improvement over time.",
        points: [
          "Subject-wise marks & percentage charts",
          "Class rank & percentile insights",
          "Historical attendance calendar",
        ],
      },
    ],
  },
};

export default function RoleWorkflowsSection() {
  const [activeRole, setActiveRole] = useState<RoleKey>("admin");
  const data = ROLE_DATA[activeRole];

  return (
    <section id="workflows" className="py-16 md:py-24 bg-paper scroll-mt-20">
      <div className="container-main">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <span className="badge-gold inline-flex items-center gap-1.5 mb-3 px-3.5 py-1 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-brass-gold" />
            Designed For Everyday Coaching Operations
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-display font-extrabold text-ink-green tracking-tight leading-tight mt-2">
            Built for Everyone in Your Institute.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-ink-green/75 font-body leading-relaxed max-w-2xl mx-auto">
            Empower directors, simplify teachers&apos; routines, and keep parents confident with a modern, mobile-first ecosystem.
          </p>

          {/* Interactive Role Switcher */}
          <div className="w-full mt-8 overflow-x-auto overscroll-x-contain touch-pan-x scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-4 sm:px-0 flex sm:justify-center">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 p-1.5 bg-white rounded-2xl shadow-sm border border-black/[0.06] shrink-0">
              {(
                [
                  { key: "admin", label: "Directors & Admins", icon: Building2 },
                  { key: "teacher", label: "Teachers & Staff", icon: GraduationCap },
                  { key: "student", label: "Students & Parents", icon: Users },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeRole === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={(e) => {
                      setActiveRole(tab.key);
                      (e.currentTarget as HTMLElement).scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                        inline: "center",
                      });
                    }}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3.5 sm:px-6 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 shrink-0",
                      isActive
                        ? "bg-chalk-teal text-white shadow-md scale-[1.01]"
                        : "text-ink-green/70 hover:text-ink-green hover:bg-[#F8F9F7]"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic Role Content */}
        <motion.div
          key={activeRole}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
            <div className="text-center mb-10">
              <h3 className="text-2xl sm:text-3xl font-display font-bold text-ink-green tracking-tight">
                {data.title}
              </h3>
              <p className="text-sm sm:text-base text-ink-green/75 font-body max-w-2xl mx-auto mt-2 leading-relaxed">
                {data.subtitle}
              </p>
            </div>

            {/* 3 Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {data.cards.map((card, idx) => {
                const CardIcon = card.icon;
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-black/[0.06] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-5">
                        <div className="w-12 h-12 rounded-xl bg-chalk-teal/10 flex items-center justify-center text-chalk-teal">
                          <CardIcon className="w-6 h-6" />
                        </div>
                        <span
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold border tracking-wide",
                            card.badgeColor
                          )}
                        >
                          {card.badge}
                        </span>
                      </div>

                      <h4 className="text-lg sm:text-xl font-display font-bold text-ink-green tracking-tight mb-2.5">
                        {card.title}
                      </h4>
                      <p className="text-sm text-ink-green/75 font-body leading-relaxed mb-6">
                        {card.description}
                      </p>
                    </div>

                    <div className="pt-5 border-t border-black/[0.06]">
                      <ul className="space-y-2.5">
                        {card.points.map((pt, pIdx) => (
                          <li
                            key={pIdx}
                            className="flex items-start gap-2 text-xs sm:text-sm text-ink-green/80 font-medium font-body"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
      </div>
    </section>
  );
}

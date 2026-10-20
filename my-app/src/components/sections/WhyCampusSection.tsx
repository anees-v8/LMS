"use client";

import React from "react";
import { Check, X, Sparkles, Smartphone, Shield, Zap } from "lucide-react";
import { cn } from "@/utils/cn";
import Button from "@/components/ui/Button";

interface ComparisonRow {
  criteria: string;
  penPaper: string;
  legacyErp: string;
  campusWeb: string;
}

const COMPARISON_DATA: ComparisonRow[] = [
  {
    criteria: "Device Requirement",
    penPaper: "Paper registers & manual books",
    legacyErp: "Requires desktop/laptop at reception",
    campusWeb: "100% runs natively on your smartphone",
  },
  {
    criteria: "Parent Communication",
    penPaper: "Manual phone calls (time consuming)",
    legacyErp: "Unreliable SMS gateway with extra charges",
    campusWeb: "Automated WhatsApp receipts & notices",
  },
  {
    criteria: "Attendance Tracking",
    penPaper: "Roll call takes 15 mins per lecture",
    legacyErp: "Biometric machine (hardware breakdowns)",
    campusWeb: "Dynamic QR scan or 1-tap in 5 seconds",
  },
  {
    criteria: "Fee Commission",
    penPaper: "High cash leakages & unrecorded receipts",
    legacyErp: "Takes 2% - 15% cut on fee transactions",
    campusWeb: "0% commission — straight to your bank",
  },
  {
    criteria: "Setup & Learning Curve",
    penPaper: "Zero tech, but massive human error",
    legacyErp: "Requires 1-2 weeks of staff training",
    campusWeb: "Go live in 15 minutes (as easy as WhatsApp)",
  },
  {
    criteria: "Online Tests & Quizzes",
    penPaper: "Printing costs & hours of manual checking",
    legacyErp: "Complex desktop exam creator",
    campusWeb: "30-second mobile test creator & auto grading",
  },
];

export default function WhyCampusSection() {
  return (
    <section className="py-16 md:py-24 bg-paper border-t border-black/[0.06]">
      <div className="container-main">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <span className="badge-teal inline-flex items-center gap-1.5 mb-3 px-3.5 py-1 text-xs font-semibold tracking-wide">
            <Zap className="w-3.5 h-3.5 text-chalk-teal" />
            Clear Advantage
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-display font-extrabold text-ink-green tracking-tight leading-tight mt-2">
            Why Indian Coaching Institutes Switch to CampusWeb.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-ink-green/75 font-body leading-relaxed max-w-2xl mx-auto">
            Stop losing hours on registers or dealing with bulky, expensive desktop ERP software.
          </p>
        </div>

        {/* Comparison Table / Grid */}
        <div className="overflow-x-auto pb-4">
          <div className="min-w-[720px] bg-white rounded-2xl p-6 sm:p-8 border border-black/[0.06] shadow-sm">
            {/* Header row */}
            <div className="grid grid-cols-4 gap-4 pb-4 border-b border-black/10 text-xs sm:text-sm font-display font-bold">
              <div className="text-ink-green/60 uppercase tracking-wider">Feature / Workflow</div>
              <div className="text-ink-green/60 text-center">Pen, Paper & Registers</div>
              <div className="text-ink-green/60 text-center">Legacy Desktop ERPs</div>
              <div className="text-chalk-teal text-center flex items-center justify-center gap-1.5 bg-chalk-teal/10 py-1.5 rounded-lg border border-chalk-teal/20">
                <Sparkles className="w-3.5 h-3.5 text-brass-gold" />
                <span>CampusWeb</span>
              </div>
            </div>

            {/* Data rows */}
            <div className="divide-y divide-black/5">
              {COMPARISON_DATA.map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-4 gap-4 py-4 text-xs sm:text-sm items-center hover:bg-paper/50 px-2 rounded-xl transition-colors"
                >
                  <div className="font-bold text-ink-green font-display tracking-tight">{row.criteria}</div>
                  <div className="text-center text-ink-green/70 flex items-center justify-center gap-1.5 font-body">
                    <X className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                    <span>{row.penPaper}</span>
                  </div>
                  <div className="text-center text-ink-green/70 flex items-center justify-center gap-1.5 font-body">
                    <X className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>{row.legacyErp}</span>
                  </div>
                  <div className="text-center font-semibold text-emerald-900 bg-emerald-500/10 py-2 px-2.5 rounded-xl border border-emerald-500/20 flex items-center justify-center gap-1.5 font-body">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{row.campusWeb}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Guarantee Banner */}
        <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-ink-green via-[#23352C] to-chalk-teal text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl border border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/15">
              <Shield className="w-6 h-6 text-brass-gold" />
            </div>
            <div>
              <h4 className="text-lg sm:text-xl font-display font-bold text-white tracking-tight">
                100% Free Guided Setup & Data Migration
              </h4>
              <p className="text-xs sm:text-sm text-white/80 font-body mt-1 max-w-xl">
                Send us your student Excel or register photo — our technical team sets up your batches within 24 hours.
              </p>
            </div>
          </div>
          <Button variant="secondary" size="md" href="/demo" className="shrink-0 bg-white text-ink-green border-white hover:bg-paper font-semibold shadow-md">
            Schedule Free Onboarding
          </Button>
        </div>
      </div>
    </section>
  );
}

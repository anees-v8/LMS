"use client";

import React from "react";
import { motion } from "framer-motion";
import { Clock, Users, Zap, LayoutDashboard, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import { HOW_IT_WORKS_STEPS } from "@/utils/constants";

const stepIcons = [Clock, Zap, Users, LayoutDashboard];

function StepMiniPreview({ step }: { step: number }) {
  if (step === 1) {
    return (
      <div className="w-full rounded-xl p-3.5 my-4 bg-[#F8F9F7] border border-black/[0.05] group-hover:border-chalk-teal/15 transition-colors">
        <div className="flex items-center justify-between text-[11px] font-bold text-ink-green/70 mb-2 font-body">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            1-on-1 Walkthrough
          </span>
          <span className="text-brass-gold font-semibold">30 Mins</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-1 rounded-lg bg-chalk-teal text-white text-xs font-semibold shadow-xs">
            11:30 AM
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-black/10 text-ink-green/70 text-xs font-medium">
            03:30 PM
          </span>
          <span className="text-[10px] text-ink-green/50 ml-auto font-medium">Google Meet</span>
        </div>
        <p className="text-[10px] text-ink-green/50 font-body">
          Screen-share directly with onboarding specialist
        </p>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="w-full rounded-xl p-3.5 my-4 bg-[#F8F9F7] border border-black/[0.05] group-hover:border-chalk-teal/15 transition-colors">
        <div className="flex items-center justify-between text-[11px] font-bold text-ink-green/70 mb-2 font-body">
          <span>Configuration Status</span>
          <span className="text-emerald-600 font-bold">100% Ready</span>
        </div>
        <div className="w-full h-2 rounded-full bg-black/5 overflow-hidden mb-2">
          <div className="w-full h-full bg-gradient-to-r from-chalk-teal to-brass-gold rounded-full" />
        </div>
        <p className="text-[10px] text-ink-green/60 font-body flex items-center gap-1.5">
          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
          Batches, Subjects & Fees Configured
        </p>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="w-full rounded-xl p-3.5 my-4 bg-[#F8F9F7] border border-black/[0.05] group-hover:border-chalk-teal/15 transition-colors">
        <div className="flex items-center justify-between text-[11px] font-bold text-ink-green/70 mb-2 font-body">
          <span>Excel Roster Migration</span>
          <span className="text-chalk-teal font-bold">1-Click Sync</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-1 rounded-md bg-chalk-teal/10 text-chalk-teal text-xs font-semibold border border-chalk-teal/15">
            +150 Students
          </span>
          <span className="px-2.5 py-1 rounded-md bg-brass-gold/10 text-brass-gold text-xs font-semibold border border-brass-gold/20">
            4 Teachers
          </span>
        </div>
        <p className="text-[10px] text-ink-green/60 font-body flex items-center gap-1.5">
          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
          Roll numbers & WhatsApp contacts linked
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl p-3.5 my-4 bg-[#F8F9F7] border border-black/[0.05] group-hover:border-chalk-teal/15 transition-colors">
      <div className="flex items-center justify-between text-[11px] font-bold text-ink-green/70 mb-2 font-body">
        <span>Live Coaching Pulse</span>
        <span className="text-emerald-600 font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Active
        </span>
      </div>
      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-black/[0.06] mb-2 shadow-xs">
        <span className="text-xs font-bold text-ink-green">₹45,000 Fees</span>
        <span className="text-[11px] font-semibold text-chalk-teal">96% Attendance</span>
      </div>
      <p className="text-[10px] text-brass-gold font-body font-semibold">
        Direct to bank account • 0% Commission
      </p>
    </div>
  );
}

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-white border-t border-black/[0.06] py-16 md:py-24 scroll-mt-20">
      <div className="container-main">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12 md:mb-16"
        >
          <span className="badge-teal inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold tracking-wide">Simple. Fast. Reliable.</span>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-display font-extrabold text-ink-green tracking-tight leading-tight mt-3">
            How CampusWeb{" "}
            <span className="text-gradient-gold">Works</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-ink-green/75 font-body leading-relaxed max-w-md mx-auto">
            Get your entire institute up, running, and active in 4 simple steps.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
          {HOW_IT_WORKS_STEPS.map((step, i) => {
            const StepIcon = stepIcons[i];
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.07, ease: "easeOut" }}
                className="group relative bg-white rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-xl border border-black/[0.07] hover:border-chalk-teal/30 transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1"
              >
                {/* Top Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-chalk-teal via-chalk-teal to-brass-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

                {/* Top Row: Step Tag + Mini Icon */}
                <div className="flex items-center justify-between mb-2">
                  <span className="px-3 py-1 rounded-full bg-ink-green text-white font-display font-bold text-xs tracking-wider uppercase shadow-xs">
                    Step 0{step.step}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-chalk-teal/10 border border-chalk-teal/15 text-chalk-teal flex items-center justify-center group-hover:bg-chalk-teal group-hover:text-white transition-colors duration-300">
                    <StepIcon className="w-4 h-4" />
                  </div>
                </div>

                {/* Branded Mini UI Preview (Replaces hollow empty box) */}
                <StepMiniPreview step={step.step} />

                {/* Content */}
                <h3 className="text-lg font-display font-bold text-ink-green tracking-tight group-hover:text-chalk-teal transition-colors duration-300 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-ink-green/70 font-body leading-relaxed mb-4">
                  {step.description}
                </p>

                {/* Subtext */}
                <div className="mt-auto pt-4 border-t border-black/[0.06] flex items-center gap-2 text-xs font-semibold text-brass-gold font-body">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{step.subtext}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Action Prompt */}
        <div className="text-center mt-10 pt-8 border-t border-black/[0.06]">
          <p className="text-sm sm:text-base text-ink-green/75 font-body mb-4">
            Ready to see how CampusWeb works for your coaching batches?
          </p>
          <Button variant="primary" size="lg" href="/demo" withArrow>
            Book Your Free 1-on-1 Demo
          </Button>
        </div>
      </div>
    </section>
  );
}

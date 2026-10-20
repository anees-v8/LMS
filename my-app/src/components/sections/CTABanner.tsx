"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Phone } from "lucide-react";
import Button from "@/components/ui/Button";

interface CTABannerProps {
  title?: string;
  subtitle?: string;
  variant?: "dark" | "teal";
}

export default function CTABanner({
  title = "Ready to Modernize Your Institute?",
  subtitle = "Start your 7-day full access trial and see how easy managing your coaching batches, attendance, and fees can be.",
}: CTABannerProps) {
  return (
    <section className="bg-white border-t border-black/[0.06] py-16 md:py-24">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl p-8 sm:p-12 md:p-14 bg-gradient-to-br from-ink-green via-[#23352C] to-chalk-teal text-white shadow-2xl overflow-hidden"
        >
          {/* Subtle Glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-chalk-teal/30 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex items-start sm:items-center gap-5">
              {/* Logo */}
              <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-white items-center justify-center flex-shrink-0 overflow-hidden shadow-lg">
                <Image src="/main-logo.png" alt="Campus Logo" width={48} height={48} className="object-contain" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight leading-tight mb-3">
                  {title}
                </h3>
                <p className="text-base sm:text-lg text-white/80 font-body leading-relaxed max-w-xl">
                  {subtitle}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-white/70">
                  <span className="flex items-center gap-1.5">
                    <span className="text-emerald-400">✓</span> 7-Day Free Trial
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-emerald-400">✓</span> 24h Guided Setup
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-emerald-400">✓</span> No Credit Card Needed
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto shrink-0">
              <Button variant="primary" size="lg" href="/demo" withArrow className="w-full sm:w-auto">
                Book a Free Demo
              </Button>
              <Button
                variant="secondary"
                size="lg"
                href="/contact"
                className="w-full sm:w-auto bg-white text-ink-green border-white hover:bg-paper hover:text-ink-green font-semibold"
              >
                <Phone className="w-4 h-4 text-brass-gold" />
                Contact Our Team
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

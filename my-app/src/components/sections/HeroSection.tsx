"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Layers, MessageSquare, CheckCircle2, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import TrustBadge from "@/components/ui/TrustBadge";
import { TRUST_BADGES } from "@/utils/constants";

export default function HeroSection() {
  return (
    <section className="relative bg-white flex flex-col justify-between overflow-hidden">
      <div className="container-main flex-grow py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
          >
            {/* Badge */}
            <div className="mb-5">
              <span className="badge-gold inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-brass-gold animate-pulse" />
                Coaching Institute Operating Platform
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-display font-extrabold text-ink-green tracking-tight leading-[1.1] mb-5">
              Built for Coaching.
              <br />
              <span className="text-gradient-gold">Crafted for Speed & Scale.</span>
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-lg text-ink-green/75 font-body leading-relaxed mb-8 max-w-xl">
              Automate dynamic QR attendance, collect fees with instant WhatsApp receipts, and schedule online tests. Zero paperwork, zero commission.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" size="lg" href="/demo" withArrow>
                Book a Free Demo
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  const el = document.getElementById("workflows");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <Layers className="w-4 h-4 text-chalk-teal" />
                Explore Platform
              </Button>
            </div>
          </motion.div>

          {/* Right — Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            {/* Decorative Green Blob */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-[35%] -translate-y-[45%] w-[100%] h-[110%] bg-chalk-teal z-0"
              style={{ borderRadius: "43% 57% 65% 35% / 55% 45% 55% 45%" }}
            />

            {/* Floating Live Badge 1 */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="hidden sm:flex items-center gap-2.5 absolute -top-4 -left-4 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-xl border border-black/5 z-20"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-ink-green">Fee Receipt Sent</div>
                <div className="text-[10px] text-emerald-700 font-medium">Delivered on WhatsApp • ₹2,500</div>
              </div>
            </motion.div>

            {/* Floating Live Badge 2 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="hidden sm:flex items-center gap-2.5 absolute -bottom-3 -right-3 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-xl border border-black/5 z-20"
            >
              <div className="w-8 h-8 rounded-lg bg-brass-gold/15 flex items-center justify-center text-brass-gold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-ink-green">QR Attendance Active</div>
                <div className="text-[10px] text-ink-green/70 font-medium">Batch JEE-A (96% Present)</div>
              </div>
            </motion.div>

            {/* Dashboard Image */}
            <div className="relative z-10 w-full flex items-center justify-center max-w-[500px] lg:max-w-none mx-auto lg:scale-[1.05] lg:-translate-x-1">
              <Image
                src="/home.png"
                alt="Campus Dashboard Preview"
                width={1200}
                height={800}
                className="w-full h-auto object-contain drop-shadow-2xl rounded-lg"
                priority
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Trust Bar */}
      <div className="border-t border-black/[0.06] bg-[#F8F9F7] relative z-10">
        <div className="container-main py-6 md:py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TRUST_BADGES.map((badge) => (
              <TrustBadge
                key={badge.title}
                icon={badge.icon}
                title={badge.title}
                subtitle={badge.subtitle}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

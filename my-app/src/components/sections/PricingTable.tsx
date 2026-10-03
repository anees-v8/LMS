"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Star, Building2, Loader2 } from "lucide-react";
import { PRICING_BADGES } from "@/utils/constants";
import { cn } from "@/utils/cn";
import Button from "@/components/ui/Button";

const planIcons = [Building2, Star, Building2];

// Utility to format raw backend feature keys into readable text
const formatFeatureName = (key: string) => {
  const customMappings: Record<string, string> = {
    student_management: "Student Management",
    batch_management: "Batch Management",
    digital_attendance: "Digital Attendance",
    fee_management: "Fee Management",
    video_library: "Video Library",
    whatsapp_reminders: "WhatsApp Reminders",
    live_classes: "Live Classes (Google Meet)",
    performance_reports: "Performance Reports",
    online_tests: "Online Tests",
    doubt_solving: "Doubt Solving",
    custom_branding: "Custom Branding",
    teacher_accounts: "Teacher Accounts",
  };

  if (customMappings[key]) return customMappings[key];

  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

interface BackendPlan {
  id: number;
  name: string;
  tagline: string | null;
  priceMonthly: number;
  priceQuarterly: number;
  priceYearly: number;
  features: string[];
}

type Cycle = "monthly" | "quarterly" | "yearly";

const CYCLE_LABELS: Record<Cycle, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

function priceForCycle(plan: BackendPlan, cycle: Cycle): number {
  switch (cycle) {
    case "monthly":
      return plan.priceMonthly;
    case "quarterly":
      return plan.priceQuarterly;
    case "yearly":
      return plan.priceYearly;
  }
}

export default function PricingTable() {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [backendPlans, setBackendPlans] = useState<BackendPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        // Same-origin: the marketing site and API are the same Next.js
        // deployment now, so no base URL/host/port is needed.
        const res = await fetch("/api/public/plans");
        if (res.ok) {
          const data = await res.json();
          setBackendPlans(data);
        }
      } catch (error) {
        console.error("Error fetching pricing plans:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  return (
    <section className="bg-white pt-4 pb-12 md:pt-6 md:pb-16">
      <div className="container-main">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 md:mb-10"
        >
          <span className="badge-teal mb-4 inline-block">
            Simple. Transparent. Affordable.
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-ink-green mt-3">
            Pricing Plans That{" "}
            <span className="text-gradient-gold">Grow with You.</span>
          </h2>
          <p className="mt-4 text-ink-green/60 font-body text-base max-w-lg mx-auto">
            Choose the perfect plan for your institute and start your 7-day free
            trial.
          </p>
        </motion.div>

        {/* Cycle Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center mb-10 md:mb-12"
        >
          <div className="relative flex flex-wrap items-center justify-center p-1.5 bg-[#f4f6f3] rounded-full border border-[#eaeeec] shadow-sm gap-1">
            {(Object.keys(CYCLE_LABELS) as Cycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={cn(
                  "relative z-10 flex items-center justify-center px-5 sm:px-6 py-2.5 text-sm sm:text-base font-semibold rounded-full transition-colors duration-300",
                  cycle === c
                    ? "text-white"
                    : "text-ink-green hover:text-ink-green/80"
                )}
              >
                {cycle === c && (
                  <motion.div
                    layoutId="pricing-cycle-tab"
                    className="absolute inset-0 bg-ink-green rounded-full shadow-md"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-20">{CYCLE_LABELS[c]}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Pricing Cards Grid */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 mb-10">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center items-center py-20 col-span-1 md:col-span-3"
              >
                <Loader2 className="w-10 h-10 animate-spin text-ink-green opacity-50" />
              </motion.div>
            ) : backendPlans.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-10 col-span-1 md:col-span-3 text-ink-green/60 font-body text-lg"
              >
                No pricing plans available at the moment.
              </motion.div>
            ) : (
              <motion.div
                key={`plans-${cycle}`}
                className="contents"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {backendPlans.map((plan, i) => {
                  const isPopular = plan.name.toLowerCase() === "pro";
                  const Icon = planIcons[i % planIcons.length];
                  const price = priceForCycle(plan, cycle);
                  const priceSuffix = "/ student / month";

                  return (
                    <motion.div
                      key={`${cycle}-${plan.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4, delay: i * 0.08 }}
                      className={cn(
                        "relative rounded-2xl p-6 border-2 flex flex-col h-full",
                        isPopular
                          ? "border-ink-green bg-ink-green text-white shadow-xl scale-[1.02] z-10"
                          : "border-paper bg-card-surface hover:border-chalk-teal/30 shadow-card transition-[box-shadow,border-color] duration-300"
                      )}
                    >
                      {isPopular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <span className="bg-brass-gold text-white text-xs font-body font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                            Most Popular
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            isPopular ? "bg-white/10" : "bg-chalk-teal/10"
                          )}
                        >
                          <Icon
                            className={cn(
                              "w-5 h-5",
                              isPopular ? "text-brass-gold" : "text-chalk-teal"
                            )}
                          />
                        </div>
                        <div>
                          <h3
                            className={cn(
                              "text-xl font-display font-bold",
                              isPopular ? "text-white" : "text-ink-green"
                            )}
                          >
                            {plan.name}
                          </h3>
                          <p
                            className={cn(
                              "text-xs font-body leading-tight mt-1 line-clamp-2",
                              isPopular ? "text-white/60" : "text-ink-green/50"
                            )}
                          >
                            {plan.tagline}
                          </p>
                        </div>
                      </div>

                      <div className="mb-6 flex-shrink-0">
                        <div className="flex items-baseline gap-1">
                          <span
                            className={cn(
                              "text-4xl font-display font-bold",
                              isPopular ? "text-white" : "text-ink-green"
                            )}
                          >
                            ₹{price}
                          </span>
                          <span
                            className={cn(
                              "text-sm font-body font-medium",
                              isPopular ? "text-white/50" : "text-ink-green/40"
                            )}
                          >
                            {priceSuffix}
                          </span>
                        </div>
                        <p
                          className={cn(
                            "text-xs font-body mt-1 font-medium",
                            isPopular ? "text-white/40" : "text-ink-green/40"
                          )}
                        >
                          {`Billed ${cycle}`}
                        </p>
                      </div>

                      <ul className="space-y-2 mb-4 flex-grow">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2.5">
                            <Check
                              className={cn(
                                "w-4 h-4 mt-0.5 flex-shrink-0",
                                isPopular
                                  ? "text-brass-gold"
                                  : "text-chalk-teal"
                              )}
                            />
                            <span
                              className={cn(
                                "text-sm font-body leading-tight",
                                isPopular
                                  ? "text-white/80"
                                  : "text-ink-green/70"
                              )}
                            >
                              {formatFeatureName(feature)}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-auto pt-3 border-t border-dashed border-black/5 dark:border-white/10">
                        <Button
                          variant={isPopular ? "primary" : "secondary"}
                          size="lg"
                          className="w-full"
                          withArrow={isPopular}
                        >
                          Start 7-Day Free Trial
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Guarantee Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-6 md:gap-10"
        >
          {PRICING_BADGES.map((badge) => (
            <div key={badge} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-chalk-teal" />
              <span className="text-sm font-body font-medium text-ink-green/60">
                {badge}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

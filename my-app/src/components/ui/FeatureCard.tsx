"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  badge?: string;
  badgeColor?: "teal" | "gold";
  description: string;
  highlights?: string[];
  href?: string;
  index?: number;
  className?: string;
}

export default function FeatureCard({
  icon: Icon,
  title,
  badge,
  badgeColor = "teal",
  description,
  highlights,
  href,
  index = 0,
  className,
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: "easeOut" }}
      className={cn(
        "group relative bg-white rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-xl transition-all duration-300 border border-black/[0.07] hover:border-chalk-teal/30 flex flex-col h-full overflow-hidden hover:-translate-y-1",
        className
      )}
    >
      {/* Top Accent Gradient Line on Hover */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-chalk-teal via-chalk-teal to-brass-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

      {/* Top Row: Icon + Badge */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-chalk-teal/10 border border-chalk-teal/15 text-chalk-teal flex items-center justify-center group-hover:scale-105 group-hover:bg-chalk-teal group-hover:text-white transition-all duration-300 shadow-xs">
          <Icon className="w-5 h-5" />
        </div>
        {badge && (
          <span
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide font-body border",
              badgeColor === "gold"
                ? "bg-brass-gold/10 text-brass-gold border-brass-gold/30"
                : "bg-chalk-teal/10 text-chalk-teal border-chalk-teal/20"
            )}
          >
            {badge}
          </span>
        )}
      </div>

      <h3 className="text-lg font-display font-bold text-ink-green tracking-tight group-hover:text-chalk-teal transition-colors mb-2">
        {title}
      </h3>
      <p className={cn("text-sm text-ink-green/70 font-body leading-relaxed", highlights ? "mb-4" : "")}>
        {description}
      </p>

      {/* Crisp Branded Checklist (No Dull Grey) */}
      {highlights && (
        <div className="mt-auto bg-[#F8F9F7] group-hover:bg-[#F2F5F3] rounded-xl p-3.5 border border-black/[0.05] group-hover:border-chalk-teal/15 transition-colors">
          <ul className="space-y-2">
            {highlights.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-xs sm:text-[13px] text-ink-green/85 font-body font-medium">
                <Check className="w-3.5 h-3.5 text-chalk-teal flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {href && (
        <a href={href} className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-brass-gold hover:text-brass-gold/80 transition-colors mt-3 pt-2">
          <span>Learn more</span>
          <span className="text-base leading-none">&rarr;</span>
        </a>
      )}
    </motion.div>
  );
}

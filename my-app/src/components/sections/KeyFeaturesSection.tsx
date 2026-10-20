"use client";

import React from "react";
import { motion } from "framer-motion";
import FeatureCard from "@/components/ui/FeatureCard";
import { KEY_FEATURES } from "@/utils/constants";

export default function KeyFeaturesSection() {
  return (
    <section className="bg-white border-t border-black/[0.06] py-16 md:py-24">
      <div className="container-main">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12 md:mb-16"
        >
          <span className="badge-teal inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold tracking-wide">
            Platform Capabilities
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-display font-extrabold text-ink-green tracking-tight leading-tight mt-3">
            Everything You Need to Run Your Institute
          </h2>
          <p className="mt-4 text-base sm:text-lg text-ink-green/75 font-body leading-relaxed max-w-2xl mx-auto">
            A complete suite of tools engineered specifically for Indian coaching institutes, academies, and tuition centers.
          </p>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {KEY_FEATURES.map((feature, i) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              badge={feature.badge}
              badgeColor={feature.badgeColor}
              description={feature.description}
              highlights={feature.highlights}
              href={feature.href}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

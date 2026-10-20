"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { FAQS } from "@/utils/constants";
import { cn } from "@/utils/cn";

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-16 md:py-24 bg-paper border-t border-black/[0.06]">
      <div className="container-main max-w-4xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12 md:mb-16"
        >
          <span className="badge-gold inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold tracking-wide">
            Got Questions?
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-display font-extrabold text-ink-green tracking-tight leading-tight mt-3">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-base sm:text-lg text-ink-green/75 font-body leading-relaxed max-w-md mx-auto">
            Everything you need to know about setting up and running your coaching institute on CampusWeb.
          </p>
        </motion.div>

        {/* FAQ Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Left Column */}
          <div className="flex flex-col gap-4">
            {FAQS.map((faq, i) => i % 2 === 0 && (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-black/[0.06] shadow-sm hover:border-chalk-teal/30 transition-all overflow-hidden h-fit"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-6 py-5 text-left"
                >
                  <span className="text-sm sm:text-[15px] font-display font-bold text-ink-green tracking-tight leading-snug">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-ink-green/40 flex-shrink-0 transition-transform duration-300",
                      openIndex === i && "rotate-180"
                    )}
                  />
                </button>
                <AnimatePresence>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5 pt-2 border-t border-black/[0.04]">
                        <p className="text-sm text-ink-green/75 font-body leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-4">
            {FAQS.map((faq, i) => i % 2 !== 0 && (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-black/[0.06] shadow-sm hover:border-chalk-teal/30 transition-all overflow-hidden h-fit"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-6 py-5 text-left"
                >
                  <span className="text-sm sm:text-[15px] font-display font-bold text-ink-green tracking-tight leading-snug">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-ink-green/40 flex-shrink-0 transition-transform duration-300",
                      openIndex === i && "rotate-180"
                    )}
                  />
                </button>
                <AnimatePresence>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5 pt-2 border-t border-black/[0.04]">
                        <p className="text-sm text-ink-green/75 font-body leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
